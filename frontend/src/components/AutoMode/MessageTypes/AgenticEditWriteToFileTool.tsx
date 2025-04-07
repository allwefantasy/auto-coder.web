import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported
import { getMessage } from '../../Sidebar/lang';
interface AgenticEditWriteToFileToolProps {
  message: MessageProps;
}

const AgenticEditWriteToFileTool: React.FC<AgenticEditWriteToFileToolProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  let path = '';
  let contentSnippet = '';
  let ellipsis = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    path = parsed.path || 'N/A';
    const fullContent = parsed.content || '';
    contentSnippet = fullContent.substring(0, 150); // Show first 150 chars
    ellipsis = fullContent.length > 150 ? '...' : '';
  } catch (e) {
    console.error('Failed to parse WriteToFileTool content:', e);
    path = 'Error parsing content';
    contentSnippet = '';
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
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-purple-400 font-semibold">
          {getMessage('agenticEditWriteToFileToolTitle')}
        </span>
      </div>
      {/* File Path */}
      <div className="mt-1 text-cyan-300 bg-gray-800 px-2 py-1 rounded text-sm font-mono break-all">
        {path}
      </div>
      {/* Content Snippet (Collapsible) */}
      {!isCollapsed && (
        <div className="mt-2">
          <div className="text-gray-400 text-xs mb-1">Content Snippet:</div>
          <pre className="bg-gray-900 p-2 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto text-gray-300 max-h-40">
            {contentSnippet}{ellipsis}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AgenticEditWriteToFileTool;