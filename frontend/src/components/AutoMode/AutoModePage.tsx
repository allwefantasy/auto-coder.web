import React, { useState, useRef, useEffect } from 'react';
import { getMessage } from '../Sidebar/lang';
import { autoCommandService, Message as ServiceMessage } from '../../services/autoCommandService';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AutoModePageProps {
  projectName: string;
  onSwitchToExpertMode: () => void;
}

interface Message extends ServiceMessage {
  id: string;
  timestamp?: number;
}

const AutoModePage: React.FC<AutoModePageProps> = ({ projectName, onSwitchToExpertMode }) => {
  const [autoSearchTerm, setAutoSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const autoSearchInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Focus the search input when the component mounts
    if (autoSearchInputRef.current) {
      autoSearchInputRef.current.focus();
    }

    // Set up event listeners
    autoCommandService.on('message', (message: ServiceMessage) => {
      setMessages(prev => {
        // Create a new message with id and timestamp
        const newMessage: Message = {
          ...message,
          id: message.id || `msg-${Date.now()}`,
          timestamp: Date.now()
        };

        // Check if this is an update to an existing message
        // The autoCommandService now handles consecutive STREAM events with the same ID
        const existingIndex = prev.findIndex(m => m.id === newMessage.id);
        if (existingIndex >= 0) {
          // Update existing message
          const updatedMessages = [...prev];
          updatedMessages[existingIndex] = newMessage;
          return updatedMessages;
        }

        // Add as a new message
        return [...prev, newMessage];
      });
    });

    return () => {
      autoCommandService.closeEventStream();
      autoCommandService.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to handle user response to ASK_USER events
  const handleUserResponse = async (response: string, eventId?: string) => {
    if (!eventId) {
      console.error('Cannot respond to event: No event ID provided');
      return;
    }
    
    // Add user response to messages
    setMessages(prev => [...prev, {
      id: 'user-response-' + Date.now(),
      type: 'USER_RESPONSE',
      content: response,
      isUser: true,
      responseTo: eventId
    }]);
    
    try {
      // Send the response back to the server
      const result = await fetch('/api/auto-command/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          response: response
        })
      });
      
      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(`Failed to send response: ${errorData.detail || result.statusText}`);
      }
      
      console.log('Response sent successfully to event:', eventId);
    } catch (error) {
      console.error('Error sending response to server:', error);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        type: 'ERROR',
        content: `Failed to send your response to the server: ${error instanceof Error ? error.message : String(error)}`
      }]);
    }
  };
  
  // Function to render message content based on content type
  const renderMessageContent = (message: Message) => {
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
      // In a real implementation, you would use a markdown renderer here
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 break-words">
            {message.content}
          </pre>
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

  // Function to handle auto mode search submission
  const handleAutoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoSearchTerm.trim()) {
      try {
        setIsProcessing(true);
        setMessages([{
          id: 'user-' + Date.now(),
          type: 'USER',
          content: autoSearchTerm,
          isUser: true
        }]);
        await autoCommandService.executeCommand(autoSearchTerm);
      } catch (error) {
        console.error('Error executing command:', error);
        setMessages(prev => [...prev, {
          id: 'error-' + Date.now(),
          type: 'ERROR',
          content: 'Failed to execute command. Please try again.'
        }]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-900">
      <div className={`w-full max-w-4xl mx-auto px-4 py-6 flex flex-col ${messages.length === 0 ? 'justify-center' : ''} h-full`}>
        <div className="flex flex-col items-center justify-center mb-6 space-y-2">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text font-bold text-2xl">auto-coder.web</span>
          </div>
          <div className="text-gray-400 text-sm font-mono">
            {projectName}
          </div>
        </div>
        
        {/* Messages Area */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-6 bg-gray-800 rounded-lg p-4">
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
                          onClick={() => handleUserResponse(option, message.eventId)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Metadata display */}
                  {message.metadata && (
                    <div className="mt-2 text-xs text-gray-400 border-t border-gray-600 pt-2">
                      {Object.entries(message.metadata).map(([key, value]) => (
                        <div key={key} className="flex gap-1">
                          <span className="font-medium">{key}:</span>
                          <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                        </div>
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
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Command Input */}
        <form onSubmit={handleAutoSearch} className="w-full">
          <div className="relative">
            <input
              ref={autoSearchInputRef}
              type="text"
              className="w-full py-4 px-6 pr-12 rounded-full bg-gray-800 border border-gray-700 text-white text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-lg"
              placeholder={`${getMessage('searchIn')} ${projectName || getMessage('yourProject')}`}
              value={autoSearchTerm}
              onChange={(e) => setAutoSearchTerm(e.target.value)}
              disabled={isProcessing}
            />
            <button
              type="submit"
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${isProcessing ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Example Commands */}
        <div className="text-center text-gray-400 mt-4">
          <p className="mb-2">{getMessage('autoModeDescription')}</p>
          <p>{getMessage('tryExamples')}:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
              onClick={() => setAutoSearchTerm('Add authentication to the app')}
              disabled={isProcessing}
            >
              Add authentication
            </button>
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
              onClick={() => setAutoSearchTerm('Create a new API endpoint')}
              disabled={isProcessing}
            >
              Create API endpoint
            </button>
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
              onClick={() => setAutoSearchTerm('Fix bugs in the code')}
              disabled={isProcessing}
            >
              Fix bugs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoModePage;
