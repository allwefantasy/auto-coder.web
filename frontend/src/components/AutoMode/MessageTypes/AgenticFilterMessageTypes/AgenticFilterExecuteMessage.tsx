import React, { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import type { MessageProps } from '../../MessageList';
import { getMessage } from '../../../Sidebar/lang';
import { parseFilesFromText, ParsedFile } from '../fileParsingUtils';
import ExpandableEditor from '../../ExpandableEditor';
import '../MessageStyles.css';

interface AgenticFilterExecuteMessageProps {
    message: MessageProps;
}

const AgenticFilterExecuteMessage: React.FC<AgenticFilterExecuteMessageProps> = ({ message }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
    const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
    const [editorContent, setEditorContent] = useState<string>('');

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        
        // Parse files when expanding if it's a read_files command
        if (!isExpanded && message.metadata?.command === 'read_files' && message.content) {
            const files = parseFilesFromText(message.content);
            setParsedFiles(files);
        }
    };
    
    const handleFileSelect = (index: number) => {
        if (selectedFileIndex === index) {
            setSelectedFileIndex(null); // Collapse if already selected
        } else {
            setSelectedFileIndex(index);
            setEditorContent(parsedFiles[index].content);
        }
    };
    
    const handleEditorReady = useCallback((editor: any, monaco: any) => {
        // Configure editor if needed
    }, []);
    
    const handleContentChange = useCallback((content: string | undefined) => {
        if (content !== undefined) {
            setEditorContent(content);
        }
    }, []);
    
    const handleSubmit = useCallback(() => {
        // Not needed for read-only display
    }, []);

    return (
        <div className="message-font message-content-container">
            {/* Header section with gradient background */}
            <div 
                className="bg-gradient-to-r from-gray-800 to-gray-750 px-4 py-3 border-b border-gray-700 flex items-center justify-between cursor-pointer"
                onClick={toggleExpand}
            >
                <div className="flex items-center">
                    <span className="message-title-icon">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </span>
                    <span className="text-indigo-400 message-title-text">{getMessage('agenticFilterCommandResult',{command:message.metadata?.command})}</span>
                </div>
                <div className="text-gray-400">
                    <svg 
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>            

            {/* Command output with markdown rendering or file display - collapsible */}
            {isExpanded && (
                <div className="p-4 bg-gray-800/30">
                    {message.metadata?.command === 'read_files' ? (
                        <div className="text-gray-200">
                            {/* File list */}
                            <div className="mb-4">
                                <h3 className="font-medium text-gray-300 mb-2">{getMessage('files')}:</h3>
                                <div className="space-y-1">
                                    {parsedFiles.map((file, index) => (
                                        <div 
                                            key={index}
                                            className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-700/50 ${selectedFileIndex === index ? 'bg-gray-700/70 border-l-2 border-indigo-500' : ''}`}
                                            onClick={() => handleFileSelect(index)}
                                        >
                                            <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <span className="truncate">{file.file}</span>
                                            <svg 
                                                className={`w-4 h-4 ml-auto transition-transform duration-200 ${selectedFileIndex === index ? 'transform rotate-180' : ''}`}
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24" 
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* File content editor */}
                            {selectedFileIndex !== null && (
                                <div className="border border-gray-700 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                                    <ExpandableEditor
                                        initialContent={parsedFiles[selectedFileIndex].content}
                                        onContentChange={handleContentChange}
                                        onEditorReady={handleEditorReady}
                                        onSubmit={handleSubmit}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
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
                                                customStyle={{
                                                    borderRadius: '0.375rem',
                                                    fontSize: '14px'
                                                }}
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
                    )}
                </div>
            )}
        </div>
    );
};

export default AgenticFilterExecuteMessage;
