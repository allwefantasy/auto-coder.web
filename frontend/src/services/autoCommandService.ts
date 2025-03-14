import { EventEmitter } from 'events';

export interface AutoCommandEvent {
  event_id: string;
  event_type: 'RESULT' | 'STREAM' | 'ASK_USER' | 'USER_RESPONSE' | 'SYSTEM_COMMAND' | 'ERROR';
  timestamp: number;
  content: {
    timestamp: number;
    state?: 'thinking' | 'content' | 'complete';
    content: string;
    content_type?: string;
    sequence?: number;
    is_thinking?: boolean;
    metadata?: Record<string, any>;
  };
  response_to?: string;
}

class AutoCommandService extends EventEmitter {
  private eventSource: EventSource | null = null;
  private currentStreamContent: string = '';
  private lastEventType: string | null = null;

  constructor() {
    super();
  }

  async executeCommand(command: string): Promise<void> {
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

      // Start listening for events
      this.startEventStream();
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
    if (event.event_type === 'STREAM') {
      // If this is a new type of event (different from last one), emit the accumulated content
      if (this.lastEventType && this.lastEventType !== 'STREAM' && this.currentStreamContent) {
        this.emit('message', {
          type: this.lastEventType,
          content: this.currentStreamContent
        });
        this.currentStreamContent = '';
      }

      // Append the new stream content
      this.currentStreamContent += event.content.content;
      
      // If this is a complete state, emit the accumulated content
      if (event.content.state === 'complete') {
        this.emit('message', {
          type: 'STREAM',
          content: this.currentStreamContent
        });
        this.currentStreamContent = '';
      }
    } else {
      // For non-stream events, emit the accumulated stream content first if any
      if (this.currentStreamContent) {
        this.emit('message', {
          type: 'STREAM',
          content: this.currentStreamContent
        });
        this.currentStreamContent = '';
      }

      // Then emit the new event
      this.emit('message', {
        type: event.event_type,
        content: event.content.content,
        metadata: event.content.metadata
      });
    }

    this.lastEventType = event.event_type;
  }

  closeEventStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentStreamContent = '';
    this.lastEventType = null;
  }
}

// Export a singleton instance
export const autoCommandService = new AutoCommandService();
