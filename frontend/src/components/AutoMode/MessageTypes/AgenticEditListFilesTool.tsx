import React from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported
import { getMessage } from '../../../lang';
interface AgenticEditListFilesToolProps {
  message: MessageProps;
}

const AgenticEditListFilesTool: React.FC<AgenticEditListFilesToolProps> = ({ message }) => {
  let path = '';
  let recursive = false;

  try {
    const parsed = JSON.parse(message.content || '{}');
    path = parsed.path || 'N/A';
    recursive = parsed.recursive || false;
  } catch (e) {
    console.error('Failed to parse ListFilesTool content:', e);
    path = 'Error parsing content';
  }

  return (
    <div className="message-font">
      <div className="message-title flex items-center">
        {/* Icon */}
        <span className="message-title-icon mr-1">
           <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
           </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-indigo-400 font-semibold">
          {getMessage('agenticEditListFilesToolTitle')}
        </span>
      </div>
      {/* Directory Path */}
      <div className="mt-1 text-cyan-300 bg-gray-800 px-2 py-1 rounded text-sm font-mono break-all">
        {path}
      </div>
      {/* Recursive Status */}
      <div className="mt-1 text-xs text-gray-400">
        ({recursive ? 'Recursively' : 'Top Level Only'})
      </div>
    </div>
  );
};

export default AgenticEditListFilesTool;