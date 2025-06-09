import React from 'react';
import type { MessageProps } from '../MessageList';
import MarkdownMessage from './MarkdownMessage'; // Re-use Markdown renderer
import './MessageStyles.css'; // Ensure styles are imported

interface AgenticEditAttemptCompletionToolProps {
  message: MessageProps;
}

const AgenticEditAttemptCompletionTool: React.FC<AgenticEditAttemptCompletionToolProps> = ({ message }) => {
  let result = '';
  let command = '';

  try {
    const parsed = JSON.parse(message.content || '{}');
    result = parsed.result || 'N/A';
    command = parsed.command || '';
  } catch (e) {
    console.error('Failed to parse AttemptCompletionTool content:', e);
    result = 'Error parsing content';
  }

  // Create a fake message object for MarkdownMessage
  const resultMessage: MessageProps = {
    ...message, // Keep original message properties like id, type etc.
    content: result,
    // format: 'markdown', // Tell MarkdownMessage to render it
  };

  return (
    <div className="message-font">
      <div className="message-title flex items-center mb-2">
        {/* Icon */}
        <span className="message-title-icon mr-1">
          <svg className="w-4 h-4 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-lime-400 font-semibold">
          任务完成
        </span>
      </div>
      {/* Result (Rendered as Markdown) */}
      <div className="completion-result">
        <MarkdownMessage message={resultMessage} />
      </div>
      {/* Command Section - Always show */}
      <div className="mt-2">
        <span className="text-gray-400 text-xs">建议命令: </span>
        {command ? (
          <span className="text-yellow-300 bg-gray-800 px-2 py-1 rounded text-sm font-mono break-all">
            {command}
          </span>
        ) : (
          <span className="text-gray-500 text-sm italic">
            无可用命令
          </span>
        )}
      </div>
    </div>
  );
};

export default AgenticEditAttemptCompletionTool;