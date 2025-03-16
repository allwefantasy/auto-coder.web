import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';

interface ContextUsedMessageProps {
    message: MessageProps;
}

const ContextUsedMessage: React.FC<ContextUsedMessageProps> = ({ message }) => {
    return (
        <div className="font-mono text-sm bg-gray-850 rounded-lg overflow-hidden border border-gray-700 shadow-md">
            {/* Header section with gradient background */}
            <div className="bg-gradient-to-r from-blue-900/70 to-indigo-900/70 px-4 py-3 border-b border-gray-700 flex items-center">
                <div className="flex-shrink-0 mr-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <div className="text-blue-400 font-semibold">{getMessage('contextUsed')}</div>
            </div>

            {/* Title section */}
            <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                <h3 className="text-white font-medium">{message.metadata?.title}</h3>
            </div>

            {/* Files section */}
            {message.metadata?.files && message.metadata.files.length > 0 && (
                <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-700">
                    <div className="text-gray-400 text-xs mb-2">{getMessage('filesReferenced')}:</div>
                    <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                        {message.metadata.files.map((file: string, index: number) => (
                            <div key={index} className="flex items-center text-xs">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <span className="text-blue-300 font-mono truncate">{file}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Description section */}
            <div className="p-4 bg-gray-800/20">
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

export default ContextUsedMessage;
