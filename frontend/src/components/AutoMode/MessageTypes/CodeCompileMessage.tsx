import React, { useState, useMemo } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MessageStyles.css';
import eventBus, { EVENTS } from '../../../services/eventBus';

interface CodeCompileMessageProps {
    message: MessageProps;
}

// Main component that selects the appropriate subcomponent based on message type
const CodeCompileMessage: React.FC<CodeCompileMessageProps> = ({ message }) => {
    // Check if this is a streaming message
    const isStreamingMessage = message.type === "STREAM" && message.metadata?.stream_out_type === "compile";

    // Check if streaming is complete
    const isCompletedStream = isStreamingMessage && !message.isStreaming;

    if (isStreamingMessage) {
        return <StreamingCodeCompileMessage message={message} isCompleted={isCompletedStream} />;
    } else {
        // For non-streaming or already completed messages, display with full features
        return <RegularCodeCompileMessage message={message} />;
    }
};

// Streaming compile message component
const StreamingCodeCompileMessage: React.FC<{ message: MessageProps; isCompleted: boolean }> = ({ message, isCompleted }) => {
    const [isCollapsed, setIsCollapsed] = useState(isCompleted); // Collapse completed streams by default    
    // Format message content
    const messageContent = message.content || '';
    const contentLines = messageContent.split('\n');
    const previewLines = 5; // Number of preview lines

    return (
        <div className="message-font">
            <div className="message-title">
                {/* Toggle button for collapse/expand when message is complete and content exceeds preview lines */}
                {isCompleted && contentLines.length > previewLines && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="message-toggle-button"
                    >
                        {isCollapsed ? (
                            <svg className="message-toggle-icon text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="message-toggle-icon text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Status indicator */}
                <span className="message-title-icon">
                    {message.isStreaming ? (
                        <svg className="animate-spin w-3.5 h-3.5 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        // Terminal icon for compile results
                        <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    )}
                </span>

                <span className="text-orange-400 message-title-text text-xs">
                    {message.isStreaming ? getMessage('analyzingCompile') || 'Analyzing Compile...' : getMessage('compileResults') || 'Compile Results'}
                </span>
            </div>

            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container border border-gray-800">
                    <div className="p-2 whitespace-pre-wrap text-xs">
                        {messageContent}
                    </div>
                </div>
            )}
        </div>
    );
};


// Regular compile message component (for non-streaming or completed messages)
const RegularCodeCompileMessage: React.FC<{ message: MessageProps }> = ({ message }) => {
    const [isCollapsed, setIsCollapsed] = useState(false); // Start expanded

    // Parse the message content if it's JSON, otherwise use as is
    const parsedContent = useMemo(() => {
        try {
            // Assuming the actual content might be nested within a JSON structure
            const parsed = JSON.parse(message.content);
            return parsed.content || message.content; // Use inner content or fallback
        } catch (error) {
            return message.content; // Fallback to original content if not JSON or parsing fails
        }
    }, [message.content]);
    

    // Determine language for syntax highlighting (use 'bash' or 'plaintext' for terminal output)
    const language = 'bash'; // Or determine based on metadata if available

    // Handle maximize button click
    const handleMaximize = () => {
        eventBus.publish(EVENTS.UI.SHOW_MODAL, {
            content: parsedContent,
            format: 'plaintext', // Or 'bash'
            language: language,
            title: getMessage('compileResults')
        });
    };

    return (
        <div className="message-font">
            <div className="message-title">
                {/* Toggle button for collapse/expand */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="message-toggle-button"
                >
                    {isCollapsed ? (
                        <svg className="message-toggle-icon text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>

                {/* Terminal icon */}
                <span className="message-title-icon">
                     <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                     </svg>
                </span>

                {/* Title */}
                <span className="text-orange-400 message-title-text text-xs">{getMessage('compileResults') || 'Compile Results'}</span>

                {/* Copy and Maximize buttons */}
                <button
                    onClick={() => navigator.clipboard.writeText(parsedContent)}
                    className="ml-auto message-copy-button text-gray-400 hover:text-orange-400"
                    title={getMessage('copy') || 'Copy'}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                </button>
                <button
                    onClick={handleMaximize}
                    className="ml-1 message-maximize-button text-gray-400 hover:text-orange-400"
                    title={getMessage('maximize') || 'Maximize'}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                </button>
            </div>

            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container border border-gray-800">
                    <div className="p-0 bg-gray-800/20">
                        <SyntaxHighlighter
                            language={language}
                            style={vscDarkPlus}
                            customStyle={{
                                margin: 0,
                                padding: '0.25rem',
                                backgroundColor: 'transparent',
                                fontSize: '0.75rem'
                            }}
                            wrapLines={true}
                            wrapLongLines={true}
                        >
                            {parsedContent}
                        </SyntaxHighlighter>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeCompileMessage;