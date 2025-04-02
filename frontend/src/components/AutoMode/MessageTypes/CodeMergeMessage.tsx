import React, { useState, useMemo } from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MessageStyles.css';
import eventBus, { EVENTS } from '../../../services/eventBus';

interface CodeMergeContent {
    timestamp: number;
    metadata: Record<string, any>;
    content: string;
    content_type: string;
}

interface CodeMergeMessageProps {
    message: MessageProps;
}

const CodeMergeMessage: React.FC<CodeMergeMessageProps> = ({ message }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Parse the message content as JSON
    const parsedContent = useMemo(() => {
        try {
            const parsed: CodeMergeContent = JSON.parse(message.content);
            return parsed.content || ''; // Return the inner content or empty string if not found
        } catch (error) {
            console.error("Failed to parse CodeMergeMessage content:", error);
            return message.content; // Fallback to original content if parsing fails
        }
    }, [message.content]);

    // Determine language for syntax highlighting
    const language = message.language || 'javascript'; // Assuming default language if not specified

    // 处理最大化按钮点击
    const handleMaximize = () => {
        eventBus.publish(EVENTS.UI.SHOW_MODAL, {
            content: parsedContent, // Use parsed content for modal
            format: 'markdown',
            language: language,
            title: getMessage('unmergedBlocks')
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
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                {/* Info icon */}
                <span className="message-title-icon">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                    </svg>
                </span>
                
                {/* Title */}
                <span className="text-blue-400 message-title-text text-xs">{getMessage('unmergedBlocks') || 'Unmerged Blocks'}</span>
                
                {/* 添加复制和最大化按钮 */}
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(parsedContent); // Copy parsed content
                    }}
                    className="ml-auto message-copy-button text-gray-400 hover:text-blue-400"
                    title={getMessage('copy') || 'Copy'}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                </button>
                <button 
                    onClick={handleMaximize}
                    className="ml-1 message-maximize-button text-gray-400 hover:text-blue-400"
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
                            {parsedContent} {/* Render parsed content */}
                        </SyntaxHighlighter>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeMergeMessage;