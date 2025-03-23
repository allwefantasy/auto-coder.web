import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeRankMessageProps {
    message: MessageProps;
}

// Main component that selects the appropriate subcomponent based on message type
const CodeRankMessage: React.FC<CodeRankMessageProps> = ({ message }) => {
    // Check if this is a streaming message
    const isStreamingMessage = message.type === "STREAM" && message.metadata?.stream_out_type === "code_rank";
    
    // Check if streaming is complete
    const isCompletedStream = isStreamingMessage && !message.isStreaming;

    if (isStreamingMessage) {
        return <StreamingCodeRankMessage message={message} isCompleted={isCompletedStream} />;
    } else {
        return <RegularCodeRankMessage message={message} />;
    }
};

// Streaming code rank message component with collapse/expand functionality
const StreamingCodeRankMessage: React.FC<{ message: MessageProps; isCompleted: boolean }> = ({ message, isCompleted }) => {
    const [isCollapsed, setIsCollapsed] = useState(isCompleted);

    // Format message content - truncate if too long
    const messageContent = message.content || '';
    const contentLines = messageContent.split('\n');
    const previewLines = 5; // Number of preview lines
    
    // Content to show when collapsed - no longer needed as we'll hide content completely
    // when collapsed
    
    // Determine language for syntax highlighting
    const language = message.language || 'javascript';
    
    return (
        <div className="font-mono text-sm">
            <div className={`flex items-center ${message.isStreaming ? 'text-yellow-400' : 'text-purple-400'} font-semibold mb-2`}>
                {/* Toggle button for collapse/expand when message is complete */}
                {isCompleted && (
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)} 
                        className="mr-2 p-1 rounded hover:bg-gray-700 transition-colors"
                    >
                        {isCollapsed ? (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                )}
                
                {/* Status indicator */}
                <span className="mr-2">
                    {message.isStreaming ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                        </svg>
                    )}                    
                </span>                                
                <span>{message.isStreaming ? getMessage('rankingCode') || 'Ranking code...' : getMessage('codeRankingComplete') || 'Code ranking complete'}</span>
            </div>
            
            {/* Message content with syntax highlighting - only show when not collapsed */}
            {!isCollapsed && (
                <div className="bg-gray-800/50 rounded-md border border-gray-700">
                    <SyntaxHighlighter
                        language={language}
                        style={vscDarkPlus}
                        customStyle={{
                            margin: 0,
                            padding: '1rem',
                            borderRadius: '0.375rem',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {messageContent}
                    </SyntaxHighlighter>
                </div>
            )}
        </div>
    );
};

// Regular code rank message component
const RegularCodeRankMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    // Determine language for syntax highlighting
    const language = message.language || 'javascript';
    
    // Add collapse/expand functionality
    const [isCollapsed, setIsCollapsed] = useState(true);
    
    return (
        <div className="font-mono text-sm bg-gray-850 rounded-lg overflow-hidden border border-gray-700 shadow-md">        
            {/* Header section with gradient background - conditional border bottom */}            
            <div className={`bg-gradient-to-r from-purple-900/70 to-indigo-900/70 px-4 py-3 flex items-center ${!isCollapsed ? 'border-b border-gray-700' : ''}`}>
                <div className="flex-shrink-0 mr-2">
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)} 
                        className="p-0.5 rounded hover:bg-purple-800/50 transition-colors"
                    >
                        {isCollapsed ? (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>                    
                </div>
                <div className="flex-shrink-0 mr-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                </div>
                <div className="text-purple-400 font-semibold">{getMessage('rankedCode') || 'Ranked Code'}</div>
            </div>

            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <>
                    {/* Ranking title section if available */}
                    {message.metadata?.rankTitle && (
                        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            <span className="text-gray-300 font-mono text-xs">{message.metadata.rankTitle}</span>
                        </div>
                    )}

                    {/* Code content section */}
                    <div className="p-0 bg-gray-800/20">
                        <SyntaxHighlighter
                            language={language}
                            style={vscDarkPlus}
                            customStyle={{
                                margin: 0,
                                padding: '1rem',
                                backgroundColor: 'transparent'
                            }}
                            wrapLines={true}
                            wrapLongLines={true}
                        >
                            {message.content}
                        </SyntaxHighlighter>
                    </div>
                </>
            )}
        </div>
    );
};

export default CodeRankMessage;
