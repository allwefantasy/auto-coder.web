import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported
import { getMessage } from '../../Sidebar/lang';

interface AgenticEditSearchFilesToolProps {
  message: MessageProps;
}

const AgenticEditSearchFilesTool: React.FC<AgenticEditSearchFilesToolProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  let path = '';
  let regex = '';
  let filePattern = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    path = parsed.path || 'N/A';
    regex = parsed.regex || 'N/A';
    filePattern = parsed.file_pattern || '*'; // Default to * if not provided
  } catch (e) {
    console.error('Failed to parse SearchFilesTool content:', e);
    path = 'Error parsing content';
  }

  return (
    <div className="message-font">
      <div className="message-title flex items-center cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
         {/* Toggle Button */}
         <button className="message-toggle-button text-gray-400 mr-1">
            {isCollapsed ? (
                <svg className="message-toggle-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            ) : (
                <svg className="message-toggle-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            )}
        </button>
        {/* Icon */}
        <span className="message-title-icon mr-1">
          <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-pink-400 font-semibold">
          {getMessage('agenticEditSearchFilesToolTitle')}
        </span>
      </div>
      {/* Directory Path */}
      <div className="mt-1 text-cyan-300 bg-gray-800 px-2 py-1 rounded text-sm font-mono break-all">
        {path}
      </div>
      {/* Search Details (Collapsible) */}
      {!isCollapsed && (
        <div className="mt-2 space-y-1">
          <div className="text-xs">
            <span className="text-gray-400">File Pattern: </span>
            <span className="text-yellow-300 font-mono">{filePattern}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-400">Regex: </span>
            <span className="text-yellow-300 font-mono break-all">{regex}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticEditSearchFilesTool;