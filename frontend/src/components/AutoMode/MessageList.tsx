import React, { useMemo } from 'react';

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
    IndexBuildMessage,
    UserMessage,
    CodeMergeMessage,
    CodeCompileMessage,
    AgenticEditAskFollowupQuestionTool,
    AgenticEditExecuteCommandTool,
    AgenticEditListCodeDefinitionNamesTool
} from './MessageTypes';

// Direct imports for message type components
import AgenticFilterExecuteMessage from './MessageTypes/AgenticFilterMessageTypes/AgenticFilterExecuteMessage';
import AgenticFilterPrepareMessage from './MessageTypes/AgenticFilterMessageTypes/AgenticFilterPrepareMessage';
import AgenticFilterSuggestionMessage from './MessageTypes/AgenticFilterMessageTypes/AgentiFilterSuggestionMessage';
import AgenticEditReplaceInFileTool from './MessageTypes/AgenticEditReplaceInFileTool';
import AgenticEditWriteToFileTool from './MessageTypes/AgenticEditWriteToFileTool';
import AgenticEditListFilesTool from './MessageTypes/AgenticEditListFilesTool';
import AgenticEditReadFileTool from './MessageTypes/AgenticEditReadFileTool';
import AgenticEditSearchFilesTool from './MessageTypes/AgenticEditSearchFilesTool';
import AgenticEditUseMcpTool from './MessageTypes/AgenticEditUseMcpTool';
import AgenticEditUseRAGTool from './MessageTypes/AgenticEditUseRAGTool';
import AgenticEditAttemptCompletionTool from './MessageTypes/AgenticEditAttemptCompletionTool';
import AgenticEditToolResult from './MessageTypes/AgenticEditToolResult';
import AgenticEditApplyChanges from './MessageTypes/AgenticEditApplyChanges';
import AgenticEditApplyPreChanges from './MessageTypes/AgenticEditApplyPreChanges';

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

