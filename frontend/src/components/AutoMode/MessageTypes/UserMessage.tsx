import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';

interface UserMessageProps {
    message: MessageProps;
}

const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
    return (
        <div className="message-font">
            <div className="message-title">
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                </span>
                <span className="text-indigo-400 message-title-text">{getMessage('user') || 'User'}</span>
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

export default UserMessage;