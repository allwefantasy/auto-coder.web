import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageList, { MessageProps } from './MessageList';
import { getMessage } from '../Sidebar/lang';
import html2canvas from 'html2canvas';

interface ChatPanelProps {
  messages: MessageProps[];
  currentTask: string;
  onUserResponse: (response: string, eventId?: string) => Promise<void>;
  onClose?: () => void;
  onToggleAdaptive?: () => void;
  isMessageAreaAdaptive?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, currentTask, onUserResponse, onClose, onToggleAdaptive, isMessageAreaAdaptive = true }) => {
  // 计算累计的token使用和费用
  const [accumulatedStats, setAccumulatedStats] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    contextWindowUsage: 0,
    maxContextWindow: 100, // 默认值
    cacheHits: 0,
    cacheMisses: 0
  });
  
  // 创建消息列表底部引用，用于自动滚动
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);

  // 滚动到消息列表底部的辅助函数
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 当messages变化时更新累计统计
  useEffect(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let totalCost = 0;
    let contextWindowUsage = 0;
    let maxContextWindow = 100;
    let cacheHits = 0;
    let cacheMisses = 0;

    // 遍历所有消息，累计token统计
    messages.forEach(message => {
      if (message.contentType === 'token_stat' && message.metadata) {
        inputTokens += message.metadata.input_tokens || 0;
        outputTokens += message.metadata.output_tokens || 0;
        totalCost += (message.metadata.input_cost || 0) + (message.metadata.output_cost || 0);
        contextWindowUsage = Math.max(contextWindowUsage, message.metadata.context_window || 0);
        maxContextWindow = message.metadata.max_context_window || maxContextWindow;
        cacheHits += message.metadata.cache_hit || 0;
        cacheMisses += message.metadata.cache_miss || 0;
      }

      if (message.metadata?.stream_out_type === "index_build" && message.metadata?.input_tokens) {
        inputTokens += message.metadata.input_tokens || 0;
        outputTokens += message.metadata.output_tokens || 0;
        totalCost += (message.metadata.input_cost || 0) + (message.metadata.output_cost || 0);
        contextWindowUsage = Math.max(contextWindowUsage, message.metadata.context_window || 0);
        maxContextWindow = message.metadata.max_context_window || maxContextWindow;
        cacheHits += message.metadata.cache_hit || 0;
        cacheMisses += message.metadata.cache_miss || 0;
      }
    });

    setAccumulatedStats({
      inputTokens,
      outputTokens,
      totalCost,
      contextWindowUsage,
      maxContextWindow,
      cacheHits,
      cacheMisses
    });
  }, [messages]);
  
  // 检测用户滚动事件
  useEffect(() => {
    const handleScroll = () => {
      // 获取滚动容器
      const container = messageContainerRef.current;
      if (!container) return;
      
      // 标记用户已经滚动过
      setHasUserScrolled(true);
      
      // 检查是否滚动到底部附近（允许60px的误差）
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
      
      // 更新滚动状态
      setShouldAutoScroll(isAtBottom);
    };
    
    const container = messageContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      
      // 初始化时检查一次是否在底部
      setTimeout(() => {
        if (container && messageContainerRef.current === container) {
          handleScroll();
        }
      }, 100);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  
  // 当消息列表更新时，仅在用户处于底部时才滚动到底部
  useEffect(() => {
    // 检查消息是否有变化
    const currentMessagesLength = messages.length;
    const messagesChanged = currentMessagesLength !== prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = currentMessagesLength;
    
    // 如果消息数量增加，且用户尚未滚动过或者用户在底部，则滚动到底部
    if (messagesChanged && (!hasUserScrolled || shouldAutoScroll)) {
      // 使用 setTimeout 确保在DOM更新后滚动
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [messages, shouldAutoScroll, hasUserScrolled, scrollToBottom]);
  
  // 当组件挂载或标签切换回来时，确保滚动到底部
  useEffect(() => {
    // 使用延时确保DOM已完全渲染
    const timer = setTimeout(() => {
      if (!hasUserScrolled || shouldAutoScroll) {
        scrollToBottom();
      }
      
      // 重新检查滚动位置
      const container = messageContainerRef.current;
      if (container) {
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
        if (isAtBottom !== shouldAutoScroll) {
          setShouldAutoScroll(isAtBottom);
        }
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, []); // 仅在挂载时执行

  return (
    <div className="flex flex-col h-full relative">
      {/* 固定在父容器顶部的状态栏 */}
      <div className="sticky top-0 z-10 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 shadow-md rounded-t-lg mb-4">
        <div className="px-4 py-3 flex justify-between items-start">
          <div className="flex flex-col">
            {/* 当前任务 */}
            <div className="mb-2 flex items-center">
              <svg className="w-4 h-4 text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-white font-medium text-sm truncate">{currentTask || getMessage('noActiveTask')}</h2>            
            </div>
            
            {/* Token统计信息 */}
            <div className="font-mono text-xs text-gray-400 flex flex-row items-center gap-2 flex-wrap text-[11px]">
              <div className="flex items-center">
                <span>{getMessage('tokens')}: </span>
                <span className="text-green-500 ml-1">↑ {accumulatedStats.inputTokens}</span>
                <span className="text-red-500 ml-1">↓ {accumulatedStats.outputTokens}</span>
              </div>
              <div className="flex items-center">
                <span>{getMessage('cache')}: </span>
                <span className="text-white ml-1">⊕ {accumulatedStats.cacheHits}</span>
                <span className="text-white ml-1">→ {accumulatedStats.cacheMisses}</span>
              </div>            
              <div className="flex items-center">
                <span>{getMessage('apiCost')}: </span>
                <span className="text-white ml-1">${accumulatedStats.totalCost.toFixed(5)}</span>
              </div>
            </div>
          </div>

          {/* 右侧按钮区域 */}
          <div className="flex items-center space-x-2">
            {/* 假设已有保存按钮 */}
            <button
              className="p-1 rounded hover:bg-gray-700 text-gray-300"
              title="保存会话"
            >
              💾
            </button>

            {/* 导出图片按钮 */}
            <button
              onClick={async () => {
                const container = messageContainerRef.current;
                if (!container) return;
                try {
                  const canvas = await html2canvas(container, { backgroundColor: '#1f2937' }); // Tailwind灰色背景
                  const dataUrl = canvas.toDataURL('image/png');

                  const link = document.createElement('a');
                  link.href = dataUrl;
                  link.download = 'chat-session.png';
                  link.click();
                } catch (error) {
                  console.error('导出图片失败:', error);
                }
              }}
              className="p-1 rounded hover:bg-gray-700 text-gray-300"
              title="导出为图片"
            >
              ⬇️
            </button>
          </div>
        </div>
      </div>
      
      {/* 消息列表 */}
      <div className="flex-grow overflow-y-auto relative" ref={messageContainerRef}>
        <MessageList 
          messages={messages} 
          onUserResponse={onUserResponse} 
        />
        {/* 消息列表底部引用点，用于自动滚动 */}
        <div ref={messagesEndRef} />
        
        {/* 添加"滚动到底部"按钮，当用户不在底部时显示 */}
        {!shouldAutoScroll && messages.length > 0 && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              setShouldAutoScroll(true);
            }}
            className="fixed bottom-24 right-4 z-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 shadow-lg flex items-center justify-center"
            style={{ width: '36px', height: '36px' }}
            aria-label="滚动到底部"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatPanel; 