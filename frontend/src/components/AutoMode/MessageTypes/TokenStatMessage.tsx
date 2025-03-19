import React from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';

interface TokenStatMessageProps {
    message: MessageProps;
}

const TokenStatMessage: React.FC<TokenStatMessageProps> = ({ message }) => {
    // Default max context window to 64k if not provided
    const maxContextWindow = message.metadata?.max_context_window || 64*1024;
    
    // Calculate total tokens used (input + output)
    const totalTokensUsed = (message.metadata?.input_tokens || 0) + (message.metadata?.output_tokens || 0);
    
    // Calculate percentage of context window used
    const usagePercentage = Math.min(100, (totalTokensUsed / maxContextWindow) * 100);
    
    return (
        <div className="font-mono text-[11px] text-gray-400 flex flex-row items-center gap-2">
            {message.metadata && (
                <>
                    <div className="flex items-center">
                        <span>{getMessage('tokens')}: </span>
                        <span className="text-green-500 ml-1">↑ {message.metadata.input_tokens}</span>
                        <span className="text-red-500 ml-1">↓ {message.metadata.output_tokens}</span>
                    </div>
                    <div className="flex items-center">
                        <span>{getMessage('cache')}: </span>
                        <span className="text-white ml-1">⊕ {message.metadata.cache_hit || 0}</span>
                        <span className="text-white ml-1">→ {message.metadata.cache_miss || 0}</span>
                    </div>
                    <div className="flex items-center">
                        <span>{getMessage('contextWindow')}: </span>                        
                        <div className="relative w-28 h-2 bg-gray-800 rounded ml-1 border border-gray-600">
                            <div 
                                className="h-full bg-blue-600 rounded-l" 
                                style={{ width: `${usagePercentage}%` }}
                            ></div>
                            {usagePercentage > 10 && (
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white">
                                    {usagePercentage.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span>{getMessage('apiCost')}: </span>
                        <span className="text-white ml-1">${(message.metadata.input_cost + message.metadata.output_cost).toFixed(5)}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default TokenStatMessage;
