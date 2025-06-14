import { EventEmitter } from 'eventemitter3';
import { Message, AutoCommandEvent, StreamContent, ResultContent, AskUserContent, UserResponseContent, ErrorContent, CompletionContent, ResultTokenStatContent, ResultCommandPrepareStatContent, ResultCommandExecuteStatContent, ResultContextUsedContent, CodeContent, MarkdownContent, ResultSummaryContent, IndexBuildStartContent, IndexBuildEndContent } from '../components/AutoMode/types';
import eventBus, { EVENTS } from './eventBus';
import { v4 as uuidv4 } from 'uuid';


export class AgenticEditService extends EventEmitter {
  private eventSource: EventSource | null = null;
  private streamEvents: Map<string, Message> = new Map();
  private lastEventType: string | null = null;
  private messageId = 0;
  private currentStreamMessageId: string | null = null;
  private isStreamingActive: boolean = false;
  private panelId?: string;
  private isConnectionActive: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private maxReconnectAttempts: number = 5;
  private currentReconnectAttempts: number = 0;
  private reconnectDelay: number = 3000; // 3秒重连延迟

  constructor(panelId?: string) {
    super();
    this.panelId = panelId;
  }

  private eventFileId: string | null = null;

  async executeCommand(command: string, includeConversationHistory: boolean = false): Promise<{ event_file_id: string }> {
    try {
      const response = await fetch('/api/auto-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          command, 
          include_conversation_history: includeConversationHistory,
          panel_id: this.panelId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.eventFileId = data.event_file_id;

      // Start listening for events after we have the event_file_id
      this.startEventStream();

      return { event_file_id: data.event_file_id };

    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  }

  private startEventStream() {
    // Close existing connection if any
    this.closeEventStream();

    if (!this.eventFileId) {
      console.error('无事件文件ID可用');
      return;
    }

    // 设置连接状态为活跃
    this.isConnectionActive = true;
    this.currentReconnectAttempts = 0;
    
    const connect = () => {
      // 如果已经不需要连接了，不执行重连
      if (!this.isConnectionActive) {
        console.log('不再需要SSE连接，取消重连');
        return;
      }

      console.log(`尝试建立SSE连接: ${this.eventFileId} (尝试次数: ${this.currentReconnectAttempts})`);
      
      // 创建新的EventSource连接
      this.eventSource = new EventSource(`/api/auto-command/events?event_file_id=${this.eventFileId}`);

      this.eventSource.onmessage = (event) => {
        try {
          const eventData: AutoCommandEvent = JSON.parse(event.data);        
          this.handleEvent(eventData);
        } catch (error) {
          console.error('解析事件数据错误:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.warn('EventSource连接错误:', error);
        
        // 关闭当前连接
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        
        // 重置流相关状态，但保留eventFileId
        this.streamEvents.clear();
        this.lastEventType = null;
        this.currentStreamMessageId = null;
        this.isStreamingActive = false;
        
        // 如果连接仍应该活跃，尝试重连
        if (this.isConnectionActive) {
          this.currentReconnectAttempts++;
          
          if (this.currentReconnectAttempts <= this.maxReconnectAttempts) {
            console.log(`SSE连接错误，${this.reconnectDelay/1000}秒后重试 (尝试 ${this.currentReconnectAttempts}/${this.maxReconnectAttempts})`);
            
            // 清除任何现有的重连定时器
            if (this.reconnectTimeout) {
              clearTimeout(this.reconnectTimeout);
            }
            
            // 设置新的重连定时器
            this.reconnectTimeout = setTimeout(connect, this.reconnectDelay);
          } else {
            console.error(`SSE连接重试次数超过最大限制(${this.maxReconnectAttempts})，停止重试`);
            this.isConnectionActive = false;
            this.emit('error', '连接服务器失败，请刷新页面或重试');
          }
        }
      };
    };

    // 初始连接
    connect();
  }

  private handleEvent(event: AutoCommandEvent) {
    // Generate message ID based on event type and sequence
    let messageId: string;
    const uuid = uuidv4();
    const timestamp = Date.now();

    if (event.event_type === 'STREAM') {
      if (this.lastEventType !== 'STREAM') {
        // First STREAM in a sequence - create new message ID
        messageId = `agentic-${uuid}-${timestamp}-${this.messageId++}`;
        this.currentStreamMessageId = messageId;
      } else {
        // Consecutive STREAM event - use the current stream message ID
        messageId = this.currentStreamMessageId || `agentic-${uuid}-${timestamp}-${this.messageId++}`;
      }
    } else {
      // Non-STREAM event - always create a new message ID
      messageId = `agentic-${uuid}-${timestamp}-${this.messageId++}`;

      // If previous event was a STREAM, finalize any pending stream messages
      if (this.lastEventType === 'STREAM' && this.currentStreamMessageId) {
        this.finalizeStreamMessage(this.currentStreamMessageId);
      }

      // Reset the current stream message ID since we're no longer in a STREAM sequence
      this.currentStreamMessageId = null;
    }

    switch (event.event_type) {
      case 'STREAM':
        this.handleStreamEvent(event, messageId);
        break;
      case 'RESULT':
        this.handleResultEvent(event, messageId);
        break;
      case 'ASK_USER':
        this.handleAskUserEvent(event, messageId);
        break;
      case 'USER_RESPONSE':
        this.handleUserResponseEvent(event, messageId);
        break;
      case 'ERROR':
        this.handleErrorEvent(event, messageId);
        break;
      case 'COMPLETION':
        this.handleCompletionEvent(event, messageId);
        break;
      default:
        console.warn('Unknown event type:', event.event_type);
    }

    this.lastEventType = event.event_type;
  }

  private handleStreamEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as StreamContent;
    this.isStreamingActive = true;

    // Check if we have an existing stream message with this ID
    let existingMessage = this.streamEvents.get(messageId);

    if (existingMessage) {
      // Update existing message
      const newMessage = { ...existingMessage };
      newMessage.content += content.content;
      newMessage.isThinking = content.is_thinking;
      newMessage.isStreaming = true;

      // If the state is complete, remove from streamEvents and emit the final message
      if (content.state === 'complete') {
        newMessage.isStreaming = false;
        this.streamEvents.delete(messageId);
        this.emit('message', newMessage);
        this.isStreamingActive = false;
      } else {
        // Otherwise, update the map and emit the updated message
        this.streamEvents.set(messageId, newMessage);
        this.emit('message', newMessage);
      }
    } else {
      // Create a new message
      const message: Message = {
        id: messageId,
        type: event.event_type,
        content: content.content,
        contentType: content.content_type,
        isThinking: content.is_thinking,
        isStreaming: true,
        eventId: event.event_id,
        language: (content as CodeContent).language, // Will be undefined if not CodeContent
        metadata: event.metadata
      };

      // If not complete, add to streamEvents
      if (content.state !== 'complete') {
        this.streamEvents.set(messageId, message);
      } else {
        message.isStreaming = false;
        this.isStreamingActive = false;
      }

      this.emit('message', message);
    }
  }

  private handleResultEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as ResultContent;

    let messageContent: string;
    let contentType = content.content_type;
    let metadata = { ...content.metadata, ...event.metadata };

    // Determine the type of content and format accordingly
    if (typeof content.content === 'string') {
      messageContent = content.content;
    } else if (this.isTokenStatContent(content.content)) {
      // Handle ResultTokenStatContent
      contentType = 'token_stat';
      messageContent = JSON.stringify(content.content);
      // Add the token stat data to metadata for display
      metadata = {
        ...metadata,
        model_name: content.content.model_name,
        elapsed_time: content.content.elapsed_time,
        first_token_time: content.content.first_token_time,
        input_tokens: content.content.input_tokens,
        output_tokens: content.content.output_tokens,
        input_cost: content.content.input_cost,
        output_cost: content.content.output_cost,
        speed: content.content.speed
      };
    } else if (this.isSummaryContent(content.content)) {
      // Handle ResultSummaryContent
      contentType = 'summary';
      messageContent = content.content.summary;
    } else if (this.isIndexBuildStartContent(content.content)) {
      // Handle IndexBuildStartContent
      contentType = 'index_build_start';
      messageContent = `Processing files: ${content.content.file_number}/${content.content.total_files}`;
      metadata = {
        ...metadata,
        file_number: content.content.file_number,
        total_files: content.content.total_files
      };
    } else if (this.isIndexBuildEndContent(content.content)) {
      // Handle IndexBuildEndContent
      contentType = 'index_build_end';
      messageContent = `Index build completed: Updated ${content.content.updated_files} files, Removed ${content.content.removed_files} files`;
      metadata = {
        ...metadata,
        updated_files: content.content.updated_files,
        removed_files: content.content.removed_files,
        input_tokens: content.content.input_tokens,
        output_tokens: content.content.output_tokens,
        input_cost: content.content.input_cost,
        output_cost: content.content.output_cost
      };
    } else if (this.isCommandPrepareStatContent(content.content)) {
      // Handle ResultCommandPrepareStatContent
      contentType = 'command_prepare_stat';
      messageContent = `Command: ${content.content.command}`;
      metadata = {
        ...metadata,
        command: content.content.command,
        parameters: content.content.parameters
      };
    } else if (this.isCommandExecuteStatContent(content.content)) {
      // Handle ResultCommandExecuteStatContent
      contentType = 'command_execute_stat';
      messageContent = content.content.content;
      metadata = {
        ...metadata,
        command: content.content.command
      };
    } else if (this.isContextUsedContent(content.content)) {
      // Handle ResultContextUsedContent
      contentType = 'context_used';
      messageContent = content.content.description;
      metadata = {
        ...metadata,
        files: content.content.files,        
      };
    } else {
      // Default for any other object type
      messageContent = JSON.stringify(content.content);
    }

    const message: Message = {
      id: messageId,
      type: event.event_type,
      content: messageContent,
      contentType: contentType,
      metadata: metadata,
      eventId: event.event_id,
    };

    this.emit('message', message);
  }

  // Type guard for ResultTokenStatContent
  private isTokenStatContent(content: any): content is ResultTokenStatContent {
    return content &&
      typeof content.model_name === 'string' &&
      typeof content.elapsed_time === 'number' &&
      typeof content.input_tokens === 'number' &&
      typeof content.output_tokens === 'number';
  }

  // Type guard for ResultCommandPrepareStatContent
  private isCommandPrepareStatContent(content: any): content is ResultCommandPrepareStatContent {
    return content &&
      typeof content.command === 'string' &&
      typeof content.parameters === 'object';
  }

  // Type guard for ResultSummaryContent
  private isSummaryContent(content: any): content is ResultSummaryContent {
    return content &&
      typeof content.summary === 'string';
  }

  // Type guard for ResultCommandExecuteStatContent
  private isCommandExecuteStatContent(content: any): content is ResultCommandExecuteStatContent {
    return content &&
      typeof content.command === 'string' &&
      typeof content.content === 'string';
  }

  // Type guard for IndexBuildStartContent
  private isIndexBuildStartContent(content: any): content is IndexBuildStartContent {
    return content &&
      typeof content.file_number === 'number' &&
      typeof content.total_files === 'number';
  }

  // Type guard for IndexBuildEndContent
  private isIndexBuildEndContent(content: any): content is IndexBuildEndContent {
    return content &&
      typeof content.updated_files === 'number' &&
      typeof content.removed_files === 'number' &&
      typeof content.input_tokens === 'number' &&
      typeof content.output_tokens === 'number';
  }

  private isContextUsedContent(content: any): content is ResultContextUsedContent {
    return content &&
      Array.isArray(content.files) &&
      typeof content.title === 'string' &&
      typeof content.description === 'string';
  }

  private handleAskUserEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as AskUserContent;

    const message: Message = {
      id: messageId,
      type: event.event_type,
      content: content.prompt,
      options: content.options,
      responseRequired: content.required,
      eventId: event.event_id,
    };

    this.emit('message', message);
  }

  private handleUserResponseEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as UserResponseContent;

    const message: Message = {
      id: messageId,
      type: event.event_type,
      content: content.response,
      isUser: true,
      eventId: event.event_id,
      responseTo: event.response_to,
    };

    this.emit('message', message);
  }

