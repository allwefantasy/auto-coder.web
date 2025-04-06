import React from 'react';
import type { MessageProps } from '../MessageList';
import MarkdownMessage from './MarkdownMessage'; // Re-use Markdown renderer
import './MessageStyles.css'; // Ensure styles are imported

interface AgenticEditPlanModeRespondToolProps {
  message: MessageProps;
}

const AgenticEditPlanModeRespondTool: React.FC<AgenticEditPlanModeRespondToolProps> = ({ message }) => {
  let response = '';
  let options: string[] = [];

  try {
    const parsed = JSON.parse(message.content || '{}');
    response = parsed.response || 'N/A';
    // Options might be a string representation of an array or an actual array
    const rawOptions = parsed.options;
    if (typeof rawOptions === 'string') {
        try {
            options = JSON.parse(rawOptions);
            if (!Array.isArray(options)) options = [];
        } catch {
            options = []; // Handle parse error
        }
    } else if (Array.isArray(rawOptions)) {
        options = rawOptions;
    } else {
        options = [];
    }
  } catch (e) {
    console.error('Failed to parse PlanModeRespondTool content:', e);
    response = 'Error parsing content';
  }

  // Create a fake message object for MarkdownMessage
  const responseMessage: MessageProps = {
    ...message, // Keep original message properties like id, type etc.
    content: response,
    format: 'markdown', // Tell MarkdownMessage to render it
  };

  return (
    <div className="message-font">
      <div className="message-title flex items-center mb-2">
        {/* Icon */}
        <span className="message-title-icon mr-1">
          <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-sky-400 font-semibold">
          AutoCoder Planning Response:
        </span>
      </div>
      {/* Response (Rendered as Markdown) */}
      <div className="plan-response">
        <MarkdownMessage message={responseMessage} />
      </div>
      {/* Optional Options */}
      {options.length > 0 && (
        <div className="mt-2">
          <div className="text-gray-400 text-xs mb-1">Options:</div>
          <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
            {options.map((opt, index) => (
              <li key={index}>{opt}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AgenticEditPlanModeRespondTool;