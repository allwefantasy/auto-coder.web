import React from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported

interface AgenticEditListCodeDefinitionNamesToolProps {
  message: MessageProps;
}

const AgenticEditListCodeDefinitionNamesTool: React.FC<AgenticEditListCodeDefinitionNamesToolProps> = ({ message }) => {
  let path = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    path = parsed.path || 'N/A';
  } catch (e) {
    console.error('Failed to parse ListCodeDefinitionNamesTool content:', e);
    path = 'Error parsing content';
  }

  return (
    <div className="message-font">
      <div className="message-title flex items-center">
        {/* Icon */}
        <span className="message-title-icon mr-1">
          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-teal-400 font-semibold">
          AutoCoder wants to list definitions in:
        </span>
      </div>
      {/* Directory Path */}
      <div className="mt-1 text-cyan-300 bg-gray-800 px-2 py-1 rounded text-sm font-mono break-all">
        {path}
      </div>
    </div>
  );
};

export default AgenticEditListCodeDefinitionNamesTool;