import React from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';

interface CommandPrepareMessageProps {
    message: MessageProps;
}

const CommandPrepareMessage: React.FC<CommandPrepareMessageProps> = ({ message }) => {
    return (
        <div className="font-mono text-sm">
            <div className="text-indigo-400 font-semibold mb-1">{getMessage('commandPreparation')}</div>
            <div className="mb-2">
                <span className="text-gray-400">{getMessage('command')}: </span>
                <span className="text-white font-semibold">{message.metadata?.command}</span>
            </div>
            {message.metadata?.parameters && Object.keys(message.metadata.parameters).length > 0 && (
                <div>
                    <div className="text-gray-400 mb-1">{getMessage('parameters')}:</div>
                    <div className="bg-gray-800 p-2 rounded">
                        {Object.entries(message.metadata.parameters).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-[120px_1fr] gap-2 mb-1">
                                <span className="text-indigo-300">{key}:</span>
                                <span className="text-white break-all">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommandPrepareMessage;
