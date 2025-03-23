import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';

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
        <div className="message-font">
            <div className="message-title">
                {/* 折叠/展开按钮 */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="message-toggle-button"
                >
                    {isCollapsed ? (
                        <svg className="message-toggle-icon text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                {/* 图标 */}
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </span>
                
                {/* 标题 */}
                <span className="text-yellow-400 message-title-text">
                    {message.isStreaming ? getMessage('processingStatus') : getMessage('processingComplete')}
                </span>
                
                {/* 流处理指示器 - 单独显示 */}
                {message.isStreaming && (
                    <span className="ml-2">
                        <svg className="animate-spin h-4 w-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </span>
                )}
            </div>
            
            {/* 消息内容 */}
            <div className="message-content-container bg-gray-800/50 p-2 whitespace-pre-wrap text-white break-words">
                {isCollapsed ? collapsedContent : messageContent}                
            </div>
        </div>
    );
};

// 常规命令消息组件，正常显示内容
const RegularCommandMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    return (
        <div className="message-font">
            <div className="message-title">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="message-toggle-button"
                >
                    {isCollapsed ? (
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </span>
                
                <span className="text-blue-400 message-title-text">{getMessage('commandSuggestionTitle')}</span>
            </div>
            
            {!isCollapsed && (
                <div className="message-content-container bg-gray-800/50 p-2 whitespace-pre-wrap text-white break-words">
                    {message.content}
                </div>
            )}
        </div>
    );
};

export default CommandSuggestionMessage;
