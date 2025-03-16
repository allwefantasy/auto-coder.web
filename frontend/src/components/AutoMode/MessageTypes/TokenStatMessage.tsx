import React from 'react';
import type { MessageProps } from '../MessageList';

interface TokenStatMessageProps {
    message: MessageProps;
}

const TokenStatMessage: React.FC<TokenStatMessageProps> = ({ message }) => {
    return (
        <div className="font-mono text-xs text-gray-400 flex flex-row items-center gap-2">
            {message.metadata && (
                <>
                    <div className="flex items-center">
                        <span>Tokens: </span>
                        <span className="text-green-500 ml-1">↑ {message.metadata.input_tokens}</span>
                        <span className="text-red-500 ml-1">↓ {message.metadata.output_tokens}</span>
                    </div>
                    <div className="flex items-center">
                        <span>Cache: </span>
                        <span className="text-white ml-1">⊕ {message.metadata.cache_hit || 0}</span>
                        <span className="text-white ml-1">→ {message.metadata.cache_miss || 0}</span>
                    </div>
                    <div className="flex items-center">
                        <span>Context Window: </span>
                        <span className="text-white ml-1">{message.metadata.context_window || 0}k</span>
                        <div className="w-64 h-2 bg-gray-700 rounded ml-1">
                            <div 
                                className="h-full bg-blue-500 rounded" 
                                style={{ width: `${Math.min(100, (message.metadata.context_window || 0) / (message.metadata.max_context_window || 100) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span>API Cost: </span>
                        <span className="text-white ml-1">${(message.metadata.input_cost + message.metadata.output_cost).toFixed(5)}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default TokenStatMessage;
