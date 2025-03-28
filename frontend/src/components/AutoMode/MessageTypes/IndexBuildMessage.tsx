import React, { useState, useEffect, useRef } from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';

interface IndexBuildMessageProps {
    message: MessageProps;
}

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

    // Calculate progress percentage based on which data format is available
    const calculateProgress = () => {
        if (message.metadata?.file_number !== undefined && message.metadata?.total_files) {
            return (message.metadata.file_number / message.metadata.total_files) * 100;
        } else if (message.metadata?.updated_files !== undefined && 
                  (message.metadata?.updated_files + message.metadata?.removed_files) > 0) {
            // Simple ratio of updated to total changes (updated + removed)
            const totalChanges = message.metadata.updated_files + message.metadata.removed_files;
            return (message.metadata.updated_files / totalChanges) * 100;
        }
        return 0;
    };

    const progressPercentage = calculateProgress();    
    return (
        <div ref={containerRef} className="font-mono text-[11px] text-gray-400 flex flex-row items-center gap-2 flex-wrap">            
            {message.metadata && (
                <>                
                    {/* First data format: file_number and total_files */}
                    {message.metadata.file_number !== undefined && message.metadata.total_files !== undefined && (
                        <div className="flex items-center">                            
                            <span>{getMessage('indexingFiles')}: </span>
                            <span className="text-blue-500 ml-1">
                                {message.metadata.file_number}/{message.metadata.total_files}
                            </span>
                        </div>
                    )}

                    {/* Second data format: detailed metrics */}
                    {message.metadata.updated_files !== undefined && (
                        <>
                            <div className="flex items-center">
                                <span>{getMessage('updatedFiles')}: </span>
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
                                ${(message.metadata.input_cost + message.metadata.output_cost).toFixed(5)}
                            </span>
                        </div>
                    )}

                    {/* Progress bar */}
                    {progressPercentage > 0 && (
                        <div className="flex items-center">
                            <span>{getMessage('indexProgress')}: </span>
                            {showProgressBar ? (
                                <div className="relative w-28 h-2 bg-gray-800 rounded ml-1 border border-gray-600">
                                    <div 
                                        className="h-full bg-blue-600 rounded-l" 
                                        style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                    {progressPercentage > 10 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white">
                                            {progressPercentage.toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-blue-400 ml-1">{progressPercentage.toFixed(1)}%</span>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default IndexBuildMessage; 