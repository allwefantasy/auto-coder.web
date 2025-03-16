import React, { useState, useRef, useEffect } from 'react';
import { getMessage } from '../Sidebar/lang';
import { autoCommandService, Message as ServiceMessage } from '../../services/autoCommandService';
import { ChatPanel } from './index';
import EditorComponent from '../Sidebar/EditorComponent';

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
  const [isExpandedEditor, setIsExpandedEditor] = useState(false); // 是否使用扩展编辑器模式
  const [editorContent, setEditorContent] = useState(''); // 编辑器内容
  
  // DOM 引用
  const autoSearchInputRef = useRef<HTMLInputElement>(null); // 搜索输入框引用
  const editorRef = useRef<any>(null); // 编辑器引用

  // 处理编辑器挂载
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    // 设置初始内容
    if (autoSearchTerm) {
      setEditorContent(autoSearchTerm);
    }
    
    // 聚焦编辑器
    editor.focus();
  };

  // 切换到扩展编辑器模式
  const toggleExpandedEditor = () => {
    setIsExpandedEditor(!isExpandedEditor);
    // 如果切换到扩展模式，将当前输入框内容同步到编辑器
    if (!isExpandedEditor) {
      setEditorContent(autoSearchTerm);
    } else {
      // 如果从扩展模式切换回来，将编辑器内容同步到输入框
      setAutoSearchTerm(editorContent);
    }
  };

  // 处理编辑器内容变更
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };

  // 从编辑器提交内容
  const handleEditorSubmit = () => {
    if (editorContent.trim()) {
      setAutoSearchTerm(editorContent);
      setIsExpandedEditor(false);
      // 使用 setTimeout 确保状态更新后再提交
      setTimeout(() => {
        handleAutoSearch(new Event('submit') as unknown as React.FormEvent);
      }, 0);
    }
  };

  // 组件挂载后的初始化效果
  useEffect(() => {
    // 聚焦搜索输入框
    if (autoSearchInputRef.current) {
      autoSearchInputRef.current.focus();
    }

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
      
      {/* 扩展编辑器模态框 */}
      {isExpandedEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-4 border border-gray-700 flex flex-col h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-white">{getMessage('expandedEditor')}</h3>
              <button 
                onClick={toggleExpandedEditor}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden border border-gray-700 rounded-md mb-3">
              <div className="h-full w-full">
                <EditorComponent
                  isMaximized={false}
                  onEditorDidMount={handleEditorDidMount}
                  onShouldSendMessage={handleEditorSubmit}
                  defaultValue={autoSearchTerm}
                  onChange={handleEditorChange}
                  onToggleMaximize={() => {}}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="px-5 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                onClick={toggleExpandedEditor}
              >
                {getMessage('cancel')}
              </button>
              <button
                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleEditorSubmit}
                disabled={!editorContent.trim()}
              >
                {getMessage('submit')}
              </button>
            </div>
          </div>
        </div>
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
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-6 bg-gray-800 rounded-lg p-4">
            <ChatPanel 
              messages={messages} 
              currentTask={lastSubmittedQuery.length > 0 
                ? (lastSubmittedQuery.length > 20 
                  ? `${lastSubmittedQuery.substring(0, 20)}...` 
                  : lastSubmittedQuery)
                : (projectName || getMessage('noProjectSelected'))}
              onUserResponse={handleUserResponse}
            />
          </div>
        )}

        {/* 命令输入区域 - 底部的搜索/命令输入框 */}
        <form onSubmit={handleAutoSearch} className="w-full">
          <div className="relative">
            <input
              ref={autoSearchInputRef}
              type="text"
              className="w-full py-4 px-6 pr-24 rounded-full bg-gray-800 border border-gray-700 text-white text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-lg"
              placeholder={`${getMessage('searchIn')} ${projectName || getMessage('yourProject')}`}
              value={autoSearchTerm}
              onChange={(e) => setAutoSearchTerm(e.target.value)}
              disabled={isProcessing}
            />
            {/* 扩展编辑器按钮 */}
            <button
              type="button"
              className="absolute right-14 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors bg-gray-700 hover:bg-gray-600"
              onClick={toggleExpandedEditor}
              disabled={isProcessing}
              title={getMessage('expandEditor')}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </button>
            {/* 提交按钮 - 位于输入框右侧的搜索图标 */}
            <button
              type="submit"
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${isProcessing ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                // 处理中状态显示旋转加载图标
                <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                // 正常状态显示搜索图标
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </form>

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
