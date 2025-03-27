import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';

interface ContextUsedMessageProps {
    message: MessageProps;
}

const ContextUsedMessage: React.FC<ContextUsedMessageProps> = ({ message }) => {
    // Initialize collapsed state to false (expanded by default)
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
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                {/* Info icon */}
                <span className="message-title-icon">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </span>
                
                {/* Title */}
                <span className="text-blue-400 message-title-text text-xs">{getMessage('contextUsed')}</span>
            </div>

            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container border border-gray-800">
                    {/* Title section */}
                    {message.metadata?.title && (
                        <div className="px-2 py-1 bg-gray-800/50 border-b border-gray-800 text-sm">
                            <h3 className="text-white font-medium">{message.metadata?.title}</h3>
                        </div>
                    )}

                    {/* Files section */}
                    {message.metadata?.files && message.metadata.files.length > 0 && (
                        <div className="px-2 py-1 bg-gray-800/30 border-b border-gray-800">
                            <div className="text-gray-400 mb-0.5 text-xs">{getMessage('filesReferenced')}:</div>
                            <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                                <div className="flex flex-col gap-0.5 max-h-[120px] overflow-y-auto">
                                    {message.metadata.files.map((file: string, index: number) => (
                                        <div key={index} className="flex items-center">
                                            <svg className="w-2 h-2 mr-1 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <span className="text-blue-300 font-mono whitespace-nowrap text-xs">{file}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description section */}
                    <div className="p-2 bg-gray-800/20">
                        <div className="prose prose-invert prose-xs max-w-none">
                            <ReactMarkdown
                                className="text-gray-200 break-words text-xs"
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
                                                customStyle={{
                                                    borderRadius: '0.25rem',
                                                    marginTop: '0.375rem',
                                                    marginBottom: '0.375rem',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={`${className} bg-gray-700/50 px-1 rounded`} {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextUsedMessage;
