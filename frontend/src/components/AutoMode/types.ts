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
    content: string | ResultTokenStatContent | ResultCommandPrepareStatContent | ResultCommandExecuteStatContent | ResultContextUsedContent | any;
    content_type: string;
    metadata?: Record<string, any>;
  }
  
  // Token statistics content
  export interface ResultTokenStatContent {
    model_name: string;
    elapsed_time: number;
    first_token_time: number;
    input_tokens: number;
    output_tokens: number;
    input_cost: number;
    output_cost: number;
    speed: number;
  }
  
  // Command preparation statistics content
  export interface ResultCommandPrepareStatContent {
    command: string;
    parameters: Record<string, any>;
  }
  
  // Command execution statistics content
  export interface ResultCommandExecuteStatContent {
    command: string;
    content: string;
  }
  
  // Context used content
  export interface ResultContextUsedContent {
    files: string[];
    title: string;
    description: string;
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
  
  // Result summary content interface
  export interface ResultSummaryContent extends BaseEventContent {
    summary: string;
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
    | CompletionContent
    | ResultSummaryContent;
  
  // Main event interface
  export interface AutoCommandEvent {
    event_id: string;
    event_type: 'RESULT' | 'STREAM' | 'ASK_USER' | 'USER_RESPONSE' | 'COMPLETION' | 'ERROR';
    timestamp: number;
    content: EventContent;
    response_to?: string;
    metadata?: Record<string, any>;
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

// 添加历史任务接口
export interface HistoryCommand {
    id: string;
    query: string;
    status: string;
    timestamp: number;
    messages: Array<Message>;
    event_file_id?: string;
    stats?: string;  
  }