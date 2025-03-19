import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';

interface CommandSuggestionMessageProps {
    message: MessageProps;
}

// 主组件，根据消息类型选择适当的子组件
const CommandSuggestionMessage: React.FC<CommandSuggestionMessageProps> = ({ message }) => {
    // 检查消息是否为流式消息
    const isStreamingMessage = message.type === "STREAM" && message.metadata?.stream_out_type === "command_suggestion";
    
    // 检查流式消息是否已完成 - 根据isStreaming状态判断
    const isCompletedStream = isStreamingMessage && !message.isStreaming;

    if (isStreamingMessage) {
        return <StreamingCommandMessage message={message} isCompleted={isCompletedStream} />;
    } else {
        return <RegularCommandMessage message={message} />;
    }
};

// 流式命令消息组件，包含折叠/展开功能
const StreamingCommandMessage: React.FC<{ message: MessageProps; isCompleted: boolean }> = ({ message, isCompleted }) => {
    const [isCollapsed, setIsCollapsed] = useState(isCompleted);

    // 消息内容格式化处理 - 如果内容很长，进行截断处理
    const messageContent = message.content || '';
    const contentLines = messageContent.split('\n');
    const previewLines = 3; // 预览显示的行数
    
    // 折叠状态下显示的内容
    const collapsedContent = contentLines.length > previewLines
        ? contentLines.slice(0, previewLines).join('\n') + '...'
        : messageContent;
    
    return (
        <div className="font-mono text-xs">
            <div className={`flex items-center ${message.isStreaming ? 'text-yellow-400' : 'text-green-400'} font-semibold mb-2`}>
                {/* 当消息完成且内容超过预览行数时显示折叠/展开切换按钮 */}
                {isCompleted && contentLines.length > previewLines && (
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)} 
                        className="mr-2 p-1 rounded hover:bg-gray-700 transition-colors"
                    >
                        {isCollapsed ? (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                )}
                
                {/* 消息状态标识 */}
                <span className="mr-2">
                    {message.isStreaming ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}                    
                </span>                
                <span>{message.isStreaming ? getMessage('processingStatus') : getMessage('processingComplete')}</span>
            </div>
            
            {/* 消息内容 */}
            <div className="bg-gray-800/50 p-2 rounded-md border border-gray-700 whitespace-pre-wrap text-white break-words">
                {isCollapsed ? collapsedContent : messageContent}                
            </div>
        </div>
    );
};

// 常规命令消息组件，正常显示内容
const RegularCommandMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    return (
        <div className="font-mono text-xs">
            <div className="flex items-center text-blue-400 font-semibold mb-2">
                <span className="mr-2">ℹ️</span>
                <span>{getMessage('commandSuggestionTitle')}</span>
            </div>
            <div className="bg-gray-800/50 p-2 rounded-md border border-gray-700 whitespace-pre-wrap text-white break-words">
                {message.content}
            </div>
        </div>
    );
};

export default CommandSuggestionMessage;
