import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';

interface ThinkingMessageProps {
    message: MessageProps;
}

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ message }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // When thinking completes, automatically collapse the message
    useEffect(() => {
        if (!message.isThinking && !message.isStreaming) {
            setIsCollapsed(true);
        }
    }, [message.isThinking, message.isStreaming]);
    
    return (
        <div className="message-font">
            <div className="message-title">
                {/* Collapse/expand button - only show when thinking is complete */}
                {(!message.isThinking && !message.isStreaming) && (
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)} 
                        className="message-toggle-button text-gray-400"
                    >
                        {isCollapsed ? (
                            <svg className="message-toggle-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="message-toggle-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                )}
                
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                </span>
                <span className="text-gray-400 message-title-text">{getMessage('thinking') || 'Thinking'}</span>
            </div>
            {/* Show content only if not collapsed or thinking is in progress */}
            {(!isCollapsed || message.isThinking || message.isStreaming) && (
                <div className="prose prose-invert prose-xs max-w-none mt-1">
                    <ReactMarkdown
                        className={`${message.isThinking ? 'italic text-gray-400' : 'text-gray-200'} break-words`}
                        components={{
                            code: ({ className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const inline = !match;
                                return !inline ? (
                                    <SyntaxHighlighter
                                        language={match ? match[1] : ''}
                                        style={vscDarkPlus}
                                        PreTag="div"
                                        wrapLines={true}
                                        wrapLongLines={true}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                    {(message.isThinking || message.isStreaming) && (
                        <div className="flex space-x-1 mt-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ThinkingMessage;
