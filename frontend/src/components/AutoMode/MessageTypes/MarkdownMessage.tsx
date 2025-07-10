import React, { useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import mermaid from "mermaid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeMath from "rehype-math";
import "katex/dist/katex.min.css";
import type { MessageProps } from "../MessageList";
import { getMessage } from "../../Sidebar/lang";
import "./MessageStyles.css";
import eventBus, { EVENTS } from "../../../services/eventBus";

interface MarkdownMessageProps {
  message: MessageProps;
}

// 为了类型安全，定义代码块组件的props类型
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// 定义通用组件Props类型
interface MarkdownComponentProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ message }) => {
  const [isCollapsed, setIsCollapsed] = useState(message.type === 'ERROR');

  // 处理thinking标签
  const processThinkingTags = (content: string): string => {
    return content.replace(
      /<thinking>([\s\S]*?)<\/thinking>/g,
      (match, thinkingContent) => {
        // 保留thinking内容，但去掉标签
        return thinkingContent;
      }
    );
  };
  // 处理JSON格式的模型信息                                                                                                                     
  function processModelInfo(content: string) {
    // 匹配JSON格式的模型信息（改进正则以处理嵌套结构）                                                                                         
    const jsonPattern = /{[\s\S]*?}/g;

    return content.replace(jsonPattern, (match) => {
      try {
        // 解析JSON数据                                                                                                                         
        const jsonData = JSON.parse(match);
        const lines: string[] = [];

        // 定义属性映射表（包含单位和格式化处理）                                                                                               
        const propertyMap: Record<string, { label: string; format?: (value: any) => string }> = {
          model_name: { label: "模型名称" },
          input_tokens: { label: "输入token" },
          output_tokens: { label: "输出token" },
          elapsed_time: { label: "耗时", format: (v) => `${v}秒` },
          first_token_time: { label: "首token时间", format: (v) => `${v}秒` },
          input_cost: { label: "输入成本", format: (v) => `$${v}` },
          output_cost: { label: "输出成本", format: (v) => `$${v}` },
          speed: { label: "速度", format: (v) => `${v} tokens/秒` },
          conversation_id: { label: "会话ID" },
        };

        // 1. 处理已知属性（按定义的顺序）                                                                                                      
        const orderedKeys = [
          "model_name", "input_tokens", "output_tokens",
          "elapsed_time", "first_token_time", "speed",
          "input_cost", "output_cost", "conversation_id"
        ];

        orderedKeys.forEach(key => {
          if (jsonData[key] !== undefined && jsonData[key] !== null) {
            const mapping = propertyMap[key];
            const value = mapping.format
              ? mapping.format(jsonData[key])
              : jsonData[key];
            lines.push(`${mapping.label}：${value}`);
          }
        });

        // 2. 处理其他未知属性（按字母顺序）                                                                                                    
        const unknownKeys = Object.keys(jsonData)
          .filter(key => !propertyMap.hasOwnProperty(key) && key !== "__type")
          .sort();

        unknownKeys.forEach(key => {
          // 尝试美化键名                                                                                                                       
          const formattedKey = key.replace(/_/g, " ")
            .replace(/\b\w/g, char => char.toUpperCase());
          lines.push(`${formattedKey}：${jsonData[key]}`);
        });

        // 使用<br>确保Markdown中的换行效果                                                                                                     
        return lines.join("<br>");
      } catch (e) {
        // 如果解析失败，返回原始内容                                                                                                           
        return match;
      }
    });
  };

  const processMessageContent = (content: string): string => {
    let processedContent = content;
    // 先处理thinking标签
    processedContent = processThinkingTags(processedContent);

    // 再处理模型信息JSON
    processedContent = processModelInfo(processedContent);

    return processedContent;
  };

  // 处理最大化按钮点击
  const handleMaximize = () => {
    eventBus.publish(EVENTS.UI.SHOW_MODAL, {
      content: message.content,
      format: "markdown",
      title: getMarkdownTitle(),
    });
  };

  // 获取Markdown标题，避免使用三元操作符
  const getMarkdownTitle = () => {
    const title = getMessage("markdown");
    if (title) {
      return title;
    }
    return "Markdown";
  };

  // 获取复制按钮标题
  const getCopyTitle = () => {
    const title = getMessage("copy");
    if (title) {
      return title;
    }
    return "Copy";
  };

  // 获取最大化按钮标题
  const getMaximizeTitle = () => {
    const title = getMessage("maximize");
    if (title) {
      return title;
    }
    return "Maximize";
  };

  // 获取折叠/展开图标
  const getToggleIcon = () => {
    if (isCollapsed) {
      return (
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
      );
    }

    return (
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
    );
  };

  // 获取消息内容，避免使用三元操作符
  const getMessageContent = () => {
    if (message.content) {
      return processMessageContent(message.content);
    }
    return "";
  };

