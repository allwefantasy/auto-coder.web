import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMessage } from '../Sidebar/lang';
import { Message as ServiceMessage, HistoryCommand } from './types';
import { ChatPanel } from './index';
import InputPanel from './InputPanel';
import { autoCommandService } from '../../services/autoCommandService';
import { CommitListPanel, CurrentChangePanel } from './index';

interface AutoModePageProps {
  projectName: string;
  onSwitchToExpertMode: () => void;
}

interface Message extends ServiceMessage {
  id: string;
  timestamp?: number;
}

const AutoModePage: React.FC<AutoModePageProps> = ({ projectName, onSwitchToExpertMode }) => {
  // 状态管理
  const [autoSearchTerm, setAutoSearchTerm] = useState(''); // 搜索/命令输入框的状态
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState(''); // 最后提交的查询
  const [messages, setMessages] = useState<Message[]>([]); // 存储所有消息的数组
  const [isProcessing, setIsProcessing] = useState(false); // 命令处理中状态标志
  const [isStreaming, setIsStreaming] = useState(false); // 流式响应状态标志
  const [activeAskUserMessage, setActiveAskUserMessage] = useState<Message | null>(null); // 当前活动的用户询问消息
  const [currentEventFileId, setCurrentEventFileId] = useState<string | null>(null); // 当前事件文件ID
  const [isMessageAreaVisible, setIsMessageAreaVisible] = useState(true); // 消息区域显示状态
  const [isMessageAreaAdaptive, setIsMessageAreaAdaptive] = useState(true); // 消息区域自适应状态
  const [activeTab, setActiveTab] = useState<'messages' | 'current-change' | 'commits'>('messages'); // 修改标签状态
  const [currentCommitHashes, setCurrentCommitHashes] = useState<string[]>([]); // 当前变化的提交哈希
  
  const messagesRef = useRef(messages);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  const saveTaskHistory = useCallback(async (isError: boolean = false, query: string, eventFileId: string | null) => {
    if (!query || !eventFileId) return;
    console.log(messagesRef.current); // 使用 ref 获取最新值
    
    try {
      await fetch('/api/auto-command/save-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          event_file_id: eventFileId,
          messages: messagesRef.current,
          status: isError ? 'error' : 'completed',
          timestamp: Date.now()
        })
      });
      console.log('Task history saved successfully');
    } catch (error) {
      console.error('Failed to save task history:', error);
    }
  }, []);
  
  // 组件挂载后的初始化效果
  useEffect(() => {
    // 获取当前变更
    fetchCurrentChanges();

    // 设置消息事件监听器
    autoCommandService.on('message', (message: ServiceMessage) => {
      // 处理用户询问类型的消息
      if (message.type === 'ASK_USER') {
        const askUserMessage: Message = {
          ...message,
          id: message.id || `msg-${Date.now()}`,
          timestamp: Date.now()
        };
        setActiveAskUserMessage(askUserMessage);
      }
      
      // 更新消息列表
      setMessages(prev => {
        // 创建带有ID和时间戳的新消息
        const newMessage: Message = {
          ...message,
          id: message.id || `msg-${Date.now()}`,
          timestamp: Date.now()
        };

        // 检查是否是对现有消息的更新
        // autoCommandService 现在处理具有相同ID的连续流事件
        const existingIndex = prev.findIndex(m => m.id === newMessage.id);
        if (existingIndex >= 0) {
          // 更新现有消息
          const updatedMessages = [...prev];
          updatedMessages[existingIndex] = newMessage;
          return updatedMessages;
        }

        // 添加为新消息
        return [...prev, newMessage];
      });
    });

    // 组件卸载时清理
    return () => {
      autoCommandService.closeEventStream();
      autoCommandService.removeAllListeners();
    };
  }, []);

  // 获取当前变更
  const fetchCurrentChanges = async () => {
    try {
      const response = await fetch('/api/current-changes');
      if (response.ok) {
        const data = await response.json();
        setCurrentCommitHashes(data.commit_hashes || []);
      } else {
        console.error('Failed to fetch current changes:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching current changes:', error);
    }
  };

  // 单独处理任务完成事件，依赖于查询和事件文件ID
  useEffect(() => {
    // 先移除旧的监听器，避免重复监听
    autoCommandService.removeAllListeners('taskComplete');
    
    // 添加新的监听器，闭包会捕获最新的状态值
    autoCommandService.on('taskComplete', (isError: boolean) => {
      if (lastSubmittedQuery && currentEventFileId) {
        saveTaskHistory(isError, lastSubmittedQuery, currentEventFileId);
      } else {
        console.warn('Cannot save task history: missing query or event file ID');
      }
    });
    
    // 清理函数
    return () => {
      autoCommandService.removeAllListeners('taskComplete');
    };
  }, [lastSubmittedQuery, currentEventFileId, saveTaskHistory]);

  // 处理用户对ASK_USER事件的响应
  const handleUserResponse = async (response: string, eventId?: string) => {
    if (!eventId) {
      console.error('Cannot respond to event: No event ID provided');
      return;
    }
    
    if (!currentEventFileId) {
      console.error('Cannot respond to event: No event file ID available');
      return;
    }
    
    // 如果匹配事件ID，关闭活动的ASK_USER对话框
    if (activeAskUserMessage?.eventId === eventId) {
      setActiveAskUserMessage(null);
    }
    
    // 将用户响应添加到消息列表
    setMessages(prev => [...prev, {
      id: 'user-response-' + Date.now(),
      type: 'USER_RESPONSE',
      content: response,
      isUser: true,
      responseTo: eventId
    }]);
    
    try {
      // 将响应发送回服务器
      const result = await fetch('/api/auto-command/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          event_file_id: currentEventFileId,
          response: response
        })
      });
      
      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(`Failed to send response: ${errorData.detail || result.statusText}`);
      }
      
      console.log('Response sent successfully to event:', eventId);
    } catch (error) {
      console.error('Error sending response to server:', error);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        type: 'ERROR',
        content: `Failed to send your response to the server: ${error instanceof Error ? error.message : String(error)}`
      }]);
    }
  };

  // 处理自动模式搜索提交
  const handleAutoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoSearchTerm.trim()) {
      try {
        setIsProcessing(true);
        // 保存最后提交的查询
        setLastSubmittedQuery(autoSearchTerm);
        // 添加用户消息到消息列表
        setMessages([{
          id: 'user-' + Date.now(),
          type: 'USER',
          content: autoSearchTerm,
          isUser: true
        }]);
        // 执行命令并获取事件文件ID
        const result = await autoCommandService.executeCommand(autoSearchTerm);
        // 存储事件文件ID以便后续用户响应使用
        setCurrentEventFileId(result.event_file_id);
        // 清空输入框
        setAutoSearchTerm('');
      } catch (error) {
        console.error('Error executing command:', error);
        setMessages(prev => [...prev, {
          id: 'error-' + Date.now(),
          type: 'ERROR',
          content: 'Failed to execute command. Please try again.'
        }]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 恢复历史任务状态
  const restoreHistoryTask = (task: HistoryCommand) => {
    // 设置查询
    setAutoSearchTerm(task.query);
    // 更新最后提交的查询
    setLastSubmittedQuery(task.query);          
    // 更新消息列表
    console.log('Restoring history task messages:', task.messages);
    setMessages(task.messages);    
    
    // 恢复事件文件ID
    if (task.event_file_id) {
      setCurrentEventFileId(task.event_file_id);
    }
    
    // 确保消息区域可见
    setIsMessageAreaVisible(true);
    
    console.log('Restored history task:', task);
  };

  return (
    // 页面主容器 - 全高、灰黑背景的弹性容器
    <div className="flex-1 flex flex-col h-screen bg-gray-900">
      {/* 用户询问对话框 - 当需要用户输入时显示的模态框 */}
      {activeAskUserMessage && (
        <AskUserDialog 
          message={activeAskUserMessage} 
          onResponse={handleUserResponse}
          onClose={() => setActiveAskUserMessage(null)}
        />
      )}
      

      
      {/* 主内容区域 - 居中、最大宽度限制、垂直弹性布局 */}
      <div className={`w-full max-w-4xl mx-auto px-4 py-6 flex flex-col ${messages.length === 0 ? 'justify-center' : ''} h-full`}>
        {/* 标题区域 - 显示应用名称和当前项目 */}
        <div className="flex flex-col items-center justify-center mb-6 space-y-2">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text font-bold text-2xl">auto-coder.web</span>
          </div>
          <div className="text-gray-400 text-sm font-mono">
            {getMessage('projectName')}:{projectName}
          </div>
        </div>
        
        {/* 消息区域 - 带滚动功能的主聊天界面，包含ChatPanel组件 */}
        {messages.length > 0 && isMessageAreaVisible && (
          <div className={`relative flex-1 ${isMessageAreaAdaptive ? 'overflow-y-auto' : ''} mb-6 bg-gray-800 rounded-lg p-4`}>
            {/* 标签切换栏 */}
            <div className="flex border-b border-gray-700 mb-4">
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'messages' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('messages')}
              >
                {getMessage('showMessages')}
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'current-change' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('current-change')}
              >
                {getMessage('currentChange')}
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'commits' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('commits')}
              >
                {getMessage('viewChange')}
              </button>
              
              {/* 控制按钮容器 - 移到标签栏右侧 */}
              <div className="flex ml-auto">
                <button
                  className="text-gray-400 hover:text-white p-1 transition-colors mr-2"
                  onClick={() => setIsMessageAreaAdaptive(!isMessageAreaAdaptive)}
                  title={isMessageAreaAdaptive ? 'Fixed Height' : 'Adaptive Height'}
                >
                  {isMessageAreaAdaptive ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  )}
                </button>
                <button
                  className="text-gray-400 hover:text-white p-1 transition-colors"
                  onClick={() => setIsMessageAreaVisible(false)}
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 根据当前标签显示不同内容 */}
            {activeTab === 'messages' ? (
              <ChatPanel 
                messages={messages} 
                currentTask={lastSubmittedQuery.length > 0 
                  ? (lastSubmittedQuery.length > 20 
                    ? `${lastSubmittedQuery.substring(0, 20)}...` 
                    : lastSubmittedQuery)
                  : (projectName || getMessage('noProjectSelected'))}
                onUserResponse={handleUserResponse}
              />
            ) : activeTab === 'current-change' ? (
              <CurrentChangePanel 
                projectName={projectName} 
                commitHashes={currentCommitHashes} 
              />
            ) : (
              <CommitListPanel projectName={projectName} />
            )}
          </div>
        )}        

        {/* 显示消息区域的按钮 - 当消息区域被隐藏时显示 */}
        {messages.length > 0 && !isMessageAreaVisible && (
          <button
            className="mb-6 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center transition-colors"
            onClick={() => setIsMessageAreaVisible(true)}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            {getMessage('showMessages')}
          </button>
        )}

        {/* 命令输入区域 - 使用独立的InputPanel组件 */}
        <InputPanel
          projectName={projectName}
          isProcessing={isProcessing}
          autoSearchTerm={autoSearchTerm}
          setAutoSearchTerm={setAutoSearchTerm}
          onSubmit={handleAutoSearch}
          onSelectHistoryTask={restoreHistoryTask}
        />

        {/* 示例命令区域 - 提供快速使用的示例命令按钮 */}
        <div className="text-center text-gray-400 mt-4">
          <p className="mb-2">{getMessage('autoModeDescription')}</p>
          <p>{getMessage('tryExamples')}:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
              onClick={() => setAutoSearchTerm('Add authentication to the app')}
              disabled={isProcessing}
            >
              Add authentication
            </button>
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
              onClick={() => setAutoSearchTerm('Create a new API endpoint')}
              disabled={isProcessing}
            >
              Create API endpoint
            </button>
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
              onClick={() => setAutoSearchTerm('Fix bugs in the code')}
              disabled={isProcessing}
            >
              Fix bugs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 用户询问对话框组件 - 显示需要用户交互的模态框
