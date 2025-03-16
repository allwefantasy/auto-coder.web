import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../MessageList';

interface MarkdownMessageProps {
    message: MessageProps;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ message }) => {
    return (
        <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
                className="text-gray-200 break-words"
                components={{
                    code: ({ className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const inline = !match;
                        return !inline ? (
                            <SyntaxHighlighter
                                language={match ? match[1] : ''}
                                style={vscDarkPlus}
                                PreTag="div"
                                wrapLines={true}
                                wrapLongLines={true}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {message.content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownMessage;
