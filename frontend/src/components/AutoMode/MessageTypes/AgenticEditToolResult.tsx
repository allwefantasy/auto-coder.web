import React, { useState } from 'react';
import type { MessageProps } from '../MessageList';
import './MessageStyles.css';

interface AgenticEditToolResultProps {
  message: MessageProps;
}

const parseMessageContent = (message: MessageProps) => {
  try {
    return JSON.parse(message.content || '{}');
  } catch (e) {
    console.error('Failed to parse tool result content:', e);
    return {};
  }
};

export const ReadFileToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { path, content } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">ReadFileTool</span>
          <span className="text-xs text-gray-300 truncate max-w-[300px]" title={path}>{path}</span>
        </div>
      </div>
      {!collapsed && content && (
        <pre className="p-3 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px]">
          {content}
        </pre>
      )}
    </div>
  );
};

export const WriteToFileToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { path, content } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">WriteToFileTool</span>
          <span className="text-xs text-gray-300 truncate max-w-[300px]" title={path}>{path}</span>
        </div>
      </div>
      {!collapsed && content && (
        <pre className="p-3 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px]">
          {content}
        </pre>
      )}
    </div>
  );
};

export const ExecuteCommandToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { command, requires_approval, output } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">ExecuteCommandTool</span>
          <span className="text-xs text-gray-300">{command}</span>
          <span className="text-xs text-gray-400">{requires_approval ? '(Requires approval)' : ''}</span>
        </div>
      </div>
      {!collapsed && output && (
        <pre className="p-3 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px]">
          {output}
        </pre>
      )}
    </div>
  );
};

export const ListFilesToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { path, recursive, files } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">ListFilesTool</span>
          <span className="text-xs text-gray-300 truncate max-w-[300px]" title={path}>{path}</span>
          <span className="text-xs text-gray-400">{recursive ? 'Recursive' : 'Top Level'}</span>
        </div>
      </div>
      {!collapsed && files && (
        <pre className="p-3 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px]">
          {Array.isArray(files) ? files.join('\n') : String(files)}
        </pre>
      )}
    </div>
  );
};

export const SearchFilesToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { path, file_pattern, regex, matches } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">SearchFilesTool</span>
          <span className="text-xs text-gray-300 truncate max-w-[300px]" title={path}>{path}</span>
          <span className="text-xs text-gray-400">{file_pattern}</span>
          <span className="text-xs text-gray-400">{regex}</span>
        </div>
      </div>
      {!collapsed && matches && (
        <pre className="p-3 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px]">
          {Array.isArray(matches) ? matches.join('\n') : String(matches)}
        </pre>
      )}
    </div>
  );
};

export const ListCodeDefinitionNamesToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { path, definitions } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">ListCodeDefinitionNamesTool</span>
          <span className="text-xs text-gray-300 truncate max-w-[300px]" title={path}>{path}</span>
        </div>
      </div>
      {!collapsed && definitions && (
        <pre className="p-3 bg-gray-900 overflow-auto text-xs font-mono whitespace-pre-wrap text-gray-200 border-t border-gray-700 max-h-[400px]">
          {Array.isArray(definitions) ? definitions.join('\n') : String(definitions)}
        </pre>
      )}
    </div>
  );
};

export const AskFollowupQuestionToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { question, options } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">AskFollowupQuestionTool</span>
        </div>
      </div>
      {!collapsed && (
        <div className="p-3 bg-gray-900 border-t border-gray-700 text-gray-200 text-sm space-y-2">
          <div>{question}</div>
          {options && Array.isArray(options) && (
            <ul className="list-disc pl-5">
              {options.map((opt: string, idx: number) => (
                <li key={idx}>{opt}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export const UseMcpToolMessage: React.FC<AgenticEditToolResultProps> = ({ message }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { server_name, tool_name, query, result } = parseMessageContent(message);

  return (
    <div className="message-font border border-gray-600 rounded overflow-hidden mb-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-yellow-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-yellow-400 font-semibold">UseMcpTool</span>
          <span className="text-xs text-gray-400">{server_name}</span>
          <span className="text-xs text-gray-400">{tool_name}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="p-3 bg-gray-900 border-t border-gray-700 text-gray-200 text-xs whitespace-pre-wrap font-mono max-h-[400px] overflow-auto">
          <div className="mb-2">{query}</div>
          {result && (
            <pre className="bg-gray-800 p-2 rounded border border-gray-700">{result}</pre>
          )}
        </div>
      )}
    </div>
  );
};

        </div>
      )}
    </div>
  );
};

export default AgenticEditToolResult;