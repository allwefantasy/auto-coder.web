import React from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';

interface CompletionMessageProps {
    message: MessageProps;
}

const CompletionMessage: React.FC<CompletionMessageProps> = ({ message }) => {
    return (
        <div className="font-mono text-sm">
            <div className="flex items-center text-green-400 font-semibold mb-2">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{getMessage('jobCompleted')}</span>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-md">
                <p className="text-white mb-2">{message.content}</p>
                {message.metadata?.completion_time && (
                    <p className="text-gray-400 text-xs">
                        {getMessage('completionTime')}: {new Date(message.metadata.completion_time).toLocaleString()}
                    </p>
                )}
                {message.metadata?.details && Object.keys(message.metadata.details).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-gray-400 text-xs mb-1">{getMessage('settingsTitle')}:</p>
                        {Object.entries(message.metadata.details).map(([key, value]) => (
                            <div key={key} className="text-xs flex">
                                <span className="text-gray-500 mr-2">{key}:</span>
                                <span className="text-gray-300">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompletionMessage;
