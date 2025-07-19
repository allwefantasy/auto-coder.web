import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '@/lang';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ContextAwareMessageProps {
    message: MessageProps;
}

// Main component that selects the appropriate subcomponent based on message type
const ContextAwareMessage: React.FC<ContextAwareMessageProps> = ({ message }) => {
    // Check if this is a streaming message
    const isStreamingMessage = message.type === "STREAM" && message.metadata?.stream_out_type === "file_number_list";
    
    // Check if streaming is complete
    const isCompletedStream = isStreamingMessage && !message.isStreaming;

    if (isStreamingMessage) {
        return <StreamingContextMessage message={message} isCompleted={isCompletedStream} />;
    } else {
        return <RegularContextMessage message={message} />;
    }
};

// Streaming context message component with collapse/expand functionality
const StreamingContextMessage: React.FC<{ message: MessageProps; isCompleted: boolean }> = ({ message, isCompleted }) => {
    // Initialize collapsed state based on completion status, but default to false for better UX
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Format message content - truncate if too long
    const messageContent = message.content || '';
    const contentLines = messageContent.split('\n');
    const previewLines = 3; // Number of preview lines
    
    // Content to show when collapsed - no longer needed as we'll hide content completely
    // when collapsed
    
    return (
        <div className="font-mono text-[14px]">
            <div className={`flex items-center ${message.isStreaming ? 'text-white' : 'text-blue-400'} font-semibold mb-2`}>
                {/* Toggle button for collapse/expand when message is complete and content exceeds preview lines */}
                {isCompleted && contentLines.length > previewLines && (
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)} 
                        className="mr-2 p-0.5 rounded hover:bg-gray-700 transition-colors"
                    >
                        {isCollapsed ? (
                            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                )}
                
                {/* Status indicator */}
                <span className="mr-2">
                    {message.isStreaming ? (
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    )}                    
                </span>                                
                <span>{message.isStreaming ? getMessage('analyzingContext') : getMessage('contextAnalysisComplete')}</span>
            </div>
            
            {/* Message content - only show when not collapsed */}
            {!isCollapsed && (
                <div className={`break-words break-all bg-gray-800/50 p-2 rounded-md border border-gray-700 whitespace-pre-wrap text-xs ${message.isStreaming ? 'text-white' : 'text-gray-200'}`}>
                    {messageContent}                
                </div>
            )}
        </div>
    );
};

// Regular context message component with markdown support
const RegularContextMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    // Initialize collapsed state to true (collapsed by default)
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div className="font-mono text-[14px]">
            {/* Header section with simple style matching the StreamingContextMessage */}            
            <div className="flex items-center">
                {/* Toggle button for collapse/expand */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="mr-2 p-0.5 rounded hover:bg-gray-700 transition-colors"
                >
                    {isCollapsed ? (
                        <svg className="w-3 h-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-3 h-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                {/* Info icon */}
                <span className="mr-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </span>
                
                {/* Title */}
                <span className="text-blue-400 font-semibold">{getMessage('contextAwareInfo')}</span>
            </div>

            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="mt-2 bg-gray-850 rounded-lg overflow-hidden border border-gray-700 shadow-md">
                    {/* Title section if available */}
                    {message.metadata?.title && (
                        <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700">
                            <h3 className="text-white font-medium text-[14px]">{message.metadata.title}</h3>
                        </div>
                    )}

                    {/* Context items section if available */}
                    {message.metadata?.contextItems && message.metadata.contextItems.length > 0 && (
                        <div className="px-3 py-2 bg-gray-800/30 border-b border-gray-700">
                            <div className="text-gray-400 text-[14px] mb-1">{getMessage('relevantContext')}:</div>
                            <div className="flex flex-col gap-0.5 max-h-[150px] overflow-y-auto">
                                {message.metadata.contextItems.map((item: string, index: number) => (
                                    <div key={index} className="flex items-center text-[14px]">
                                        <svg className="w-2.5 h-2.5 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span className="text-blue-300 font-mono truncate">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description section */}
                    <div className="p-3 bg-gray-800/20">            
                        <div className="prose prose-invert prose-xs max-w-none">
                            <ReactMarkdown
                                className="text-gray-200 break-words text-[14px]"
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
                                            <code className={`${className} bg-gray-700/50 px-1 rounded text-[14px]`} {...props}>
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

export default ContextAwareMessage;