  // 定义Markdown渲染组件
  const markdownComponents = {
    // 代码块渲染
    code: ({ className, children, ...props }: CodeProps) => {
      // 提取语言
      const match = /language-(\w+)/.exec(className || "");
      //没有提取到语言，则认为是内联代码
      const inline = !match;
      let language = match ? match[1] : "";

      // 处理内联代码
      if (inline) {
        return (
          <code
            className={`markdown-inline-code ${className || ""}`}
            {...props}
          >
            {children}
          </code>
        );
      }

      // 处理代码块
      if (!children) {
        return null;
      }

      const content = String(children);
      if (!content.trim()) {
        return null;
      }

      // 处理Mermaid图表
      if (language === "mermaid") {
        const mermaidRef = useRef(null);

        useEffect(() => {
          if (mermaidRef.current) {
            mermaid.initialize({
              startOnLoad: true,
              theme: "dark",
              securityLevel: "loose",
            });
            try {
              mermaid.init(undefined, mermaidRef.current);
            } catch (e) {
              console.error("Mermaid error:", e);
            }
          }
        }, [content]);

        return (
          <div className="mermaid" ref={mermaidRef}>
            {content}
          </div>
        );
      }

      // 处理普通代码块
      return (
        <div className="markdown-code-wrapper">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            PreTag="div"
            wrapLines={true}
            wrapLongLines={true}
          >
            {content.replace(/\n$/, "")}
          </SyntaxHighlighter>

          {/* 显示语言标签 */}
          {language && <div className="code-language-tag">{language}</div>}
        </div>
      );
    },

    // 表格相关组件
    table: ({ ...props }: MarkdownComponentProps) => (
      <div className="markdown-table-container overflow-auto">
        <table className="markdown-table" {...props} />
      </div>
    ),
    th: ({ ...props }: MarkdownComponentProps) => (
      <th className="markdown-th" {...props} />
    ),
    td: ({ ...props }: MarkdownComponentProps) => (
      <td className="markdown-td" {...props} />
    ),

    // 文本和段落组件
    p: ({ ...props }: MarkdownComponentProps) => (
      <p className="markdown-paragraph" {...props} />
    ),
    a: ({ ...props }: MarkdownComponentProps) => (
      <a
        className="markdown-link"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    blockquote: ({ ...props }: MarkdownComponentProps) => (
      <blockquote className="markdown-blockquote" {...props} />
    ),

    // 列表相关组件
    ul: ({ ...props }: MarkdownComponentProps) => (
      <ul className="markdown-list markdown-ul" {...props} />
    ),
    ol: ({ ...props }: MarkdownComponentProps) => (
      <ol className="markdown-list markdown-ol" {...props} />
    ),
    li: ({ ...props }: MarkdownComponentProps) => (
      <li className="markdown-list-item" {...props} />
    ),

    // 标题组件
    h1: ({ ...props }: MarkdownComponentProps) => (
      <h1 className="markdown-heading markdown-h1" {...props} />
    ),
    h2: ({ ...props }: MarkdownComponentProps) => (
      <h2 className="markdown-heading markdown-h2" {...props} />
    ),
    h3: ({ ...props }: MarkdownComponentProps) => (
      <h3 className="markdown-heading markdown-h3" {...props} />
    ),
    h4: ({ ...props }: MarkdownComponentProps) => (
      <h4 className="markdown-heading markdown-h4" {...props} />
    ),
    h5: ({ ...props }: MarkdownComponentProps) => (
      <h5 className="markdown-heading markdown-h5" {...props} />
    ),
    h6: ({ ...props }: MarkdownComponentProps) => (
      <h6 className="markdown-heading markdown-h6" {...props} />
    ),

    // 其他元素
    hr: ({ ...props }: MarkdownComponentProps) => (
      <hr className="markdown-hr" {...props} />
    ),
    img: ({ ...props }: MarkdownComponentProps) => (
      <img className="markdown-img" {...props} />
    ),
  };

  // 渲染内容部分
  const renderContent = () => {
    if (isCollapsed) {
      return null;
    }

    return (
      <div
        className="markdown-content prose prose-invert prose-xs max-w-full break-words overflow-auto scrollbar-thin scrollbar-thumb-gray-600"
        style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
      >
        <ReactMarkdown
          className="markdown-body text-gray-200 break-words"
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeMath, rehypeKatex]}
          components={markdownComponents}
        >
          {getMessageContent()}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="message-font">
      <div className="message-title">
        {/* Toggle button for collapse/expand */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="message-toggle-button"
        >
          {getToggleIcon()}
        </button>

        <span className="message-title-icon">
          <svg
            className="w-4 h-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </span>
        <span className="text-blue-400 message-title-text">
          {getMarkdownTitle()}
        </span>

        {/* 添加复制和最大化按钮 */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(message.content);
            // 可选：添加复制成功的提示
          }}
          className="ml-auto message-copy-button text-gray-400 hover:text-blue-400"
          title={getCopyTitle()}
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
          title={getMaximizeTitle()}
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

      {renderContent()}
    </div>
  );
};

export default MarkdownMessage;
