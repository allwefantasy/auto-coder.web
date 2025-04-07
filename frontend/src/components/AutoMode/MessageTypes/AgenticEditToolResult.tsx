import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../../components/Sidebar/lang';
import './MessageStyles.css';

interface AgenticEditToolResultProps {
  message: MessageProps;
}

const AgenticEditToolResult: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  let toolName = '';
  let success = false;
  let msg = '';
  let content = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    toolName = parsed.tool_name || '';
    success = parsed.success ?? false;
    msg = parsed.message || '';
    content = parsed.content || '';

    if (toolName === 'ReplaceInFileTool') {
      toolName = getMessage('agenticEditToolResultReplaceInFileTool');
    }
    if (toolName === 'WriteToFileTool') {
      toolName = getMessage('agenticEditToolResultWriteToFileTool');
    }
    if (toolName === 'ReadFileTool') {
      toolName = getMessage('agenticEditToolResultReadFileTool');
    }
    if (toolName === 'ListFilesTool') {
      toolName = getMessage('agenticEditToolResultListFilesTool');
    }
    if (toolName === 'SearchFilesTool') {
      toolName = getMessage('agenticEditToolResultSearchFilesTool');
    }

  } catch (e) {
    console.error('Failed to parse tool result content:', e);
    msg = message.content;
  }

  return (
    <div className="message-font">
      <div className="message-title flex items-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="message-toggle-button text-gray-400"
        >
          {isCollapsed ? (
            <svg className="message-toggle-icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="message-toggle-icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <span className="message-title-icon">
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 20h9"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4h9"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 12h16"
            />
          </svg>
        </span>
        <span className="message-title-text ml-1 text-yellow-400 font-semibold">
          {toolName}
        </span>
        <span
          className={`text-xs px-2 py-0.5 ml-2 rounded-full ${success ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'
            }`}
        >
          {success ? 'Success' : 'Failed'}
        </span>
      </div>

      <div className="mt-1 text-gray-300 text-xs whitespace-pre-wrap break-words px-2 py-1">
        <span title={msg} className="hover:underline cursor-help">
          {msg}
        </span>
      </div>

      {!isCollapsed && content && (
        <div className="mt-2 p-2 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px] scrollbar-thin scrollbar-thumb-gray-600">
          {content}
        </div>
      )}
    </div>
  );
};

export default AgenticEditToolResult;