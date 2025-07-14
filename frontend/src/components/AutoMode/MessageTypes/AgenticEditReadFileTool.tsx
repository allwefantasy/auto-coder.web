import React from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported
import { getMessage } from '../../../lang';
interface AgenticEditReadFileToolProps {
  message: MessageProps;
}

const AgenticEditReadFileTool: React.FC<AgenticEditReadFileToolProps> = ({ message }) => {
  let path = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    path = parsed.path || 'N/A';
  } catch (e) {
    console.error('Failed to parse ReadFileTool content:', e);
    path = 'Error parsing content';
  }

  return (
    <div className="message-font">
      <div className="message-title flex items-center">
        {/* Icon */}
        <span className="message-title-icon mr-1">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-blue-400 font-semibold">
          {getMessage('agenticEditReadFileToolTitle')}
        </span>
      </div>
      {/* File Path */}
      <div className="mt-1 text-cyan-300 bg-gray-800 px-2 py-1 rounded text-sm font-mono break-words max-h-[120px] overflow-auto scrollbar-thin scrollbar-thumb-gray-600">
        <span title={path} className="hover:underline cursor-help">
          {path}
        </span>
      </div>
    </div>
  );
};

export default AgenticEditReadFileTool;