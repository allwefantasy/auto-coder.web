import React, { useState } from 'react';
import { MessageProps } from '../MessageList';
import './MessageStyles.css';
import { getMessage } from '../../Sidebar/lang';

interface AgenticEditReplaceInFileToolProps {
  message: MessageProps;
}

const AgenticEditReplaceInFileTool: React.FC<AgenticEditReplaceInFileToolProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const content = JSON.parse(message.content);
  const toolName = content.tool_name;
  const path = content.path;
  const diff = content.diff;

  const renderDiffBlocks = (diffText: string) => {
    const blocks: { search: string; replace: string }[] = [];
    const regex = /<<<<<<< SEARCH\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> REPLACE/gm;
    let match;
    while ((match = regex.exec(diffText)) !== null) {
      blocks.push({
        search: match[1].trimEnd(),
        replace: match[2].trimEnd(),
      });
    }

    return blocks.map((block, idx) => (
      <div key={idx} className="mb-1.5 border border-gray-700 rounded overflow-hidden text-xs font-mono shadow-sm">
        <div className="flex">
          <div className="w-1/2 border-r border-gray-700">
            <div className="bg-gray-800 px-1.5 py-0.5 text-xs font-medium text-gray-300 border-b border-gray-700">SEARCH</div>
            <div className="bg-gray-900 h-56 overflow-auto">
              <pre className="px-1.5 py-1 whitespace-pre text-red-300 min-w-full text-xs">{block.search}</pre>
            </div>
          </div>
          <div className="w-1/2">
            <div className="bg-gray-800 px-1.5 py-0.5 text-xs font-medium text-gray-300 border-b border-gray-700">REPLACE</div>
            <div className="bg-gray-900 h-56 overflow-auto">
              <pre className="px-1.5 py-1 whitespace-pre text-green-300 min-w-full text-xs">{block.replace}</pre>
            </div>
          </div>
        </div>
      </div>
    ));
  };

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
          {getMessage('agenticEditReplaceInFileToolTitle')}
        </span>

        {/* <span className="ml-2 truncate text-gray-300 text-xs" title={path}>
          {path}
        </span> */}
      </div>

      {!isCollapsed && (
        <div className="mt-2 text-white">                
          {path}
          {renderDiffBlocks(diff)}  
        </div>
      )}
    </div>
  );
};

export default AgenticEditReplaceInFileTool;