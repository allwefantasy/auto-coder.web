import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import eventBus, { EVENTS } from './eventBus';
import { 
  Message as AutoModeMessage, 
  AutoCommandEvent, 
  StreamContent, 
  ResultContent, 
  AskUserContent, 
  UserResponseContent, 
  ErrorContent, 
  CompletionContent, 
  ResultTokenStatContent, 
  ResultCommandPrepareStatContent, 
  ResultCommandExecuteStatContent, 
  ResultContextUsedContent, 
  CodeContent, 
  MarkdownContent, 
  ResultSummaryContent,
  IndexBuildStartContent,
  IndexBuildEndContent 
} from '../components/AutoMode/types';

export class CodingService extends EventEmitter {
  private eventSource: EventSource | null = null;
  private streamEvents: Map<string, AutoModeMessage> = new Map();
  private lastEventType: string | null = null;
  private messageId = 0;
  private currentStreamMessageId: string | null = null;
  private isStreamingActive: boolean = false;

  constructor() {
    super();
  }

  private eventFileId: string | null = null;

  async executeCommand(command: string): Promise<{ event_file_id: string }> {
    try {
      const response = await fetch('/api/coding-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
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
      console.error('Error executing coding command:', error);
      throw error;
    }
  }

  private startEventStream() {
    // Close existing connection if any
    this.closeEventStream();

    if (!this.eventFileId) {
      console.error('No event file ID available');
      return;
    }

    this.eventSource = new EventSource(`/api/coding-command/events?event_file_id=${this.eventFileId}`);

    this.eventSource.onmessage = (event) => {
      try {
        const eventData: AutoCommandEvent = JSON.parse(event.data);        
        this.handleEvent(eventData);
      } catch (error) {
        console.error('Error parsing event data:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      this.closeEventStream();
    };
  }

  private handleEvent(event: AutoCommandEvent) {
    // Generate message ID based on event type and sequence
    let messageId: string;
    const timestamp = Date.now();
    const uuid = uuidv4();

    if (event.event_type === 'STREAM') {
      if (this.lastEventType !== 'STREAM') {
        // First STREAM in a sequence - create new message ID
        messageId = `coding-${uuid}-${timestamp}-${this.messageId++}`;
        this.currentStreamMessageId = messageId;
      } else {
        // Consecutive STREAM event - use the current stream message ID
        messageId = this.currentStreamMessageId || `coding-${uuid}-${timestamp}-${this.messageId++}`;
      }
    } else {
      // Non-STREAM event - always create a new message ID
      messageId = `coding-${uuid}-${timestamp}-${this.messageId++}`;

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
      existingMessage.content += content.content;
      existingMessage.isThinking = content.is_thinking;
      existingMessage.isStreaming = true;

      // If the state is complete, remove from streamEvents and emit the final message
      if (content.state === 'complete') {
        existingMessage.isStreaming = false;
        this.streamEvents.delete(messageId);
        this.emit('message', existingMessage);
        this.isStreamingActive = false;
      } else {
        // Otherwise, update the map and emit the updated message
        this.streamEvents.set(messageId, existingMessage);
        this.emit('message', existingMessage);
      }
    } else {
      // Create a new message
      const message: AutoModeMessage = {
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

    console.log('原始消息', event);
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
    

    const message: AutoModeMessage = {
      id: messageId,
      type: event.event_type,
      content: messageContent,
      contentType: contentType,
      metadata: metadata,
      eventId: event.event_id,
    };

    console.log('处理过后的', message);

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

    const message: AutoModeMessage = {
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

    const message: AutoModeMessage = {
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

    const message: AutoModeMessage = {
      id: messageId,
      type: event.event_type,
      content: content.error_message,
      metadata: content.details,
      eventId: event.event_id           
    };

    this.emit('message', message);

    // Add delay to ensure message state is updated before triggering task completion event
    setTimeout(() => {
      this.emit('taskComplete', true);
      // 发布任务完成事件，标记为失败
      eventBus.publish(EVENTS.CODING.TASK_COMPLETE, { success: false, event_file_id: this.eventFileId });
    }, 300);
  }

  private handleCompletionEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as CompletionContent;
    
    // Check if the result contains a summary
    const resultSummary = content.result && typeof content.result === 'object' && 'summary' in content.result
      ? content.result.summary
      : null;

    const message: AutoModeMessage = {
      id: messageId,
      type: event.event_type,
      content: resultSummary || content.success_message,
      eventId: event.event_id,
      metadata: {
        success_code: content.success_code,
        completion_time: content.completion_time,
        details: content.details,
        result: content.result,
        isWrite: true
      }
    };

    this.emit('message', message);

    // Add delay to ensure message state is updated before triggering task completion event
    setTimeout(() => {
      this.emit('taskComplete', false);
      // 发布任务完成事件，标记为成功
      eventBus.publish(EVENTS.CODING.TASK_COMPLETE, { success: true, event_file_id: this.eventFileId });
    }, 300);
  }

  private finalizeStreamMessage(messageId: string) {
    const message = this.streamEvents.get(messageId);
    if (message) {
      message.isStreaming = false;
      this.emit('message', message);
      this.streamEvents.delete(messageId);
    }
  }

  closeEventStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Finalize any pending stream messages
    this.streamEvents.forEach((message, id) => {
      this.finalizeStreamMessage(id);
    });

    this.streamEvents.clear();
    this.lastEventType = null;
    this.currentStreamMessageId = null;
    this.isStreamingActive = false;
  }

  async respondToEvent(eventId: string, response: string): Promise<void> {
    if (!this.eventFileId) {
      throw new Error('No event file ID available');
    }

    try {
      const response_data = await fetch('/api/coding-command/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          event_file_id: this.eventFileId,
          response,
        }),
      });

      if (!response_data.ok) {
        throw new Error(`HTTP error! status: ${response_data.status}`);
      }

    } catch (error) {
      console.error('Error sending response:', error);
      throw error;
    }
  }

  async saveTaskHistory(query: string, messages: AutoModeMessage[], status: string = 'completed'): Promise<void> {
    if (!this.eventFileId) {
      console.warn('No event file ID available, cannot save task history');
      return;
    }

    try {
      // Filter out system messages and empty messages before saving
      const filteredMessages = messages.filter(msg => {
        // Skip system messages and empty messages
        if (msg.type === 'SYSTEM' || !msg.content) {
          return false;
        }
        // Skip token statistics messages
        if (msg.contentType === 'token_stat') {
          return false;
        }
        return true;
      });

      const response = await fetch('/api/coding-command/save-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          event_file_id: this.eventFileId,
          messages: filteredMessages,
          status,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    } catch (error) {
      console.error('Error saving task history:', error);
    }
  }

  async cancelTask(): Promise<void> {
    if (!this.eventFileId) {
      console.warn('No event file ID available, cannot cancel task');
      return;
    }

    try {
      const response = await fetch('/api/coding-command/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_file_id: this.eventFileId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Close the event stream
      this.closeEventStream();

    } catch (error) {
      console.error('Error cancelling task:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const codingService = new CodingService();
