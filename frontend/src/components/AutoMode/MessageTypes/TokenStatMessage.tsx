import React, { useState, useEffect, useRef } from 'react';
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
    
    // Ref for container element to measure width
    const containerRef = useRef<HTMLDivElement>(null);
    // State to track if we have enough width for progress bar
    const [showProgressBar, setShowProgressBar] = useState(true);

    // Function to check container width and determine display mode
    const checkWidth = () => {
        if (containerRef.current) {
            // If container width is less than 500px, switch to compact mode
            setShowProgressBar(containerRef.current.offsetWidth > 500);
        }
    };

    // Set up resize observer to monitor container width changes
    useEffect(() => {
        checkWidth(); // Check initial width
        
        // Set up resize observer
        const resizeObserver = new ResizeObserver(() => {
            checkWidth();
        });
        
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        
        // Clean up
        return () => {
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
        };
    }, []);
    
    return (
        <div ref={containerRef} className="font-mono text-[11px] text-gray-400 flex flex-row items-center gap-2 flex-wrap">
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
                        {showProgressBar ? (
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
                        ) : (
                            <span className="text-blue-400 ml-1">{usagePercentage.toFixed(1)}%</span>
                        )}
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
