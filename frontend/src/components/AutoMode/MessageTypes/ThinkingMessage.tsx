import React from 'react';
import { MessageProps } from '../MessageList';

interface ThinkingMessageProps {
    message: MessageProps;
}

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ message }) => {
    return (
        <div className="flex items-center">
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
        </div>
    );
};

export default ThinkingMessage;
