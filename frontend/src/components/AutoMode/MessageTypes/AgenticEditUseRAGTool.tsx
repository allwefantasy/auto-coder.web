import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported

interface AgenticEditUseRAGToolProps {
  message: MessageProps;
}

const AgenticEditUseRAGTool: React.FC<AgenticEditUseRAGToolProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  let queryContent = '';
  let retrievalCount = 0;
  let searchType = '';
  let querySnippet = '';
  let ellipsis = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    queryContent = parsed.query || parsed.content || '';
    retrievalCount = parsed.retrieval_count || parsed.results_count || 0;
    searchType = parsed.search_type || parsed.type || 'semantic';
    
    querySnippet = queryContent.substring(0, 100); // Show first 100 chars
    ellipsis = queryContent.length > 100 ? '...' : '';
  } catch (e) {
    console.error('Failed to parse UseRAGTool content:', e);
    queryContent = 'Error parsing content';
    searchType = 'Unknown';
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
           </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-purple-400 font-semibold">
          AutoCoder 正在使用 RAG 工具进行检索:
        </span>
      </div>
      {/* RAG Details (Collapsible) */}
      {!isCollapsed && (
        <div className="mt-2 space-y-1">
          <div className="text-xs">
            <span className="text-gray-400">搜索类型: </span>
            <span className="text-purple-300 font-mono">{searchType}</span>
          </div>
          {retrievalCount > 0 && (
            <div className="text-xs">
              <span className="text-gray-400">检索结果数量: </span>
              <span className="text-purple-300 font-mono">{retrievalCount}</span>
            </div>
          )}
          <div className="text-xs">
            <span className="text-gray-400">查询内容: </span>
            <pre className="bg-gray-900 p-1 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto text-gray-300">
                {querySnippet}{ellipsis}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticEditUseRAGTool; 