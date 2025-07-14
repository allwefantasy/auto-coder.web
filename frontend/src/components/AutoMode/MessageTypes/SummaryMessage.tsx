import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../../lang';
import './MessageStyles.css';

interface SummaryMessageProps {
    message: MessageProps;
}

const SummaryMessage: React.FC<SummaryMessageProps> = ({ message }) => {
    return (
        <div className="message-font message-content-container">
            {/* Header section with gradient background */}
            <div className="bg-gradient-to-r from-purple-800 to-purple-700 px-4 py-3 border-b border-gray-700 flex items-center">
                <span className="message-title-icon">
                    <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </span>
                <span className="text-purple-300 message-title-text">{getMessage('summary')}</span>
            </div>

            {/* Summary content with markdown rendering */}
            <div className="p-4 bg-gray-800/30">
                <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                        className="text-gray-200 break-words"
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
                                            borderRadius: '0.375rem',
                                            marginTop: '0.5rem',
                                            marginBottom: '0.5rem'
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
    );
};

export default SummaryMessage; 