// 渲染单条消息的组件，使用React.memo进行优化
const MessageItem = React.memo(({ 
    message, 
    onUserResponse 
}: { 
    message: MessageProps, 
    onUserResponse: (response: string, eventId?: string) => Promise<void> 
}) => {
    // Function to render message content based on content type
    const renderMessageContent = (message: MessageProps) => {
        if (message.isUser) {
            return <UserMessage message={message} />;
        }

        if (message.metadata?.path?.startsWith("/agent/")) {
            if (message.metadata?.path === "/agent/edit" || message.metadata?.path === "/agent/edit/thinking") {
                return <ThinkingMessage message={message} />;
            }
            if (message.metadata?.path === "/agent/edit/tool/call") {
                const content = JSON.parse(message.content);
                if (content.tool_name === "ReplaceInFileTool") {
                    return <AgenticEditReplaceInFileTool message={message} />;
                }
                if (content.tool_name === "WriteToFileTool") {
                    return <AgenticEditWriteToFileTool message={message} />;
                }
                if (content.tool_name === "AskFollowupQuestionTool") {
                    return <AgenticEditAskFollowupQuestionTool message={message} />;
                }
                if (content.tool_name === "ExecuteCommandTool") {
                    return <AgenticEditExecuteCommandTool message={message} />;
                }
                if (content.tool_name === "ListCodeDefinitionNamesTool") {
                    return <AgenticEditListCodeDefinitionNamesTool message={message} />;
                }
                if (content.tool_name === "ListFilesTool") {
                    return <AgenticEditListFilesTool message={message} />;
                }
                if (content.tool_name === "ReadFileTool") {
                    return <AgenticEditReadFileTool message={message} />;
                }
                if (content.tool_name === "SearchFilesTool") {
                    return <AgenticEditSearchFilesTool message={message} />;
                }

                if (content.tool_name === "UseRAGTool") {
                    return <AgenticEditUseRAGTool message={message} />;
                }
                // 如果工具名称和server_name都存在，则是MCP工具
                if (content && content.tool_name && content.server_name) {
                    return <AgenticEditUseMcpTool message={message} />;
                }                

                if (content.tool_name === "AttemptCompletionTool") {
                    return <AgenticEditAttemptCompletionTool message={message} />;
                }

            }
            if (message.metadata?.path === "/agent/edit/tool/result") {
                return <AgenticEditToolResult message={message} />;
            }

            if (message.metadata?.path === "/agent/edit/apply_changes") {
                return <AgenticEditApplyChanges message={message} />;
            }

            if (message.metadata?.path === "/agent/edit/apply_pre_changes") {
                return <AgenticEditApplyPreChanges message={message} />;
            }

            if (message.metadata?.path === "/agent/edit/plan/mode/respond" || message.metadata?.path === "/agent/edit/completion") {
                return <MarkdownMessage message={message} />;
            }
            return <MarkdownMessage message={message} />;
        }

        if (message.metadata?.stream_out_type === "agentic_filter") {
            if (message.contentType === "command_execute_stat") {
                return <AgenticFilterExecuteMessage message={message} />;
            }
            if (message.contentType === "command_prepare") {
                return <AgenticFilterPrepareMessage message={message} />;
            }
            if (message.contentType === "text") {
                return <DefaultMessage message={message} />;
            }
            return <AgenticFilterSuggestionMessage message={message} />;
        }

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

        // 代码编译结果的展示        
        if (message.metadata?.stream_out_type === "compile") {
            return <CodeCompileMessage message={message} />;
        }

        if (message.metadata?.stream_out_type === "code_rank") {
            return <CodeRankMessage message={message} />;
        }

        // 未合并代码块的展示
        if (message.metadata?.stream_out_type === "unmerged_blocks") {
            return <CodeMergeMessage message={message} />;
        }

        // For summary content
        if (message.contentType === 'summary') {
            return <SummaryMessage message={message} />;
        }

        // For token statistics content
        if (message.contentType === 'token_stat') {
            return <TokenStatMessage message={message} />;
        }

        // For command execution statistics content
        if (message.contentType === 'command_execute_stat') {
            return <CommandExecuteMessage message={message} />;
        }

        // For context used content
        if (message.contentType === 'context_used') {
            return <ContextUsedMessage message={message} />;
        }

        // For thinking or streaming content
        if (message.isThinking || message.isStreaming || message.type === "STREAM") {            
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
        return <MarkdownMessage message={message} />;
    };

    return (
        <div
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-2 w-full`}
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
    );
}, (prevProps, nextProps) => {
    // 确定是否需要重新渲染的比较逻辑
    const prevMsg = prevProps.message;
    const nextMsg = nextProps.message;
    
    // 如果是流式消息（stream类型），始终重新渲染
    if ( prevMsg.isStreaming || nextMsg.isStreaming) {
        return false; // 返回false表示需要重新渲染
    }
    
    // 对于非流式消息，只有当内容等属性变化时才重新渲染
    const shouldNotUpdate = 
        prevMsg.id === nextMsg.id &&
        prevMsg.content === nextMsg.content &&
        prevMsg.isThinking === nextMsg.isThinking;
    
    return shouldNotUpdate;
});

// 真实在渲染的时候，我们会不展示 command_prepare_stat 类型的消息
const MessageList: React.FC<MessageListProps> = ({ messages, onUserResponse }) => {
    // Function to filter and organize messages before rendering
    const filterMessages = (messages: MessageProps[]): MessageProps[] => {
        if (messages.length === 0) return [];

        // Get all messages except the last one
        const messagesWithoutLast = messages.slice(0, -1);

        // Get the last message
        const lastMessage = messages[messages.length - 1];

        // Filter out command_prepare_stat messages and STREAM messages with specific stream_out_types
        // We usually don't want to filter out the final result of a stream like compile or lint
        const streamOutTypesToFilterDuringStream = ["code_generate", "agentic_filter","token_stat"];
        const filteredMessages = messagesWithoutLast.filter(message => {
            // Always hide command_prepare_stat
            if (message.contentType === 'command_prepare_stat') {
                return false;
            }
            // Hide specific STREAM types while they are actively streaming
            if (message.type === "STREAM" && !message.isStreaming && streamOutTypesToFilterDuringStream.includes(message.metadata?.stream_out_type)) {
                return false;
            }
            
            const path = message.metadata?.path;

            if (path === "/agent/edit/completion" || path === "/agent/edit/window_length_change" || path === "/agent/edit/token_usage" || path === "/agent/edit/apply_pre_changes") {
                return false;
            }

            // Filter out messages with path /agent/edit/apply_changes or /agent/edit/apply_pre_changes
            // and have_commit or has_commit is false
            
            if (path === '/agent/edit/apply_changes' || path === '/agent/edit/apply_pre_changes') {
                try {
                    const content = JSON.parse(message.content || '{}');
                    // Check for both have_commit and has_commit being false
                    if (content.have_commit === false) {
                        return false;
                    }
                } catch (e) {
                    // If parsing fails, keep the message
                    console.debug('Failed to parse message content for filtering:', e);
                }
            }

            return true;
        });        
        // Add the last message back to the filtered results
        return [...filteredMessages, lastMessage];
    };

    // 使用useMemo优化过滤后的消息列表，只在messages变化时重新计算
    const filteredMessages = useMemo(() => filterMessages(messages), [messages]);

    return (
        <>
            {filteredMessages.map((message) => (
                <MessageItem 
                    key={message.id} 
                    message={message} 
                    onUserResponse={onUserResponse} 
                />
            ))}
        </>
    );
};

export default React.memo(MessageList); 