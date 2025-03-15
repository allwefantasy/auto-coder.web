import React, { useState, useRef, useEffect } from 'react';
import { getMessage } from '../Sidebar/lang';
import { autoCommandService, Message as ServiceMessage } from '../../services/autoCommandService';
import MessageList from './MessageList';

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
  const [activeAskUserMessage, setActiveAskUserMessage] = useState<Message | null>(null);
  const [currentEventFileId, setCurrentEventFileId] = useState<string | null>(null);
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
      // Check if this is an ASK_USER type message and set it as active
      if (message.type === 'ASK_USER') {
        const askUserMessage: Message = {
          ...message,
          id: message.id || `msg-${Date.now()}`,
          timestamp: Date.now()
        };
        setActiveAskUserMessage(askUserMessage);
      }
      
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
    
    if (!currentEventFileId) {
      console.error('Cannot respond to event: No event file ID available');
      return;
    }
    
    // Close the active ASK_USER dialog if it matches the event ID
    if (activeAskUserMessage?.eventId === eventId) {
      setActiveAskUserMessage(null);
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
          event_file_id: currentEventFileId,
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
        // Execute the command and get the event file ID
        const result = await autoCommandService.executeCommand(autoSearchTerm);
        // Store the event file ID for later use in user responses
        setCurrentEventFileId(result.event_file_id);
        // 清空输入框
        setAutoSearchTerm('');
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
      {/* ASK_USER Dialog */}
      {activeAskUserMessage && (
        <AskUserDialog 
          message={activeAskUserMessage} 
          onResponse={handleUserResponse}
          onClose={() => setActiveAskUserMessage(null)}
        />
      )}
      
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
            <MessageList 
              messages={messages} 
              onUserResponse={handleUserResponse}
            />
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

// AskUserDialog component for displaying ASK_USER events as a modal dialog
interface AskUserDialogProps {
  message: Message;
  onResponse: (response: string, eventId?: string) => Promise<void>;
  onClose: () => void;
}

const AskUserDialog: React.FC<AskUserDialogProps> = ({ message, onResponse, onClose }) => {
  const [customResponse, setCustomResponse] = useState('');
  const hasOptions = message.options && message.options.length > 0;
  
  // Handle click outside to close if not required
  const dialogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node) && !message.responseRequired) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [message.responseRequired, onClose]);
  
  // Handle custom response submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customResponse.trim()) {
      onResponse(customResponse, message.eventId);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={dialogRef}
        className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">User Input Required</h3>
          {!message.responseRequired && (
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="mb-6">
          <p className="text-gray-200 mb-4">{message.content}</p>
          
          {/* Options buttons */}
          {hasOptions && (
            <div className="flex flex-wrap gap-2 mb-4">
              {message.options!.map((option, index) => (
                <button
                  key={index}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white transition-colors"
                  onClick={() => onResponse(option, message.eventId)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          
          {/* Custom response input */}
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex items-center space-x-0">
              <input
                type="text"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-l-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Type your response..."
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-r-md transition-colors border-l-0 border border-indigo-600"
                disabled={!customResponse.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
        
        {message.responseRequired && (
          <div className="text-sm text-amber-400 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>A response is required to continue</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoModePage;
