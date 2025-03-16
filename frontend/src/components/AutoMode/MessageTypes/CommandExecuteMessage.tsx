import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';

interface CommandExecuteMessageProps {
    message: MessageProps;
}

const CommandExecuteMessage: React.FC<CommandExecuteMessageProps> = ({ message }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="font-mono text-sm bg-gray-850 rounded-lg overflow-hidden border border-gray-700 shadow-md">
            {/* Header section with gradient background */}
            <div 
                className="bg-gradient-to-r from-gray-800 to-gray-750 px-4 py-3 border-b border-gray-700 flex items-center justify-between cursor-pointer"
                onClick={toggleExpand}
            >
                <div className="flex items-center">
                    <div className="flex-shrink-0 mr-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div className="text-indigo-400 font-semibold">{getMessage('commandExecution')}</div>
                </div>
                <div className="text-gray-400">
                    <svg 
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>

            {/* Command display with subtle background - always visible */}
            <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                <div className="flex items-center">
                    <span className="text-gray-400 mr-2">{getMessage('command')}:</span>
                    <span className="text-white font-semibold font-mono bg-gray-700/50 px-2 py-1 rounded">
                        {message.metadata?.command}
                    </span>
                </div>
            </div>

            {/* Command output with markdown rendering - collapsible */}
            {isExpanded && (
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
            )}
        </div>
    );
};

export default CommandExecuteMessage;
