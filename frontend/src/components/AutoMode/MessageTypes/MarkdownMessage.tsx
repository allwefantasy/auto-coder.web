import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';

interface MarkdownMessageProps {
    message: MessageProps;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ message }) => {
    return (
        <div className="message-font">
            <div className="message-title">
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </span>
                <span className="text-blue-400 message-title-text">{getMessage('markdown') || 'Markdown'}</span>
            </div>
            <div className="prose prose-invert prose-xs max-w-none">
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
            </div>
        </div>
    );
};

export default MarkdownMessage;
