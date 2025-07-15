import React, { useState } from "react";
import { MessageProps } from "../MessageList";
import { getMessage } from "@/lang";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./MessageStyles.css";
import eventBus, { EVENTS } from "../../../services/eventBus";

interface CodeGenerateMessageProps {
  message: MessageProps;
}

// Main component that selects the appropriate subcomponent based on message type
const CodeGenerateMessage: React.FC<CodeGenerateMessageProps> = ({
  message,
}) => {
  // Check if this is a streaming message
  const isStreamingMessage =
    message.type === "STREAM" &&
    message.metadata?.stream_out_type === "code_generate";

  // Check if streaming is complete
  const isCompletedStream = isStreamingMessage && !message.isStreaming;

  if (isStreamingMessage) {
    return (
      <StreamingCodeGenerateMessage
        message={message}
        isCompleted={isCompletedStream}
      />
    );
  } else {
    return <RegularCodeGenerateMessage message={message} />;
  }
};

// Streaming code generation message component with collapse/expand functionality
const StreamingCodeGenerateMessage: React.FC<{
  message: MessageProps;
  isCompleted: boolean;
}> = ({ message, isCompleted }) => {
  const [isCollapsed, setIsCollapsed] = useState(isCompleted);

  // Format message content - truncate if too long
  const messageContent = message.content || "";
  const contentLines = messageContent.split("\n");
  const previewLines = 5; // Number of preview lines

  // Determine language for syntax highlighting
  const language = message.language || "javascript";

  // 处理最大化按钮点击
  const handleMaximize = () => {
    if (isCompleted) {
      eventBus.publish(EVENTS.UI.SHOW_MODAL, {
        content: message.content,
        format: "markdown",
        language: language,
        title: getMessage("generatingCode"),
      });
    }
  };

  return (
    <div className="message-font">
      <div className="message-title">
        {/* Toggle button for collapse/expand when message is complete and content exceeds preview lines */}
        {isCompleted && contentLines.length > previewLines && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="message-toggle-button"
          >
            {isCollapsed ? (
              <svg
                className="message-toggle-icon text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="message-toggle-icon text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}

        {/* Status indicator */}
        <span className="message-title-icon">
          {message.isStreaming ? (
            <svg
              className="animate-spin w-3.5 h-3.5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              ></path>
            </svg>
          )}
        </span>

        <span className="text-blue-400 message-title-text text-xs">
          {message.isStreaming
            ? getMessage("generatingCode")
            : getMessage("generatedCode")}
        </span>

        {/* 添加最大化按钮 - 仅当流式处理完成时可用 */}
        {isCompleted && (
          <>
            <button
              onClick={() => {
                navigator.clipboard.writeText(messageContent);
                // 可选：添加复制成功的提示
              }}
              className="ml-auto message-copy-button text-gray-400 hover:text-blue-400"
              title={getMessage("copy") || "Copy"}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="ml-1 message-maximize-button text-gray-400 hover:text-blue-400"
              title={getMessage("maximize") || "Maximize"}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Only show content when not collapsed */}
      {!isCollapsed && (
        <div className="message-content-container border border-gray-800">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "0.25rem",
              backgroundColor: "transparent",
              fontSize: "0.75rem",
            }}
            wrapLines={true}
            wrapLongLines={true}
          >
            {messageContent}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
};

// Regular code generation message component
const RegularCodeGenerateMessage: React.FC<{ message: MessageProps }> = ({
  message,
}) => {
  // Add collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Determine language for syntax highlighting
  const language = message.language || "javascript";

  // 处理最大化按钮点击
  const handleMaximize = () => {
    eventBus.publish(EVENTS.UI.SHOW_MODAL, {
      content: message.content,
      format: "markdown",
      language: language,
      title: message.metadata?.fileName || getMessage("generatedCode"),
    });
  };

  return (
    <div className="message-font">
      {/* Header section with simple style */}
      <div className="message-title">
        {/* Toggle button for collapse/expand */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="message-toggle-button"
        >
          {isCollapsed ? (
            <svg
              className="message-toggle-icon text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="message-toggle-icon text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Info icon */}
        <span className="message-title-icon">
          <svg
            className="w-3.5 h-3.5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            ></path>
          </svg>
        </span>

        {/* Title */}
        <span className="text-blue-400 message-title-text text-xs">
          {getMessage("generatedCode") || "Generated Code"}
        </span>

        {/* 添加复制和最大化按钮 */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(message.content);
            // 可选：添加复制成功的提示
          }}
          className="ml-auto message-copy-button text-gray-400 hover:text-blue-400"
          title={getMessage("copy") || "Copy"}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="ml-1 message-maximize-button text-gray-400 hover:text-blue-400"
          title={getMessage("maximize") || "Maximize"}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
            />
          </svg>
        </button>
      </div>

      {/* Only show content when not collapsed */}
      {!isCollapsed && (
        <div className="message-content-container border border-gray-800">
          {/* File name section if available */}
          {message.metadata?.fileName && (
            <div className="px-2 py-0.5 bg-gray-800/50 border-b border-gray-800 flex items-center">
              <svg
                className="w-3 h-3 mr-1 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <span className="text-gray-300 font-mono text-xs">
                {message.metadata.fileName}
              </span>
            </div>
          )}

          {/* Code content section */}
          <div className="p-0 bg-gray-800/20">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: "0.25rem",
                backgroundColor: "transparent",
                fontSize: "0.75rem",
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {message.content}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeGenerateMessage;
