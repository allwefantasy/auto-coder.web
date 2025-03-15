import { EventEmitter } from 'events';

// Base event interface
export interface BaseEventContent {
  timestamp: number;
}

// Stream content interface
export interface StreamContent extends BaseEventContent {
  state: 'thinking' | 'content' | 'complete';
  content: string;
  content_type: string;
  sequence: number;
  is_thinking: boolean;
}

// Result content interface
export interface ResultContent extends BaseEventContent {
  content: string | any;
  content_type: string;
  metadata?: Record<string, any>;
}

// Ask user content interface
export interface AskUserContent extends BaseEventContent {
  prompt: string;
  options?: string[];
  default_option?: string;
  required?: boolean;
  timeout?: number;
}

// User response content interface
export interface UserResponseContent extends BaseEventContent {
  response: string;
  response_time: number;
  original_prompt?: string;
}

// Code content interface
export interface CodeContent extends StreamContent {
  content_type: 'code';
  language: string;
}

// Markdown content interface
export interface MarkdownContent extends StreamContent {
  content_type: 'markdown';
}

// Error content interface
export interface ErrorContent extends BaseEventContent {
  error_code: string;
  error_message: string;
  details?: Record<string, any>;
}

// Completion content interface
export interface CompletionContent extends BaseEventContent {
  success_code: string;
  success_message: string;
  result?: Record<string, any>;
  details?: Record<string, any>;
  completion_time: number;
}

// Union type for all content types
export type EventContent = 
  | StreamContent 
  | ResultContent 
  | AskUserContent 
  | UserResponseContent 
  | CodeContent 
  | MarkdownContent 
  | ErrorContent 
  | CompletionContent;

// Main event interface
export interface AutoCommandEvent {
  event_id: string;
  event_type: 'RESULT' | 'STREAM' | 'ASK_USER' | 'USER_RESPONSE' | 'COMPLETION' | 'ERROR';
  timestamp: number;
  content: EventContent;
  response_to?: string;
}

// Message interface for emitting to components
export interface Message {
  id: string;
  type: string;
  content: string;
  contentType?: string;
  metadata?: Record<string, any>;
  isUser?: boolean;
  isThinking?: boolean;
  isStreaming?: boolean;
  options?: string[];
  language?: string;
  responseRequired?: boolean;
  eventId?: string;
  responseTo?: string;
}

class AutoCommandService extends EventEmitter {
  private eventSource: EventSource | null = null;
  private streamEvents: Map<string, Message> = new Map();
  private lastEventType: string | null = null;
  private messageId = 0;
  private currentStreamMessageId: string | null = null;
  private isStreamingActive: boolean = false;

  constructor() {
    super();
  }

  async executeCommand(command: string): Promise<void> {
    // Start listening for events
    this.startEventStream();
    try {
      const response = await fetch('/api/auto-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  }

  private startEventStream() {
    // Close existing connection if any
    this.closeEventStream();

    this.eventSource = new EventSource('/api/auto-command/events');

    this.eventSource.onmessage = (event) => {
      try {
        const eventData: AutoCommandEvent = JSON.parse(event.data);
        console.log('eventData', eventData);
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
    
    if (event.event_type === 'STREAM') {
      if (this.lastEventType !== 'STREAM') {
        // First STREAM in a sequence - create new message ID
        messageId = `msg-${this.messageId++}`;
        this.currentStreamMessageId = messageId;
      } else {
        // Consecutive STREAM event - use the current stream message ID
        messageId = this.currentStreamMessageId || `msg-${this.messageId++}`;
      }
    } else {
      // Non-STREAM event - always create a new message ID
      messageId = `msg-${this.messageId++}`;
      
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
      const message: Message = {
        id: messageId,
        type: event.event_type,
        content: content.content,
        contentType: content.content_type,
        isThinking: content.is_thinking,
        isStreaming: true,
        eventId: event.event_id,
        language: (content as CodeContent).language, // Will be undefined if not CodeContent
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
    
    const message: Message = {
      id: messageId,
      type: event.event_type,
      content: typeof content.content === 'string' ? content.content : JSON.stringify(content.content),
      contentType: content.content_type,
      metadata: content.metadata,
      eventId: event.event_id,
    };
    
    this.emit('message', message);
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
  }

  private handleCompletionEvent(event: AutoCommandEvent, messageId: string) {
    const content = event.content as CompletionContent;
    
    const message: Message = {
      id: messageId,
      type: event.event_type,
      content: content.success_message,
      eventId: event.event_id,
    };
    
    this.emit('message', message);
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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    // Finalize any pending stream messages
    Array.from(this.streamEvents.keys()).forEach(messageId => {
      this.finalizeStreamMessage(messageId);
    });
    this.streamEvents.clear();
    this.lastEventType = null;
    this.currentStreamMessageId = null;
    this.isStreamingActive = false;
  }
}

// Export a singleton instance
export const autoCommandService = new AutoCommandService();
