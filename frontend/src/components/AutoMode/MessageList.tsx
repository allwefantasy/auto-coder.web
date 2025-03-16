import React from 'react';

import {
    CodeMessage,
    MarkdownMessage,
    TokenStatMessage,
    CommandPrepareMessage,
    CommandExecuteMessage,
    ContextUsedMessage,
    CompletionMessage,
    ThinkingMessage,
    CommandSuggestionMessage,
    DefaultMessage,
    SummaryMessage,
    ContextAwareMessage    
} from './MessageTypes';


export interface MessageProps {
    id: string;
    type?: string;
    content: string;
    contentType?: string;
    language?: string;
    isUser?: boolean;
    isThinking?: boolean;
    isStreaming?: boolean;
    metadata?: Record<string, any>;
    options?: string[];
    eventId?: string;
    responseRequired?: boolean;
}

interface MessageListProps {
    messages: MessageProps[];
    onUserResponse: (response: string, eventId?: string) => Promise<void>;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onUserResponse }) => {
    // Function to render message content based on content type
    const renderMessageContent = (message: MessageProps) => {
        // For code content
        if (message.contentType === 'code' && message.language) {
            return <CodeMessage message={message} />;
        }

        // For markdown content
        if (message.contentType === 'markdown' && message.metadata?.stream_out_type !== "command_suggestion") {
            return <MarkdownMessage message={message} />;
        }

        // For 上下文感知信息的展示
        if (message.metadata?.stream_out_type === "file_number_list") {
            return <ContextAwareMessage message={message} />;
        }

        // For summary content
        if (message.contentType === 'summary') {
            return <SummaryMessage message={message} />;
        }

        // For token statistics content
        if (message.contentType === 'token_stat') {
            return <TokenStatMessage message={message} />;
        }

        // For command preparation statistics content
        if (message.contentType === 'command_prepare_stat') {
            return <CommandPrepareMessage message={message} />;
        }

        // For command execution statistics content
        if (message.contentType === 'command_execute_stat') {
            return <CommandExecuteMessage message={message} />;
        }

        // For context used content
        if (message.contentType === 'context_used') {
            return <ContextUsedMessage message={message} />;
        }

        // For completion events
        if (message.type === 'COMPLETION') {
            return <CompletionMessage message={message} />;
        }

        // For thinking or streaming content
        if (message.isThinking || message.isStreaming) {
            return <ThinkingMessage message={message} />;
        }
        
        // AutoCommand 模式下专有的信息，一般是用来思考和展示思考结果
        if (message.metadata?.stream_out_type === "command_suggestion") {
            return <CommandSuggestionMessage message={message} />;
        }
        
        // Default text content
        return <DefaultMessage message={message} />;
    };

    return (
        <>
            {messages.map((message, index) => (
                <div
                    key={message.id || index}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4 w-full`}
                >
                    {!message.isUser && (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                        </div>
                    )}
                    <div
                        className={`w-[80%] ${message.isUser ? 'bg-indigo-600' :
                            message.type === 'ERROR' ? 'bg-red-900/80' :
                                message.isThinking || message.isStreaming ? 'bg-gray-700/50' : 'bg-gray-700'} 
              rounded-2xl px-4 py-3 ${message.isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                    >
                        {/* Message content based on content type */}
                        {renderMessageContent(message)}

                        {/* Options for ASK_USER type */}
                        {message.type === 'ASK_USER' && message.options && message.options.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {message.options.map((option, i) => (
                                    <button
                                        key={i}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-full text-sm text-white transition-colors"
                                        onClick={() => onUserResponse(option, message.eventId)}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {message.isUser && (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center ml-2 flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                    )}
                </div>
            ))}
        </>
    );
};

export default MessageList; 