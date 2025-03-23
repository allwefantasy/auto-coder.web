import React from 'react';
import { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';

interface DefaultMessageProps {
    message: MessageProps;
}

const DefaultMessage: React.FC<DefaultMessageProps> = ({ message }) => {
    return (
        <div className="message-font">
            <div className="message-title">
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                    </svg>
                </span>
                <span className="text-gray-400 message-title-text">{getMessage('message') || 'Message'}</span>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-gray-200 break-words">
                {message.content}                
            </pre>
        </div>
    );
};

export default DefaultMessage;
