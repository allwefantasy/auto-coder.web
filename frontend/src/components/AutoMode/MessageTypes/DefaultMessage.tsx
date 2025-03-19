import React from 'react';
import { MessageProps } from '../MessageList';

interface DefaultMessageProps {
    message: MessageProps;
}

const DefaultMessage: React.FC<DefaultMessageProps> = ({ message }) => {
    return (
        <pre className="whitespace-pre-wrap font-sans text-xs text-gray-200 break-words">
            {message.content}                
        </pre>
    );
};

export default DefaultMessage;
