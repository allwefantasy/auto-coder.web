import React from 'react';
import { Markdown } from './Markdown';
import { getMessage } from './lang';
import { Message } from './types';

interface ChatMessagesProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleNewChat: () => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  messagesEndRef,
  handleNewChat
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-900 relative scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
      {/* New Chat Button */}
      <button
        onClick={handleNewChat}
        className="absolute top-2 left-2 z-10 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors"
        title={getMessage('newChat')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="space-y-4">
        {messages.map((message) => (
          <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg p-2 relative group text-2xs ${message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300'
                }`}
            >
              <Markdown>{message.content}</Markdown>
              {message.status === 'sending' && (
                <div className="flex items-center text-2xs text-gray-400 mt-1">
                  <div className="mr-1">sending</div>
                  <div className="animate-bounce">•</div>
                  <div className="animate-bounce delay-100">•</div>
                  <div className="animate-bounce delay-200">•</div>
                </div>
              )}
              {message.status === 'sent' && (
                <div className="text-2xs text-green-400 mt-1">
                  ✓ sent
                </div>
              )}
              {message.status === 'error' && (
                <div className="flex items-center text-2xs text-red-400 mt-1">
                  <span className="mr-1">⚠</span>
                  failed to send
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;