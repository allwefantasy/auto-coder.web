import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported

interface AgenticEditUseMcpToolProps {
  message: MessageProps;
}

const AgenticEditUseMcpTool: React.FC<AgenticEditUseMcpToolProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  let serverName = '';
  let toolName = '';
  let querySnippet = '';
  let ellipsis = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    serverName = parsed.server_name || 'Default';
    toolName = parsed.tool_name || 'Default';
    const fullQuery = parsed.query || '';
    querySnippet = fullQuery.substring(0, 100); // Show first 100 chars
    ellipsis = fullQuery.length > 100 ? '...' : '';
  } catch (e) {
    console.error('Failed to parse UseMcpTool content:', e);
    serverName = 'Error';
    toolName = 'Parsing';
    querySnippet = 'Content';
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
           <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-cyan-400 font-semibold">
          AutoCoder wants to use an MCP tool:
        </span>
      </div>
      {/* MCP Details (Collapsible) */}
      {!isCollapsed && (
        <div className="mt-2 space-y-1">
          <div className="text-xs">
            <span className="text-gray-400">Server: </span>
            <span className="text-blue-300 font-mono">{serverName}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-400">Tool: </span>
            <span className="text-blue-300 font-mono">{toolName}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-400">Query Snippet: </span>
            <pre className="bg-gray-900 p-1 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto text-gray-300">
                {querySnippet}{ellipsis}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticEditUseMcpTool;