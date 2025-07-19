import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../../lang';
import './MessageStyles.css';

interface ContextUsedMessageProps {
    message: MessageProps;
}

// 为了类型安全，定义代码块组件的props类型
interface CodeProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
}

// 定义通用组件Props类型
interface MarkdownComponentProps {
    node?: any;
    children?: React.ReactNode;
    [key: string]: any;
}

const ContextUsedMessage: React.FC<ContextUsedMessageProps> = ({ message }) => {
    // Initialize collapsed state to false (expanded by default)
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // 获取折叠/展开图标
    const getToggleIcon = () => {
        if (isCollapsed) {
            return (
                <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            );
        }
        
        return (
            <svg className="message-toggle-icon text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
        );
    };
    
    // 定义Markdown渲染组件，紧凑型
    const markdownComponents = {
        // 代码块渲染
        code: ({ className, children, ...props }: CodeProps) => {            
            // 提取语言            
            const match = /language-(\w+)/.exec(className || '');
            //没有提取到语言，则认为是内联代码
            const inline = !match;
            let language = match ? match[1] : '';
            
            // 处理内联代码
            if (inline) {
                return (
                    <code className={`markdown-inline-code ${className || ''}`} {...props}>
                        {children}
                    </code>
                );
            }
            
            // 处理代码块
            if (!children) {
                return null;
            }
            
            const content = String(children);
            if (!content.trim()) {
                return null;
            }
            
            return (
                <div className="markdown-code-wrapper" style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                    <SyntaxHighlighter
                        language={language}
                        style={vscDarkPlus}
                        PreTag="div"
                        wrapLines={true}
                        wrapLongLines={true}
                        customStyle={{
                            margin: 0,
                            padding: '0.5rem',
                            fontSize: '0.8rem'
                        }}
                    >
                        {content.replace(/\n$/, '')}
                    </SyntaxHighlighter>
                    
                    {/* 显示语言标签 */}
                    {language && (
                        <div className="code-language-tag" style={{ padding: '0 0.25rem', fontSize: '0.7rem' }}>
                            {language}
                        </div>
                    )}
                </div>
            );
        },
        
        // 表格相关组件 - 紧凑型
        table: ({ ...props }: MarkdownComponentProps) => (
            <div className="markdown-table-container overflow-auto" style={{ margin: '0.25rem 0' }}>
                <table className="markdown-table" style={{ fontSize: '0.8rem' }} {...props} />
            </div>
        ),
        th: ({ ...props }: MarkdownComponentProps) => <th className="markdown-th" style={{ padding: '0.25rem' }} {...props} />,
        td: ({ ...props }: MarkdownComponentProps) => <td className="markdown-td" style={{ padding: '0.25rem' }} {...props} />,
        
        // 文本和段落组件 - 紧凑型
        p: ({ ...props }: MarkdownComponentProps) => <p className="markdown-paragraph" style={{ margin: '0.25rem 0' }} {...props} />,
        a: ({ ...props }: MarkdownComponentProps) => (
            <a className="markdown-link" target="_blank" rel="noopener noreferrer" {...props} />
        ),
        blockquote: ({ ...props }: MarkdownComponentProps) => (
            <blockquote className="markdown-blockquote" style={{ margin: '0.25rem 0', padding: '0.25rem 0.5rem' }} {...props} />
        ),
        
        // 列表相关组件 - 紧凑型
        ul: ({ ...props }: MarkdownComponentProps) => <ul className="markdown-list markdown-ul" style={{ margin: '0.25rem 0', paddingLeft: '1rem' }} {...props} />,
        ol: ({ ...props }: MarkdownComponentProps) => <ol className="markdown-list markdown-ol" style={{ margin: '0.25rem 0', paddingLeft: '1rem' }} {...props} />,
        li: ({ ...props }: MarkdownComponentProps) => <li className="markdown-list-item" style={{ margin: '0.125rem 0' }} {...props} />,
        
        // 标题组件 - 紧凑型
        h1: ({ ...props }: MarkdownComponentProps) => <h1 className="markdown-heading markdown-h1" style={{ margin: '0.5rem 0', fontSize: '1.1rem' }} {...props} />,
        h2: ({ ...props }: MarkdownComponentProps) => <h2 className="markdown-heading markdown-h2" style={{ margin: '0.5rem 0', fontSize: '1rem' }} {...props} />,
        h3: ({ ...props }: MarkdownComponentProps) => <h3 className="markdown-heading markdown-h3" style={{ margin: '0.4rem 0', fontSize: '0.95rem' }} {...props} />,
        h4: ({ ...props }: MarkdownComponentProps) => <h4 className="markdown-heading markdown-h4" style={{ margin: '0.3rem 0', fontSize: '0.9rem' }} {...props} />,
        h5: ({ ...props }: MarkdownComponentProps) => <h5 className="markdown-heading markdown-h5" style={{ margin: '0.2rem 0', fontSize: '0.85rem' }} {...props} />,
        h6: ({ ...props }: MarkdownComponentProps) => <h6 className="markdown-heading markdown-h6" style={{ margin: '0.1rem 0', fontSize: '0.8rem' }} {...props} />,
        
        // 其他元素
        hr: ({ ...props }: MarkdownComponentProps) => <hr className="markdown-hr" style={{ margin: '0.25rem 0' }} {...props} />,
        img: ({ ...props }: MarkdownComponentProps) => <img className="markdown-img" style={{ maxHeight: '200px' }} {...props} />
    };
    
    return (
        <div className="message-font" style={{ fontSize: '0.85rem' }}>
            {/* Header section with simple style */}            
            <div className="message-title" style={{ padding: '0.1rem 0' }}>
                {/* Toggle button for collapse/expand */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="message-toggle-button"
                >
                    {getToggleIcon()}
                </button>
                
                {/* Info icon */}
                <span className="message-title-icon">
                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </span>
                
                {/* Title */}
                <span className="text-blue-400 message-title-text">{getMessage('contextUsed')}</span>
            </div>

            {/* Only show content when not collapsed */}
            {!isCollapsed && (
                <div className="message-content-container border border-gray-800" style={{ margin: '0.1rem 0' }}>
                    {/* Title section */}
                    {message.metadata?.title && (
                        <div className="px-1 py-0.5 bg-gray-800/50 border-b border-gray-800">
                            <h3 className="text-white font-medium text-sm">{message.metadata?.title}</h3>
                        </div>
                    )}

                    {/* Files section */}
                    {message.metadata?.files && message.metadata.files.length > 0 && (
                        <div className="px-1 py-0.5 bg-gray-800/30 border-b border-gray-800">                            
                            <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                                <div className="flex flex-wrap gap-0.5 max-h-[60px] overflow-y-auto">
                                    {message.metadata.files.map((file: string, index: number) => (
                                        <div key={index} className="flex items-center mr-1 my-0.5">
                                            <svg className="w-1.5 h-1.5 mr-0.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <span className="text-blue-300 font-mono whitespace-nowrap text-[0.65rem] leading-tight">{file}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description section */}
                    <div className="p-1 bg-gray-800/20">
                        <div className="markdown-content prose prose-invert prose-xs max-w-full break-words overflow-auto scrollbar-thin scrollbar-thumb-gray-600" style={{ 
                            wordBreak: 'break-word', 
                            overflowWrap: 'break-word',
                            fontSize: '0.8rem', 
                            maxHeight: '300px'
                        }}>
                            <ReactMarkdown
                                className="markdown-body text-gray-200 break-words"
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextUsedMessage;