  private handleErrorEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as ErrorContent;

    const message: Message = {
      id: messageId,
      type: event.event_type,
      content: content.error_message,
      metadata: content.details,
      eventId: event.event_id,
    };

    this.emit('message', message);

    // 添加延迟，确保消息状态已更新后再触发任务完成事件
    setTimeout(() => {
      // 发出错误任务完成事件
      this.emit('taskComplete', true);
      eventBus.publish(EVENTS.CODING.TASK_COMPLETE, { success: true, event_file_id: this.eventFileId });
    }, 300); // 300毫秒延迟，足够React状态更新
  }

  private handleCompletionEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as CompletionContent;

    const message: Message = {
      id: messageId,
      type: event.event_type,
      content: content.success_message,
      eventId: event.event_id,
      metadata: {
        success_code: content.success_code,
        completion_time: content.completion_time,
        details: content.details,
        result: content.result
      }
    };

    this.emit('message', message);

    // 添加延迟，确保消息状态已更新后再触发任务完成事件
    setTimeout(() => {
      // 发出任务完成事件
      this.emit('taskComplete', false);
      eventBus.publish(EVENTS.CODING.TASK_COMPLETE, { success: true, event_file_id: this.eventFileId });
    }, 1000); // 1000毫秒延迟，足够React状态更新
  }

  // Helper method to finalize a stream message
  private finalizeStreamMessage(messageId: string) {
    const message = this.streamEvents.get(messageId);
    if (message) {
      message.isStreaming = false;
      message.isThinking = false;
      this.streamEvents.delete(messageId);
      this.emit('message', message);
    }
  }

  closeEventStream() {
    // 标记连接状态为非活跃
    this.isConnectionActive = false;
    
    // 清除重连定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.eventSource) {
      console.log('关闭SSE事件流');
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 清理流消息和状态
    Array.from(this.streamEvents.keys()).forEach(messageId => {
      this.finalizeStreamMessage(messageId);
    });
    this.streamEvents.clear();
    this.lastEventType = null;
    this.currentStreamMessageId = null;
    this.isStreamingActive = false;
    // 不要在这里重置eventFileId，它可能在用户响应中需要
  }

  async sendUserResponse(eventId: string, response: string): Promise<void> {
    if (!this.eventFileId) {
      throw new Error('No event file ID available');
    }

    try {
      const apiResponse = await fetch('/api/auto-command/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          event_file_id: this.eventFileId,
          response
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`HTTP error! status: ${apiResponse.status}`);
      }

    } catch (error) {
      console.error('Error sending user response:', error);
      throw error;
    }
  }

  async cancelTask(): Promise<void> {
    if (!this.eventFileId) {
      console.warn('No event file ID available to cancel task.');
      return;
    }

    console.log(`AgenticEditService: Cancelling task with event_file_id: ${this.eventFileId}`);

    try {
      const response = await fetch('/api/auto-command/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_file_id: this.eventFileId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`AgenticEditService: Task cancellation request sent for event_file_id: ${this.eventFileId}`);
      // Close the event stream after sending the cancel request
      this.closeEventStream();

    } catch (error) {
      console.error('Error cancelling agentic edit task:', error);
      // Optionally re-throw or handle the error appropriately
      // Don't close the stream here if the request failed, maybe retry?
      // For now, we log the error and proceed.
    }
  }
}

// Export a singleton instance
export const agenticEditService = new AgenticEditService();
