import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';

interface UserMessageProps {
    message: MessageProps;
    messageIndex: number; // Assuming index is passed for identification
    onRefresh: (index: number) => void; // Callback function
}

const UserMessage: React.FC<UserMessageProps> = ({ message, messageIndex, onRefresh }) => {

    const handleRefresh = () => {
        onRefresh(messageIndex);
    };

    return (
        <div className="message-font group relative"> {/* Add group and relative positioning */}
            {/* Refresh Icon - Positioned top-right, appears on hover */}
            <button
                onClick={handleRefresh}
                className="absolute top-1 right-1 p-1 rounded text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                title={getMessage('refreshFromHere') || 'Refresh from here'} // Add tooltip for accessibility
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M15 15H9" />
                </svg>
            </button>

            <div className="message-title">
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                </span>
                <span className="text-indigo-400 message-title-text">{getMessage('user') || 'User'}</span>
            </div>
            <div className="prose prose-invert prose-xs max-w-none pt-1"> {/* Add padding top to avoid overlap */}
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