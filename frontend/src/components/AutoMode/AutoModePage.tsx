import React, { useState, useRef, useEffect } from 'react';
import { getMessage } from '../Sidebar/lang';
import { autoCommandService } from '../../services/autoCommandService';

interface AutoModePageProps {
  projectName: string;
  onSwitchToExpertMode: () => void;
}

interface Message {
  type: string;
  content: string;
  metadata?: Record<string, any>;
}

const AutoModePage: React.FC<AutoModePageProps> = ({ projectName, onSwitchToExpertMode }) => {
  const [autoSearchTerm, setAutoSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
    autoCommandService.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      autoCommandService.closeEventStream();
      autoCommandService.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to handle auto mode search submission
  const handleAutoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoSearchTerm.trim()) {
      try {
        setIsProcessing(true);
        setMessages([]);
        await autoCommandService.executeCommand(autoSearchTerm);
      } catch (error) {
        console.error('Error executing command:', error);
        setMessages(prev => [...prev, {
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
                key={index} 
                className={`mb-4 p-4 rounded-lg ${message.type === 'ERROR' ? 'bg-red-900/50' : 'bg-gray-700/50'}`}
              >
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-200">
                  {message.content}
                </pre>
                {message.metadata && (
                  <div className="mt-2 text-xs text-gray-400">
                    {Object.entries(message.metadata).map(([key, value]) => (
                      <div key={key}>{key}: {JSON.stringify(value)}</div>
                    ))}
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
