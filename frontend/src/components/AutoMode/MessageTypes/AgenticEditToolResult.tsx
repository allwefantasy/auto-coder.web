import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../../components/Sidebar/lang';
interface AgenticEditToolResultProps {
  message: MessageProps;
}

const AgenticEditToolResult: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(true);

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
    // Add message-font for consistency
    <div className="message-font border border-[0.5px] border-gray-600 rounded-lg overflow-hidden bg-gray-800/50 mb-2">
      <div
        className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-700/50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-1">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          {/* Remove text-sm to inherit from message-font */}
          <span className="font-semibold text-yellow-400">{toolName}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${success ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'
              }`}
          >
            {success ? 'Success' : 'Failed'}
          </span>
        </div>        
      </div>
      <div className="mt-1 text-xs text-gray-300 overflow-hidden px-2">
        <span title={msg} className="hover:underline cursor-help break-words">
          {msg}
        </span>
      </div>
      {!collapsed && content && (
        <div className="p-2 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px] scrollbar-thin scrollbar-thumb-gray-600">
          {content}
        </div>
      )}
    </div>
  );
};

export default AgenticEditToolResult;