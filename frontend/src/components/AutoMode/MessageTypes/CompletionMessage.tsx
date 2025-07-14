import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../../lang';
import './MessageStyles.css';
import eventBus, { EVENTS } from '../../../services/eventBus';

interface CompletionMessageProps {
    message: MessageProps;
}

const CompletionMessage: React.FC<CompletionMessageProps> = ({ message }) => {
    const handleViewChanges = () => {
        // Dispatch event to activate HistoryPanel
        eventBus.publish(EVENTS.UI.ACTIVATE_PANEL, 'history');
    };

    return (
        <div className="message-font">
            <div className="message-title">
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </span>
                <span className="text-green-400 message-title-text">{getMessage('completion') || 'Completion'}</span>
                {message.metadata?.isWrite && (
                    <button 
                        onClick={handleViewChanges}
                        className="ml-4 text-xs text-blue-400 hover:text-blue-300 underline focus:outline-none"
                    >
                        {getMessage('viewChanges') || 'View Changes'}
                    </button>
                )}
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

export default CompletionMessage;
