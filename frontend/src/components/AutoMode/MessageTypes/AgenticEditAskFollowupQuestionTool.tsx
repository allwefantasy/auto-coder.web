import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported

interface AgenticEditAskFollowupQuestionToolProps {
  message: MessageProps;
}

const AgenticEditAskFollowupQuestionTool: React.FC<AgenticEditAskFollowupQuestionToolProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(false); // Start expanded
  let question = '';
  let options: string[] = [];

  try {
    const parsed = JSON.parse(message.content || '{}');
    question = parsed.question || 'N/A';
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
    console.error('Failed to parse AskFollowupQuestionTool content:', e);
    question = 'Error parsing content';
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
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M12 5v.01M12 19v.01M3.34 16.66l.01-.01M20.66 7.34l-.01.01M16.66 20.66l-.01-.01M7.34 3.34l.01.01M12 22a10 10 0 110-20 10 10 0 010 20z" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-orange-400 font-semibold">
          AutoCoder is asking a question:
        </span>
      </div>
      {/* Question and Options (Collapsible) */}
      {!isCollapsed && (
        <div className="mt-2 space-y-2">
          <div className="text-gray-200">{question}</div>
          {options.length > 0 && (
            <div>
              <div className="text-gray-400 text-xs mb-1">Options:</div>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {options.map((opt, index) => (
                  <li key={index}>{opt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgenticEditAskFollowupQuestionTool;