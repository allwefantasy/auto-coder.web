import React, { useState } from 'react';

interface AgenticEditToolResultProps {
  toolName: string;
  success: boolean;
  message: string;
  content?: string;
}

const AgenticEditToolResult: React.FC<AgenticEditToolResultProps> = ({ toolName, success, message, content }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800/50 mb-4">
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-700/50"
           onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-sm text-yellow-400">{toolName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${success ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
            {success ? 'Success' : 'Failed'}
          </span>
          <span className="text-xs text-gray-300 truncate max-w-[300px]" title={message}>{message}</span>
        </div>
      </div>
      {!collapsed && content && (
        <div className="p-3 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px]">
          {content}
        </div>
      )}
    </div>
  );
};

export default AgenticEditToolResult;