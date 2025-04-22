import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../Sidebar/lang';
import './MessageStyles.css';
import eventBus, { EVENTS } from '../../../services/eventBus';

interface MarkdownMessageProps {
    message: MessageProps;
}

// 为了类型安全，定义代码块组件的props类型
interface CodeProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ message }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // 处理最大化按钮点击
    const handleMaximize = () => {
        eventBus.publish(EVENTS.UI.SHOW_MODAL, {
            content: message.content,
            format: 'markdown',
            title: getMessage('markdown') || 'Markdown'
        });
    };
    
    return (
        <div className="message-font">
            <div className="message-title">
                {/* Toggle button for collapse/expand */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="message-toggle-button"
                >
                    {isCollapsed ? (
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                
                <span className="message-title-icon">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </span>
                <span className="text-blue-400 message-title-text">{getMessage('markdown') || 'Markdown'}</span>
                
                {/* 添加复制和最大化按钮 */}
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        // 可选：添加复制成功的提示
                    }}
                    className="ml-auto message-copy-button text-gray-400 hover:text-blue-400"
                    title={getMessage('copy') || 'Copy'}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                </button>
                <button 
                    onClick={handleMaximize}
                    className="ml-1 message-maximize-button text-gray-400 hover:text-blue-400"
                    title={getMessage('maximize') || 'Maximize'}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                </button>
            </div>
            
            {!isCollapsed && (
                <div className="markdown-content prose prose-invert prose-xs max-w-full break-words overflow-auto scrollbar-thin scrollbar-thumb-gray-600" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>                    
                    <ReactMarkdown
                        className="markdown-body text-gray-200 break-words"
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code: ({ className, children, inline, ...props }: CodeProps) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const language = match ? match[1] : '';
                                
                                return !inline ? (
                                    children && String(children).trim() ? (
                                        <div className="markdown-code-wrapper">
                                            <SyntaxHighlighter
                                                language={language}
                                                style={vscDarkPlus}
                                                PreTag="div"
                                                wrapLines={true}
                                                wrapLongLines={true}
                                                className="markdown-code-block"
                                                customStyle={{
                                                    margin: '0',
                                                    borderRadius: '0 0 6px 6px',
                                                    padding: '16px',
                                                    backgroundColor: 'rgba(30, 41, 59, 0.8)'
                                                }}
                                                // 添加语言标签的数据属性
                                                codeTagProps={{
                                                    'data-language': language || 'text'
                                                }}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                            {/* 显示语言标签 */}
                                            {language && (
                                                <div className="code-language-tag">
                                                    {language}
                                                </div>
                                            )}
                                        </div>
                                    ) : null
                                ) : (
                                    <code className={`markdown-inline-code ${className || ''}`} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                            // 使用CSS类名而不是内联自定义组件来定义表格样式
                            table: ({ node, ...props }) => (
                                <div className="markdown-table-container overflow-auto">
                                    <table className="markdown-table" {...props} />
                                </div>
                            ),
                            th: ({ node, ...props }) => (
                                <th className="markdown-th" {...props} />
                            ),
                            td: ({ node, ...props }) => (
                                <td className="markdown-td" {...props} />
                            ),
                            // 添加其他元素的样式
                            p: ({ node, ...props }) => (
                                <p className="markdown-paragraph" {...props} />
                            ),
                            a: ({ node, ...props }) => (
                                <a className="markdown-link" target="_blank" rel="noopener noreferrer" {...props} />
                            ),
                            blockquote: ({ node, ...props }) => (
                                <blockquote className="markdown-blockquote" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                                <ul className="markdown-list markdown-ul" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                                <ol className="markdown-list markdown-ol" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                                <li className="markdown-list-item" {...props} />
                            ),
                            h1: ({ node, ...props }) => (
                                <h1 className="markdown-heading markdown-h1" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                                <h2 className="markdown-heading markdown-h2" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                                <h3 className="markdown-heading markdown-h3" {...props} />
                            ),
                            h4: ({ node, ...props }) => (
                                <h4 className="markdown-heading markdown-h4" {...props} />
                            ),
                            h5: ({ node, ...props }) => (
                                <h5 className="markdown-heading markdown-h5" {...props} />
                            ),
                            h6: ({ node, ...props }) => (
                                <h6 className="markdown-heading markdown-h6" {...props} />
                            ),
                            hr: ({ node, ...props }) => (
                                <hr className="markdown-hr" {...props} />
                            ),
                            img: ({ node, ...props }) => (
                                <img className="markdown-img" {...props} />
                            )
                        }}
                    >
                        {message.content || ''}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
};

export default MarkdownMessage;
