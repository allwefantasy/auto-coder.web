import React from 'react';
import { Markdown } from './Markdown';
import { Message } from './types';

interface MessageRendererProps {
  message: Message;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  // Render message content based on message properties
  const renderMessageContent = () => {
    // Handle different message types based on content or metadata
    if (message.contentType === 'markdown') {
      return <Markdown>{message.content}</Markdown>;
    }

    if (message.contentType === 'code') {
      return (
        <div className="bg-gray-800 rounded p-2 font-mono text-xs overflow-x-auto">
          <pre>{message.content}</pre>
        </div>
      );
    }

    if (message.contentType === 'summary') {
      return (
        <div className="bg-gray-700 rounded p-2 border-l-4 border-blue-500">
          <h4 className="text-blue-400 text-xs font-bold mb-1">Summary</h4>
          <Markdown>{message.content}</Markdown>
        </div>
      );
    }

    // Default rendering for text content
    return <Markdown>{message.content}</Markdown>;
  };

  // Render message status indicators
  const renderMessageStatus = () => {
    if (message.status === 'sending') {
      return (
        <div className="flex items-center text-2xs text-gray-400 mt-1">
          <div className="mr-1">sending</div>
          <div className="animate-bounce">•</div>
          <div className="animate-bounce delay-100">•</div>
          <div className="animate-bounce delay-200">•</div>
        </div>
      );
    }

    if (message.status === 'sent') {
      return (
        <div className="text-2xs text-green-400 mt-1">
          ✓ sent
        </div>
      );
    }

    if (message.status === 'error') {
      return (
        <div className="flex items-center text-2xs text-red-400 mt-1">
          <span className="mr-1">⚠</span>
          failed to send
        </div>
      );
    }

    return null;
  };

  return (
    <div className="message-content">
      {renderMessageContent()}
      {renderMessageStatus()}
    </div>
  );
};

export default MessageRenderer;
