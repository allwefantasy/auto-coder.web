import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeGenerateMessageProps {
    message: MessageProps;
}

// Main component that selects the appropriate subcomponent based on message type
const CodeGenerateMessage: React.FC<CodeGenerateMessageProps> = ({ message }) => {
    // Check if this is a streaming message
    const isStreamingMessage = message.type === "STREAM" && message.metadata?.stream_out_type === "code_generate";
    
    // Check if streaming is complete
    const isCompletedStream = isStreamingMessage && !message.isStreaming;

    if (isStreamingMessage) {
        return <StreamingCodeGenerateMessage message={message} isCompleted={isCompletedStream} />;
    } else {
        return <RegularCodeGenerateMessage message={message} />;
    }
};

// Streaming code generation message component with collapse/expand functionality
const StreamingCodeGenerateMessage: React.FC<{ message: MessageProps; isCompleted: boolean }> = ({ message, isCompleted }) => {
    const [isCollapsed, setIsCollapsed] = useState(isCompleted);

    // Format message content - truncate if too long
    const messageContent = message.content || '';
    const contentLines = messageContent.split('\n');
    const previewLines = 5; // Number of preview lines
    
    // Content to show when collapsed
    const collapsedContent = contentLines.length > previewLines
        ? contentLines.slice(0, previewLines).join('\n') + '...'
        : messageContent;
    
    // Determine language for syntax highlighting
    const language = message.language || 'javascript';
    
    return (
        <div className="font-mono text-sm">
            <div className={`flex items-center ${message.isStreaming ? 'text-yellow-400' : 'text-green-400'} font-semibold mb-2`}>
                {/* Toggle button for collapse/expand when message is complete and content exceeds preview lines */}
                {isCompleted && contentLines.length > previewLines && (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path>
                        </svg>
                    )}                    
                </span>                                
                <span>{message.isStreaming ? getMessage('generatingCode') || 'Generating code...' : getMessage('codeGenerationComplete') || 'Code generation complete'}</span>
            </div>
            
            {/* Message content with syntax highlighting */}
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
                    {isCollapsed ? collapsedContent : messageContent}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

// Regular code generation message component
const RegularCodeGenerateMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    // Determine language for syntax highlighting
    const language = message.language || 'javascript';
    
    return (
        <div className="font-mono text-sm bg-gray-850 rounded-lg overflow-hidden border border-gray-700 shadow-md">
            {/* Header section with gradient background */}            
            <div className="bg-gradient-to-r from-green-900/70 to-teal-900/70 px-4 py-3 border-b border-gray-700 flex items-center">
                <div className="flex-shrink-0 mr-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                    </svg>
                </div>
                <div className="text-green-400 font-semibold">{getMessage('generatedCode') || 'Generated Code'}</div>
            </div>

            {/* File name section if available */}
            {message.metadata?.fileName && (
                <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span className="text-gray-300 font-mono text-xs">{message.metadata.fileName}</span>
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
        </div>
    );
};

export default CodeGenerateMessage;
