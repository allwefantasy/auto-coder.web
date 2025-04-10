import React, { useState, useEffect } from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css'; // Ensure styles are imported

interface AgenticEditExecuteCommandToolProps {
  message: MessageProps;
}

const AgenticEditExecuteCommandTool: React.FC<AgenticEditExecuteCommandToolProps> = ({ message }) => {
  const [command, setCommand] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    try {
      const parsed = JSON.parse(message.content || '{}');
      const cmd = parsed.command || 'N/A';
      setCommand(cmd);
      setRequiresApproval(parsed.requires_approval || false);
      // Set collapsed state based on command length
      setIsCollapsed(cmd.length >= 80);
    } catch (e) {
      console.error('Failed to parse ExecuteCommandTool content:', e);
      setCommand('Error parsing content');
    }
  }, [message.content]);

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
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </span>
        {/* Title */}
        <span className="message-title-text text-green-400 font-semibold">
          AutoCoder wants to execute this command:
        </span>
      </div>
      {/* Command (Collapsible) */}
      {!isCollapsed && (
        <div className="mt-1 text-yellow-300 bg-gray-800 px-2 py-1 rounded text-sm font-mono break-all">
          {command}
        </div>
      )}
       {/* Approval Status */}
       <div className={`mt-1 text-xs ${requiresApproval ? 'text-red-400' : 'text-gray-400'}`}>
         (Requires Approval: {requiresApproval ? 'Yes' : 'No'})
       </div>
    </div>
  );
};

export default AgenticEditExecuteCommandTool;