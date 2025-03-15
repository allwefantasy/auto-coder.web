import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  id: string;
  type?: string;
  content: string;
  contentType?: string;
  language?: string;
  isUser?: boolean;
  isThinking?: boolean;
  isStreaming?: boolean;
  metadata?: Record<string, any>;
  options?: string[];
  eventId?: string;
  responseRequired?: boolean;
}

interface MessageListProps {
  messages: MessageProps[];
  onUserResponse: (response: string, eventId?: string) => Promise<void>;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onUserResponse }) => {
  // Function to render message content based on content type
  const renderMessageContent = (message: MessageProps) => {
    // For code content
    if (message.contentType === 'code' && message.language) {
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
    }
    
    // For markdown content
    if (message.contentType === 'markdown') {
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
    }
    
    // For token statistics content
    if (message.contentType === 'token_stat') {
      return (
        <div className="font-mono text-sm">
          <div className="text-indigo-400 font-semibold mb-1">Model Performance Statistics</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {message.metadata && (
              <>
                <div className="text-gray-400">Model:</div>
                <div className="text-white">{message.metadata.model_name}</div>
                
                <div className="text-gray-400">Total Time:</div>
                <div className="text-white">{message.metadata.elapsed_time.toFixed(2)}s</div>
                
                <div className="text-gray-400">First Token Time:</div>
                <div className="text-white">{message.metadata.first_token_time.toFixed(2)}s</div>
                
                <div className="text-gray-400">Input Tokens:</div>
                <div className="text-white">{message.metadata.input_tokens}</div>
                
                <div className="text-gray-400">Output Tokens:</div>
                <div className="text-white">{message.metadata.output_tokens}</div>
                
                <div className="text-gray-400">Input Cost:</div>
                <div className="text-white">${message.metadata.input_cost.toFixed(6)}</div>
                
                <div className="text-gray-400">Output Cost:</div>
                <div className="text-white">${message.metadata.output_cost.toFixed(6)}</div>
                
                <div className="text-gray-400">Speed:</div>
                <div className="text-white">{message.metadata.speed.toFixed(2)} tokens/sec</div>
              </>
            )}
          </div>
        </div>
      );
    }
    
    // For command preparation statistics content
    if (message.contentType === 'command_prepare_stat') {
      return (
        <div className="font-mono text-sm">
          <div className="text-indigo-400 font-semibold mb-1">Command Preparation</div>
          <div className="mb-2">
            <span className="text-gray-400">Command: </span>
            <span className="text-white font-semibold">{message.metadata?.command}</span>
          </div>
          {message.metadata?.parameters && Object.keys(message.metadata.parameters).length > 0 && (
            <div>
              <div className="text-gray-400 mb-1">Parameters:</div>
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
    }
    
    // For command execution statistics content
    if (message.contentType === 'command_execute_stat') {
      return (
        <div className="font-mono text-sm bg-gray-850 rounded-lg overflow-hidden border border-gray-700 shadow-md">
          {/* Header section with gradient background */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-750 px-4 py-3 border-b border-gray-700 flex items-center">
            <div className="flex-shrink-0 mr-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div className="text-indigo-400 font-semibold">Command Execution</div>
          </div>
          
          {/* Command display with subtle background */}
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center">
              <span className="text-gray-400 mr-2">Command:</span>
              <span className="text-white font-semibold font-mono bg-gray-700/50 px-2 py-1 rounded">
                {message.metadata?.command}
              </span>
            </div>
          </div>
          
          {/* Command output with markdown rendering */}
          <div className="p-4 bg-gray-800/30">
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
                          marginTop: '0.5rem',
                          marginBottom: '0.5rem'
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={`${className} bg-gray-700/50 px-1 rounded`} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      );
    }
    
    // For context used content
    if (message.contentType === 'context_used') {
      return (
        <div className="font-mono text-sm bg-gray-850 rounded-lg overflow-hidden border border-gray-700 shadow-md">
          {/* Header section with gradient background */}
          <div className="bg-gradient-to-r from-blue-900/70 to-indigo-900/70 px-4 py-3 border-b border-gray-700 flex items-center">
            <div className="flex-shrink-0 mr-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div className="text-blue-400 font-semibold">Context Used</div>
          </div>
          
          {/* Title section */}
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
            <h3 className="text-white font-medium">{message.metadata?.title}</h3>
          </div>
          
          {/* Files section */}
          {message.metadata?.files && message.metadata.files.length > 0 && (
            <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-700">
              <div className="text-gray-400 text-xs mb-2">Files Referenced:</div>
              <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                {message.metadata.files.map((file: string, index: number) => (
                  <div key={index} className="flex items-center text-xs">
                    <svg className="w-3.5 h-3.5 mr-1.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span className="text-blue-300 font-mono truncate">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Description section */}
          <div className="p-4 bg-gray-800/20">
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
                          marginTop: '0.5rem',
                          marginBottom: '0.5rem'
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={`${className} bg-gray-700/50 px-1 rounded`} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      );
    }
    
    // For completion events
    if (message.type === 'COMPLETION') {
      return (
        <div className="font-mono text-sm">
          <div className="flex items-center text-green-400 font-semibold mb-2">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>任务完成</span>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-md">
            <p className="text-white mb-2">{message.content}</p>
            {message.metadata?.completion_time && (
              <p className="text-gray-400 text-xs">
                完成时间: {new Date(message.metadata.completion_time).toLocaleString()}
              </p>
            )}
            {message.metadata?.details && Object.keys(message.metadata.details).length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-gray-400 text-xs mb-1">详细信息:</p>
                {Object.entries(message.metadata.details).map(([key, value]) => (
                  <div key={key} className="text-xs flex">
                    <span className="text-gray-500 mr-2">{key}:</span>
                    <span className="text-gray-300">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // For thinking or streaming content
    if (message.isThinking || message.isStreaming) {
      return (
        <div className="flex items-center">
          <span className={`${message.isThinking ? 'italic text-gray-400' : 'text-gray-200'} mr-2`}>
            {message.content}
          </span>
          {(message.isThinking || message.isStreaming) && (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
        </div>
      );
    }
    
    // Default text content
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 break-words">
        {message.content}
      </pre>
    );
  };

  return (
    <>
      {messages.map((message, index) => (
        <div 
          key={message.id || index} 
          className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
        >
          {!message.isUser && (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          )}
          <div 
            className={`max-w-[80%] ${message.isUser ? 'bg-indigo-600' : 
              message.type === 'ERROR' ? 'bg-red-900/80' : 
              message.isThinking || message.isStreaming ? 'bg-gray-700/50' : 'bg-gray-700'} 
              rounded-2xl px-4 py-3 ${message.isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}
          >
            {/* Message content based on content type */}
            {renderMessageContent(message)}
            
            {/* Options for ASK_USER type */}
            {message.type === 'ASK_USER' && message.options && message.options.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.options.map((option, i) => (
                  <button
                    key={i}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-full text-sm text-white transition-colors"
                    onClick={() => onUserResponse(option, message.eventId)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          {message.isUser && (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center ml-2 flex-shrink-0">
              <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export default MessageList; 