import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MessageStyles.css';

interface CodeRankMessageProps {
    message: MessageProps;
}

// Main component that selects the appropriate subcomponent based on message type
const CodeRankMessage: React.FC<CodeRankMessageProps> = ({ message }) => {
    // Check if this is a streaming message
    const isStreamingMessage = message.type === "STREAM" && message.metadata?.stream_out_type === "code_rank";
    
    // Check if streaming is complete
    const isCompletedStream = isStreamingMessage && !message.isStreaming;

    if (isStreamingMessage) {
        return <StreamingCodeRankMessage message={message} isCompleted={isCompletedStream} />;
    } else {
        return <RegularCodeRankMessage message={message} />;
    }
};

// Streaming code rank message component with collapse/expand functionality
const StreamingCodeRankMessage: React.FC<{ message: MessageProps; isCompleted: boolean }> = ({ message, isCompleted }) => {
    const [isCollapsed, setIsCollapsed] = useState(isCompleted);

    // Format message content - truncate if too long
    const messageContent = message.content || '';
    const contentLines = messageContent.split('\n');
    const previewLines = 5; // Number of preview lines
    
    // Determine language for syntax highlighting
    const language = message.language || 'javascript';
    
    return (
        <div className="message-font">
            <div className="message-title">
                {/* Toggle button for collapse/expand */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="message-toggle-button"
                >
                    {isCollapsed ? (
                        <svg className="message-toggle-icon text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                {/* Icon */}
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                </span>
                
                {/* Title */}
                <span className="text-purple-400 message-title-text">
                    {message.isStreaming ? getMessage('rankingCode') : getMessage('rankedCode')}
                </span>
                
                {/* Streaming indicator - shown separately */}
                {message.isStreaming && (
                    <span className="ml-2">
                        <svg className="animate-spin h-4 w-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </span>
                )}
            </div>
            
            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container">
                    <SyntaxHighlighter
                        language={language}
                        style={vscDarkPlus}
                        customStyle={{
                            margin: 0,
                            padding: '1rem',
                            backgroundColor: 'transparent'
                        }}
                        wrapLines={true}
                        wrapLongLines={true}
                    >
                        {messageContent}
                    </SyntaxHighlighter>
                </div>
            )}
        </div>
    );
};

// Regular code rank message component
const RegularCodeRankMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    // Determine language for syntax highlighting
    const language = message.language || 'javascript';
    
    // Add collapse/expand functionality
    const [isCollapsed, setIsCollapsed] = useState(true);
    
    return (
        <div className="message-font">
            <div className="message-title">
                {/* Toggle button for collapse/expand */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="message-toggle-button"
                >
                    {isCollapsed ? (
                        <svg className="message-toggle-icon text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                {/* Icon */}
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                </span>
                
                {/* Title */}
                <span className="text-purple-400 message-title-text">{getMessage('rankedCode') || 'Ranked Code'}</span>
            </div>

            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container">
                    {/* Ranking title section if available */}
                    {message.metadata?.rankTitle && (
                        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            <span className="text-gray-300 font-mono">{message.metadata.rankTitle}</span>
                        </div>
                    )}

                    {/* Code content section */}
                    <div className="p-0 bg-gray-800/20">
                        <SyntaxHighlighter
                            language={language}
                            style={vscDarkPlus}
                            customStyle={{
                                margin: 0,
                                padding: '1rem',
                                backgroundColor: 'transparent'
                            }}
                            wrapLines={true}
                            wrapLongLines={true}
                        >
                            {message.content}
                        </SyntaxHighlighter>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeRankMessage;
