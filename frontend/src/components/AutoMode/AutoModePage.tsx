import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'; // Import lazy and Suspense
import { getMessage } from '../../lang';
import { Message as ServiceMessage, HistoryCommand } from './types';
import { ChatPanel } from './index';
import InputPanel from './InputPanel';
import AskUserDialog from './AskUserDialog'; // Import the new component
import { autoCommandService } from '../../services/autoCommandService';
// Lazy load CommitListPanel and CurrentChangePanel
const CommitListPanel = lazy(() => import('./CommitListPanel'));
const CurrentChangePanel = lazy(() => import('./CurrentChangePanel'));


interface AutoModePageProps {
  projectName: string;
  onSwitchToExpertMode: () => void;
  className?:string
}

interface Message extends ServiceMessage {
  id: string;
  timestamp?: number;
}

const AutoModePage: React.FC<AutoModePageProps> = ({ projectName, onSwitchToExpertMode, className }) => {
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
  const [currentCommits, setCurrentCommits] = useState<any[]>([]); // 当前变化的提交详情
  
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
    
    // 将用户响应添加到消息列表(事件会自动显示，无需在前端添加)
    // setMessages(prev => [...prev, {
    //   id: 'user-response-' + Date.now(),
    //   type: 'USER_RESPONSE',
    //   content: response,
    //   isUser: true,
    //   responseTo: eventId
    // }]);
    
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
  
  // 组件挂载后的初始化效果
  useEffect(() => {
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

  // 添加对标签切换的监听，只有切换到'current-change'时获取当前变更
  useEffect(() => {
    // 只有当切换到"当前变化"标签时，才获取当前变更
    if (activeTab === 'current-change' && currentEventFileId) {
      fetchCurrentChanges(currentEventFileId);
    }
  }, [activeTab, currentEventFileId]);

  // 获取当前变更
  const fetchCurrentChanges = async (current_event_file_id: string) => {
    try {
      // 检查是否存在事件文件ID
      if (!current_event_file_id) {
        // 添加提示消息到消息列表
        console.log('No event file ID available');
        return; // 直接返回，不发起请求
      }
      
      // 构建请求URL，传递事件文件ID参数
      let url = `/api/current-changes?event_file_id=${encodeURIComponent(current_event_file_id)}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // 更新为新的数据结构：直接使用返回的提交数组
        setCurrentCommits(data.commits || []);
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
        
        // 任务真正停止的时候是这个时候
        setIsProcessing(false);
        console.log('AutoModePage: Set isProcessing to false');
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

  

  // 处理自动模式搜索提交
  const handleAutoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 检查是否有来自扩展编辑器的内容
    // 如果有，优先使用扩展编辑器的内容
    const contentToSubmit = (window as any).lastEditorContent || autoSearchTerm;
    
    // 清除临时存储的编辑器内容
    if ((window as any).lastEditorContent) {
      delete (window as any).lastEditorContent;
    }
    
    if (contentToSubmit.trim()) {
      try {
        setIsProcessing(true);
        console.log('AutoModePage: Set isProcessing to true');
        // 保存最后提交的查询
        setLastSubmittedQuery(contentToSubmit);
        // 添加用户消息到消息列表
        setMessages([{
          id: 'user-' + Date.now(),
          type: 'USER',
          content: contentToSubmit,
          isUser: true
        }]);
        // 执行命令并获取事件文件ID
        const result = await autoCommandService.executeCommand(contentToSubmit);
        console.log('AutoModePage: Command executed, received event_file_id:', result.event_file_id);
        // 存储事件文件ID以便后续用户响应使用
        setCurrentEventFileId(result.event_file_id);
        console.log('AutoModePage: Set currentEventFileId to:', result.event_file_id);
        
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
         console.log("query submitted")
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
    <div className={`flex-1 flex flex-col h-screen bg-gray-900 ${className}`}>
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
        <div className="flex flex-col items-center justify-center mb-6 space-y-3">
          <div className="flex items-center">
            <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text font-bold text-3xl">auto-coder.web</span>
          </div>
          <div className="text-gray-400 text-sm font-mono font-medium">
            {getMessage('projectName')}: {projectName}
          </div>
        </div>
        
        {/* 消息区域 - 带滚动功能的主聊天界面，包含ChatPanel组件和侧边栏 */}
        {messages.length > 0 && isMessageAreaVisible && (
          <div className="flex-1 mb-6 flex flex-col items-center w-full overflow-hidden">
            {/* 当自适应模式打开时，容器宽度接近页面宽度 */}
            <div className={`w-full max-h-full ${isMessageAreaAdaptive ? 'max-w-full px-4' : 'max-w-5xl'} flex`}>
              {/* 侧边栏 - 粘性定位，确保滚动时始终保持可见 */}
              <div className="w-48 sticky top-0 self-start max-h-screen bg-gray-800 rounded-l-lg p-4 flex flex-col shadow-lg">
                {/* 标签按钮区域 - 始终保持可见 */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-gray-300 font-medium text-xs uppercase tracking-wider mb-2">{getMessage('navigationMenu')}</h3>
                  <button
                    className={`w-full px-3 py-2 text-left font-medium text-xs rounded-md flex items-center ${activeTab === 'messages' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    onClick={() => setActiveTab('messages')}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {getMessage('showMessages')}
                  </button>
                  <button
                    className={`w-full px-3 py-2 text-left font-medium text-xs rounded-md flex items-center ${activeTab === 'current-change' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    onClick={() => setActiveTab('current-change')}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {getMessage('currentChange')}
                  </button>
                  <button
                    className={`w-full px-3 py-2 text-left font-medium text-xs rounded-md flex items-center ${activeTab === 'commits' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    onClick={() => setActiveTab('commits')}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {getMessage('viewChange')}
                  </button>
                </div>
                
                {/* 控制按钮容器 - 移到侧边栏底部 */}
                <div className="mt-auto flex flex-col space-y-2 pt-4 border-t border-gray-700">
                  <button
                    className="w-full flex items-center justify-center text-gray-400 hover:text-white p-2 transition-colors rounded hover:bg-gray-700"
                    onClick={() => setIsMessageAreaAdaptive(!isMessageAreaAdaptive)}
                    title={isMessageAreaAdaptive ? getMessage('fullScreenWidth') : getMessage('limitedWidth')}
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
                    className="w-full flex items-center justify-center text-gray-400 hover:text-white p-2 transition-colors rounded hover:bg-gray-700"
                    onClick={() => setIsMessageAreaVisible(false)}
                    title={getMessage('close')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* 主内容区域 */}
              <div className={`flex-1 ${isMessageAreaAdaptive ? 'overflow-y-auto' : ''} bg-gray-800 rounded-r-lg p-5 shadow-lg`}>
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
                  // Wrap CurrentChangePanel with Suspense
                  <Suspense fallback={<div className="p-4 text-gray-400 text-center">Loading Changes...</div>}>
                    <CurrentChangePanel 
                      projectName={projectName} 
                      commits={currentCommits} 
                    />
                  </Suspense>
                ) : (
                  // Wrap CommitListPanel with Suspense
                  <Suspense fallback={<div className="p-4 text-gray-400 text-center">Loading Commits...</div>}>
                    <CommitListPanel projectName={projectName} />
                  </Suspense>
                )}
              </div>
            </div>
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
          currentEventFileId={currentEventFileId}
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

export default AutoModePage;