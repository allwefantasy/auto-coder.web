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
    ContextAwareMessage,
    CodeGenerateMessage,
    CodeRankMessage,
    CodeLintMessage,
    IndexBuildMessage
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

// 真实在渲染的时候，我们会不展示 command_prepare_stat 类型的消息
const MessageList: React.FC<MessageListProps> = ({ messages, onUserResponse }) => {
    // Function to filter and organize messages before rendering
    const filterMessages = (messages: MessageProps[]): MessageProps[] => {
        if (messages.length === 0) return [];
        
        // Get all messages except the last one
        const messagesWithoutLast = messages.slice(0, -1);
        
        // Get the last message
        const lastMessage = messages[messages.length - 1];
        
        // Filter out command_prepare_stat messages and STREAM messages with code_generate type
        const filteredMessages = messagesWithoutLast.filter(message => 
            message.contentType !== 'command_prepare_stat' && 
            !(message.type === "STREAM" && message.metadata?.stream_out_type === "code_generate")
        );
        
        // Add the last message back to the filtered results
        return [...filteredMessages, lastMessage];
    };
    // Function to render message content based on content type
    const renderMessageContent = (message: MessageProps) => {        

        // For completion events
        if (message.type === 'COMPLETION') {
            return <CompletionMessage message={message} />;
        }
        

        // For 上下文感知信息的展示
        if (message.metadata?.stream_out_type === "file_number_list") {
            return <ContextAwareMessage message={message} />;
        }
        
        // 索引构建信息展示
        if (message.metadata?.stream_out_type === "index_build") {
            return <IndexBuildMessage message={message} />;
        }
        
        // 代码生成结果的展示
        if (message.metadata?.stream_out_type === "code_generate") {
            return <CodeGenerateMessage message={message} />;
        }

        // 代码lint结果的展示
        if (message.metadata?.stream_out_type === "lint") {
            return <CodeLintMessage message={message} />;
        }

        if (message.metadata?.stream_out_type === "code_rank") {
            return <CodeRankMessage message={message} />;
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
        // if (message.contentType === 'command_prepare_stat') {
        //     return <CommandPrepareMessage message={message} />;
        // }

        // For command execution statistics content
        if (message.contentType === 'command_execute_stat') {
            return <CommandExecuteMessage message={message} />;
        }

        // For context used content
        if (message.contentType === 'context_used') {
            return <ContextUsedMessage message={message} />;
        }
        
        // For thinking or streaming content
        if (message.isThinking || message.isStreaming) {
            return <ThinkingMessage message={message} />;
        }
        
        // AutoCommand 模式下专有的信息，一般是用来思考和展示思考结果
        if (message.metadata?.stream_out_type === "command_suggestion") {
            return <CommandSuggestionMessage message={message} />;
        }

        if (message.contentType === 'markdown' && !message.metadata?.stream_out_type) {
            return <MarkdownMessage message={message} />;
        }        
        
        // Default text content
        return <DefaultMessage message={message} />;
    };

    return (
        <>
            {filterMessages(messages).map((message, index) => (
                <div
                    key={message.id || index}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4 w-full`}
                >
                    {!message.isUser && (
                        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                        </div>
                    )}
                    <div
                        className={`w-[80%] ${message.isUser ? 'bg-indigo-600' :
                            message.type === 'ERROR' ? 'bg-red-900/80' :
                                message.isThinking || message.isStreaming ? 'bg-gray-700/50' : 'bg-gray-700'} 
              rounded-xl px-3 py-2 ${message.isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                    >
                        {/* Message content based on content type */}
                        {renderMessageContent(message)}

                        {/* Options for ASK_USER type */}
                        {message.type === 'ASK_USER' && message.options && message.options.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {message.options.map((option, i) => (
                                    <button
                                        key={i}
                                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-full text-xs text-white transition-colors"
                                        onClick={() => onUserResponse(option, message.eventId)}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {message.isUser && (
                        <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center ml-2 flex-shrink-0">
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
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