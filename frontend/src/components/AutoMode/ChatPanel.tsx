import React, { useState, useEffect, useRef } from 'react';
import MessageList, { MessageProps } from './MessageList';
import { getMessage } from '../Sidebar/lang';

interface ChatPanelProps {
  messages: MessageProps[];
  currentTask: string;
  onUserResponse: (response: string, eventId?: string) => Promise<void>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, currentTask, onUserResponse }) => {
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

  // 滚动到消息列表底部的辅助函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
  
  // 当消息列表更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full relative">
      {/* 固定在父容器顶部的状态栏 */}
      <div className="sticky top-0 z-10 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 shadow-md rounded-t-lg mb-4">
        <div className="px-4 py-3">
          {/* 当前任务 */}
          <div className="mb-2 flex items-center">
            <svg className="w-5 h-5 text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-white font-medium truncate">{currentTask || getMessage('noActiveTask')}</h2>
          </div>
          
          {/* Token统计信息 */}
          <div className="font-mono text-xs text-gray-400 flex flex-row items-center gap-2 flex-wrap">
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
              <span>{getMessage('contextWindow')}: </span>
              <span className="text-white ml-1">{accumulatedStats.contextWindowUsage}k</span>
              <div className="w-24 h-2 bg-gray-700 rounded ml-1">
                <div 
                  className="h-full bg-blue-500 rounded" 
                  style={{ width: `${Math.min(100, (accumulatedStats.contextWindowUsage) / (accumulatedStats.maxContextWindow) * 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="flex items-center">
              <span>{getMessage('apiCost')}: </span>
              <span className="text-white ml-1">${accumulatedStats.totalCost.toFixed(5)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 消息列表 */}
      <div className="flex-grow overflow-y-auto">
        <MessageList 
          messages={messages} 
          onUserResponse={onUserResponse} 
        />
        {/* 消息列表底部引用点，用于自动滚动 */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatPanel; 