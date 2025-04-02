import React, { useState, useEffect, useRef } from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import { formatNumberToFixed } from '../../../utils/formatUtils';

interface IndexBuildMessageProps {
    message: MessageProps;
}

// Helper function to format API cost
const formatApiCost = (inputCost?: number, outputCost?: number, precision: number = 5): string => {
    if (inputCost === undefined || outputCost === undefined) {
        return '$0.00000'; // Or some default/error value
    }
    const totalCost = inputCost + outputCost;
    return `$${formatNumberToFixed(totalCost, precision)}`;
};

const IndexBuildMessage: React.FC<IndexBuildMessageProps> = ({ message }) => {
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
                    {/* First data format: file_number and total_files */}
                    {message.metadata.file_number !== undefined && message.metadata.total_files !== undefined && (
                        <div className="flex items-center">                            
                            <span>{getMessage('indexingFiles', { file_number: message.metadata.file_number, file_increment: Number(formatNumberToFixed(message.metadata.file_number/message.metadata.total_files*100))})}%  </span>                            
                        </div>
                    )}

                    {/* Second data format: detailed metrics */}
                    {message.metadata.updated_files !== undefined && (
                        <>
                            <div className="flex items-center">                            
                                <span className="text-green-500 ml-1">{message.metadata.updated_files}</span>
                            </div>
                            <div className="flex items-center">
                                <span>{getMessage('removedFiles')}: </span>
                                <span className="text-red-500 ml-1">{message.metadata.removed_files}</span>
                            </div>
                        </>
                    )}

                    {/* Show token info if available */}
                    {message.metadata.input_tokens !== undefined && (
                        <div className="flex items-center">
                            <span>{getMessage('tokens')}: </span>
                            <span className="text-green-500 ml-1">↑ {message.metadata.input_tokens}</span>
                            <span className="text-red-500 ml-1">↓ {message.metadata.output_tokens}</span>
                        </div>
                    )}

                    {/* Show cost info if available */}
                    {message.metadata.input_cost !== undefined && (
                        <div className="flex items-center">
                            <span>{getMessage('apiCost')}: </span>
                            <span className="text-white ml-1">
                                {formatApiCost(message.metadata.input_cost, message.metadata.output_cost, 5)}
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default IndexBuildMessage; 