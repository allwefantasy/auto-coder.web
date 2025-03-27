import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MessageStyles.css';

interface CodeLintMessageProps {
    message: MessageProps;
}

// Main component that selects the appropriate subcomponent based on message type
const CodeLintMessage: React.FC<CodeLintMessageProps> = ({ message }) => {
    // Check if this is a streaming message
    const isStreamingMessage = message.type === "STREAM" && message.metadata?.stream_out_type === "lint";
    
    // Check if streaming is complete
    const isCompletedStream = isStreamingMessage && !message.isStreaming;

    if (isStreamingMessage) {
        return <StreamingCodeLintMessage message={message} isCompleted={isCompletedStream} />;
    } else {
        return <RegularCodeLintMessage message={message} />;
    }
};

// Streaming lint message component with collapse/expand functionality
const StreamingCodeLintMessage: React.FC<{ message: MessageProps; isCompleted: boolean }> = ({ message, isCompleted }) => {
    const [isCollapsed, setIsCollapsed] = useState(isCompleted);

    // Format message content
    const messageContent = message.content || '';
    const contentLines = messageContent.split('\n');
    const previewLines = 5; // Number of preview lines
    
    return (
        <div className="message-font">
            <div className="message-title">
                {/* Toggle button for collapse/expand when message is complete and content exceeds preview lines */}
                {isCompleted && contentLines.length > previewLines && (
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
                )}
                
                {/* Status indicator */}
                <span className="message-title-icon">
                    {message.isStreaming ? (
                        <svg className="animate-spin w-3.5 h-3.5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    )}
                </span>
                
                <span className="text-yellow-400 message-title-text text-xs">
                    {message.isStreaming ? getMessage('analyzingCode') || 'Analyzing Code' : getMessage('lintResults') || 'Lint Results'}
                </span>
            </div>
            
            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container border border-gray-800">
                    <div className="p-2 whitespace-pre-wrap text-xs">
                        {messageContent}
                    </div>
                </div>
            )}
        </div>
    );
};

// Regular lint message component
const RegularCodeLintMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    // Add collapsed state
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    return (
        <div className="message-font">
            {/* Header section with simple style */}            
            <div className="message-title">
                {/* Toggle button for collapse/expand */}
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
                
                {/* Info icon */}
                <span className="message-title-icon">
                    <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </span>
                
                {/* Title */}
                <span className="text-yellow-400 message-title-text text-xs">{getMessage('lintResults') || 'Lint Results'}</span>
            </div>
            
            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container border border-gray-800">
                    {/* File name section if available */}
                    {message.metadata?.fileName && (
                        <div className="px-2 py-0.5 bg-gray-800/50 border-b border-gray-800 flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span className="text-gray-300 font-mono text-xs">{message.metadata.fileName}</span>
                        </div>
                    )}

                    {/* Lint content section */}
                    <div className="p-2 whitespace-pre-wrap text-xs">
                        {message.content}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeLintMessage; 