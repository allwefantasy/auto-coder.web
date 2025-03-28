import React, { useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import MonacoEditor from '../Editor/components/MonacoEditor/MonacoEditor';

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  format: 'markdown' | 'monaco';
  language?: string;
  title?: string;
}

const ModalDialog: React.FC<ModalDialogProps> = ({ 
  isOpen, 
  onClose, 
  content, 
  format, 
  language = 'javascript',
  title = '内容预览'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div 
        ref={modalRef}
        className="bg-gray-900 rounded-lg shadow-xl w-4/5 h-4/5 max-w-6xl flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {format === 'markdown' ? (
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
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="h-full">
              <MonacoEditor 
                code={content} 
                language={language} 
                onChange={() => {}} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDialog; 