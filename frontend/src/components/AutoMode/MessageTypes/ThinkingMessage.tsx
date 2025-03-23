import React, { useState, useEffect } from 'react';
import { MessageProps } from '../MessageList';

interface ThinkingMessageProps {
    message: MessageProps;
}

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ message }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // When thinking completes, automatically collapse the message
    useEffect(() => {
        if (!message.isThinking && !message.isStreaming) {
            setIsCollapsed(true);
        }
    }, [message.isThinking, message.isStreaming]);
    
    return (
        <div className="flex items-center">
            {/* Collapse/expand button - only show when thinking is complete */}
            {(!message.isThinking && !message.isStreaming) && (
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="mr-2 p-0.5 rounded hover:bg-gray-700 transition-colors text-gray-400"
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
            
            {/* Show content only if not collapsed or thinking is in progress */}
            {(!isCollapsed || message.isThinking || message.isStreaming) && (
                <>
                    <span className={`${message.isThinking ? 'italic text-gray-400' : 'text-gray-200'} mr-2 text-xs`}>
                        {message.content}
                    </span>
                    {(message.isThinking || message.isStreaming) && (
                        <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ThinkingMessage;
