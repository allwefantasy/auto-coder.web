import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MessageProps } from '../MessageList';

interface CodeMessageProps {
    message: MessageProps;
}

const CodeMessage: React.FC<CodeMessageProps> = ({ message }) => {
    return (
        <div className="rounded-md overflow-hidden">
            <SyntaxHighlighter
                language={message.language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1rem', borderRadius: '0.375rem' }}
            >
                {message.content}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeMessage;
