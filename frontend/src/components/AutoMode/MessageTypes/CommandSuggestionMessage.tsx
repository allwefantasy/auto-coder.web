import React from 'react';
import { MessageProps } from '../MessageList';

interface CommandSuggestionMessageProps {
    message: MessageProps;
}

const CommandSuggestionMessage: React.FC<CommandSuggestionMessageProps> = ({ message }) => {
    return (
        <div className="font-mono text-sm">
            <div className="flex items-center text-green-400 font-semibold mb-2">
                <span>==={message.content}</span>
            </div>
        </div>
    );
};

export default CommandSuggestionMessage;