interface AskUserDialogProps {
  message: Message;
  onResponse: (response: string, eventId?: string) => Promise<void>;
  onClose: () => void;
}

const AskUserDialog: React.FC<AskUserDialogProps> = ({ message, onResponse, onClose }) => {
  const [customResponse, setCustomResponse] = useState(''); // 存储用户自定义输入的响应
  const customResponseRef = useRef<HTMLInputElement>(null); // 自定义响应输入框引用
  const hasOptions = message.options && message.options.length > 0; // 检查是否有预定义选项
  
  // 对话框引用，用于检测点击外部区域
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // 处理点击对话框外部关闭对话框的逻辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node) && !message.responseRequired) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [message.responseRequired, onClose]);
  
  // 处理自定义响应提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customResponse.trim()) {
      onResponse(customResponse, message.eventId);
    }
  };
  
  return (
    // 模态对话框背景 - 覆盖整个屏幕，半透明黑色
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* 对话框内容容器 */}
      <div 
        ref={dialogRef}
        className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700"
      >
        {/* 对话框标题和关闭按钮 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">User Input Required</h3>
          {!message.responseRequired && (
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* 对话框主体内容 */}
        <div className="mb-6">
          {/* 消息内容 */}
          <p className="text-gray-200 mb-4">{message.content}</p>
          
          {/* 选项按钮区域 - 当有预定义选项时显示 */}
          {hasOptions && (
            <div className="flex flex-wrap gap-2 mb-4">
              {message.options!.map((option, index) => (
                <button
                  key={index}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white transition-colors"
                  onClick={() => onResponse(option, message.eventId)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          
          {/* 自定义响应输入框 */}
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex items-center space-x-0">
              <input
                type="text"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-l-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Type your response..."
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-r-md transition-colors border-l-0 border border-indigo-600"
                disabled={!customResponse.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
        
        {/* 必须响应提示 - 当需要响应才能继续时显示 */}
        {message.responseRequired && (
          <div className="text-sm text-amber-400 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>A response is required to continue</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoModePage;
