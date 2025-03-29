import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message as AntdMessage, Modal, Input, Select, Button, Layout, Divider, Typography, Space, Dropdown, Menu, Tooltip } from 'antd';
import { PlusOutlined, SettingOutlined, DeleteOutlined, EditOutlined, MessageOutlined, CodeOutlined, MenuOutlined, DownOutlined, SaveOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import ChatListDropdown from './ChatListDropdown';
import './ChatPanel.css';
import InputArea from './InputArea';
import { getMessage } from './lang';
import {
  FileGroup,
  ConfigState,
  CodingEvent,
  ChatPanelProps,
} from './types';
import { FileMetadata } from '../../types/file_meta';
import { chatService } from '../../services/chatService';
import { codingService } from '../../services/codingService';
import { autoCoderConfService } from '../../services/AutoCoderConfService';
import { Message as AutoModeMessage } from '../../components/AutoMode/types';
import MessageList, { MessageProps } from '../../components/AutoMode/MessageList';

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  setPreviewFiles, 
  setRequestId, 
  setActivePanel, 
  setClipboardContent, 
  clipboardContent, 
  projectName = '',
  setSelectedFiles 
}) => {
  const showNewChatModal = () => {
    // 清空当前对话内容
    setMessages([]);
    
    // 设置默认的新对话名称
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    setNewChatName(`chat_${timestamp}`);
    
    // 显示新对话模态框
    setIsNewChatModalVisible(true);
  };

  const handleNewChatCancel = () => {
    setIsNewChatModalVisible(false);
    setNewChatName('');
  };

  const handleNewChatCreate = async () => {
    if (!newChatName.trim()) {
      AntdMessage.error('Chat name cannot be empty');
      return;
    }

    try {
      setChatListName(newChatName);
      setMessages([]);
      setChatLists(prev => [newChatName, ...prev]);
      
      // Save the new empty chat list
      await saveChatList(newChatName, []);
      
      // 设置当前会话名称
      await setCurrentSessionName(newChatName);
      
      // Send a /new command to the chat router
      try {
        const response = await fetch('/api/chat-command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command: '/new',
          }),
        });
        
        if (!response.ok) {
          console.warn('Failed to send /new command to chat router');
        }
      } catch (cmdError) {
        console.error('Error sending /new command:', cmdError);
        // Don't show error to user as this is a background operation
      }
      
      AntdMessage.success('New chat created successfully');
      setIsNewChatModalVisible(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
      AntdMessage.error('Failed to create new chat');
    }
  };

  const [messages, setMessages] = useState<AutoModeMessage[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [localRequestId, setLocalRequestId] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [config, setConfig] = useState<ConfigState>({
    human_as_model: false,
    skip_build_index: true,
    project_type: "py",
    extra_conf: {},
    available_keys: []
  });
  const [chatLists, setChatLists] = useState<string[]>([]);
  const [chatListName, setChatListName] = useState<string>('');
  const [showChatListInput, setShowChatListInput] = useState(false);

  const [sendLoading, setSendLoading] = useState<boolean>(false);
  const editorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isWriteMode, setIsWriteMode] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [shouldSendMessage, setShouldSendMessage] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<boolean>(false);
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState<boolean>(false);
  const [newChatName, setNewChatName] = useState<string>('');
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  
  // 添加消息ID计数器，用于生成唯一的消息ID
  const [messageIdCounter, setMessageIdCounter] = useState<number>(0);

  const [shouldSaveMessages, setShouldSaveMessages] = useState<boolean>(false);

  // 添加累计token统计状态
  const [accumulatedStats, setAccumulatedStats] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    contextWindowUsage: 0,
    maxContextWindow: 100, // 默认值
    cacheHits: 0,
    cacheMisses: 0
  });

  // 添加 ref 来跟踪 localRequestId 的最新值
  const localRequestIdRef = useRef<string>('');

  // 当 localRequestId 更新时，同步更新 ref
  useEffect(() => {
    localRequestIdRef.current = localRequestId;
  }, [localRequestId]);

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

  // 添加新的 useEffect 用于滚动到最新消息
  useEffect(() => {
    // 只有当用户在查看底部时，才自动滚动到新消息
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // 添加监听滚动事件的函数，检测用户是否在底部
  const handleScroll = useCallback(() => {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      // 检查是否滚动到底部（考虑一个小的阈值，如40像素）
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
      setIsAtBottom(isNearBottom);
    }
  }, []);

  // 添加滚动事件监听器
  useEffect(() => {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // 初始化时设置isAtBottom
      handleScroll();
    }
    
    // 清理函数
    return () => {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    if (shouldSendMessage) {
      handleSendMessage();
      setShouldSendMessage(false);
    }
  }, [shouldSendMessage]);

  useEffect(() => {
    // 监听配置更新事件
    const handleConfigUpdated = (updatedConfig: ConfigState) => {
      setConfig(updatedConfig);
    };

    // 监听错误事件
    const handleError = (errorMessage: string) => {
      AntdMessage.error(errorMessage);
    };

    // 添加事件监听器
    autoCoderConfService.on('configUpdated', handleConfigUpdated);
    autoCoderConfService.on('error', handleError);

    // 初始加载配置 - 通过服务的事件回调机制自动设置
    // 不需要手动调用 API 了

    // 清理函数
    return () => {
      autoCoderConfService.off('configUpdated', handleConfigUpdated);
      autoCoderConfService.off('error', handleError);
    };
  }, []);

  useEffect(() => {
    fetchChatLists();
    // 初始化时尝试获取当前会话名称
    getCurrentSessionName();
  }, []);

  const fetchChatLists = async () => {
    try {
      const response = await fetch('/api/chat-lists');
      const data = await response.json();

      // 如果有任何聊天记录，自动加载最新的聊天
      if (data.chat_lists && data.chat_lists.length > 0) {
        // 列表中的第一个聊天是最新的，因为它们按修改时间排序
        setChatListName(data.chat_lists[0]);
        setChatLists(data.chat_lists);
        await loadChatList(data.chat_lists[0]);
      } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newChatName = `chat_${timestamp}`;
        setChatListName(newChatName);
        setChatLists([newChatName]);
      }
    } catch (error) {
      console.error('Error fetching chat lists:', error);
      AntdMessage.error('Failed to fetch chat lists');
    }
  };

  // 获取当前会话名称
  const getCurrentSessionName = async () => {
    try {
      const response = await fetch('/api/chat-session/name');
      if (!response.ok) {
        throw new Error('Failed to fetch current session name');
      }
      const data = await response.json();
      if (data.session_name) {
        setChatListName(data.session_name);
        // 如果会话名称有效，加载该会话的消息
        if (!chatLists.includes(data.session_name)) {
          setChatLists(prev => [data.session_name, ...prev]);
        }
        await loadChatList(data.session_name);
      }
    } catch (error) {
      console.error('Error getting current session name:', error);
      // 如果获取失败，不向用户显示错误，而是使用默认行为
    }
  };

  // 设置当前会话名称
  const setCurrentSessionName = async (name: string) => {
    if (!name.trim()) {
      return false;
    }

    try {
      const response = await fetch('/api/chat-session/name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_name: name,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set current session name');
      }
      
      return true;
    } catch (error) {
      console.error('Error setting current session name:', error);
      return false;
    }
  };

  const saveChatList = async (name: string, newMessages: AutoModeMessage[] = []) => {
    console.log('save chat list:', name);
    console.log('messages:', newMessages);
    if (!name.trim()) {
      AntdMessage.error('Please enter a name for the chat list');
      return;
    }

    try {
      const response = await fetch('/api/chat-lists/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          messages: newMessages,
        }),
      });

      if (response.ok) {
        setShowChatListInput(false);
        setChatListName('');
        fetchChatLists();
        
        // 同步更新当前会话名称
        await setCurrentSessionName(name);
      } else {
        console.error('Failed to save chat list', response.json());
      }
    } catch (error) {
      console.error('Error saving chat list:', error);
    }
  };

  const loadChatList = async (name: string) => {
    try {
      const response = await fetch(`/api/chat-lists/${name}`);
      const data = await response.json();
      // Convert legacy Message format to AutoModeMessage if needed
      const convertedMessages = data.messages.map((message: any) => {
        if ('role' in message) {
          // 旧格式，转换为 AutoModeMessage
          return {
            id: message.id || Date.now().toString(),
            type: message.role === 'user' ? 'USER_RESPONSE' : 'RESULT',
            content: message.content,
            contentType: message.contentType || 'markdown',
            language: message.language,
            metadata: message.metadata,
            isUser: message.role === 'user',
            isStreaming: false,
            isThinking: false
          } as AutoModeMessage;
        }
        // 已经是 AutoModeMessage 格式或接近该格式
        return {
          ...message,
          isStreaming: false,
          isThinking: false,
          type: message.type || (message.isUser ? 'USER_RESPONSE' : 'RESULT'),
          contentType: message.contentType || 'markdown'
        } as AutoModeMessage;
      });
      setMessages(convertedMessages);
    } catch (error) {
      console.error('Error loading chat list:', error);
      AntdMessage.error('Failed to load chat list');
    }
  };
  
  // 获取对话标题
  const getChatTitle = () => {
    if (messages.length > 0) {
      // 找到第一条用户消息
      const userMessage = messages.find(msg => 
        msg.isUser || (msg.type === 'USER_RESPONSE'));
      if (userMessage && userMessage.content) {
        // 取前四个字符，如果不足四个字符则取全部
        return userMessage.content.substring(0, 4);
      }
    }
    // 如果没有消息或没有用户消息，返回 New Chat
    return 'New Chat';
  };

  const deleteChatList = async (name: string) => {
    try {
      const response = await fetch(`/api/chat-lists/${name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        AntdMessage.success('Chat list deleted successfully');
        fetchChatLists();
      } else {
        AntdMessage.error('Failed to delete chat list');
      }
    } catch (error) {
      console.error('Error deleting chat list:', error);
      AntdMessage.error('Failed to delete chat list');
    }
  };

  // 添加重命名聊天列表的函数
  const renameChatList = async (oldName: string, newName: string) => {
    try {
      // 验证新名称不为空
      if (!newName.trim()) {
        AntdMessage.error('Chat name cannot be empty');
        return false;
      }

      // 调用重命名API
      const response = await fetch('/api/chat-lists/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_name: oldName,
          new_name: newName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to rename chat list');
      }

      // 更新本地聊天列表
      setChatLists(prev => {
        const newList = [...prev];
        const index = newList.indexOf(oldName);
        if (index !== -1) {
          newList[index] = newName;
        }
        return newList;
      });

      // 如果当前正在使用的聊天列表被重命名，更新当前名称
      if (chatListName === oldName) {
        setChatListName(newName);
      }

      AntdMessage.success(`Chat renamed to ${newName}`);
      return true;
    } catch (error: any) {
      console.error('Error renaming chat list:', error);
      AntdMessage.error(`Failed to rename chat: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  const updateConfig = async (key: string, value: boolean | string) => {
    const success = await autoCoderConfService.updateConfig(key, value);
    if (success) {
      AntdMessage.success('Configuration updated successfully');
    }
  };

  const [pendingResponseEvent, setPendingResponseEvent] = useState<{
    requestId: string;
    eventData: CodingEvent;
  } | null>(null);

  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // 处理任务完成后的逻辑
  const handleTaskCompletion = useCallback(async (hasError: boolean) => {
    if (hasError) {
      AntdMessage.error('Task completed with errors');
    } else {
      AntdMessage.success('Task completed successfully');
      
      // 使用 ref 中的最新值
      const currentRequestId = localRequestIdRef.current;
      console.log('ChatPanel: Task completed successfully');
      console.log('ChatPanel: isWriteMode:', isWriteMode);
      console.log('ChatPanel: currentRequestId:', currentRequestId);
      
      // 在任务完成时设置标记，表示应该保存消息
      // 而不是直接保存，让 useEffect 在消息状态更新后处理保存
      setShouldSaveMessages(true);
      // 等待一个渲染周期
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 如果是编码模式且有eventFileId，获取变更文件并打开
      if (isWriteMode && currentRequestId) {
        try {
          const response = await fetch(`/api/current-changes?event_file_id=${currentRequestId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch current changes');
          }
          const data = await response.json();
          console.log('ChatPanel: Received current changes:', data);
          if (data.commits && data.commits.length > 0) {
            const commit_id = data.commits[0]["hash"]
            const response = await fetch(`/api/commits/${commit_id}`);
            if (!response.ok) {
              throw new Error('Failed to fetch commit details');
            }
            const commit_data = await response.json();            
            const changed_files = commit_data["files"]
            console.log('ChatPanel: Changed files:', changed_files);
            // Convert changed_files to FileMetadata format
            const fileMetadataList: FileMetadata[] = changed_files.map((file: {filename: string}) => ({
              path: file.filename,
              isSelected: true,
              modifiedBy: 'expert_chat_box'
            }));
            setSelectedFiles(fileMetadataList);
            setActivePanel('code');            
          }                    
        } catch (error) {
          console.error('Error fetching current changes:', error);
          AntdMessage.error('Failed to fetch changed files');
        }
      }
    }
    setSendLoading(false);
    setRequestId("");
    setLocalRequestId("");    
  }, [isWriteMode, setSelectedFiles, setActivePanel, setSendLoading, setRequestId, setLocalRequestId, setShouldSaveMessages]);

  const fetchFileGroups = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;

    if (timeSinceLastFetch >= 30000) { // 30秒
      try {
        const response = await fetch('/api/file-groups');
        if (!response.ok) throw new Error('Failed to fetch file groups');
        const data = await response.json();
        setFileGroups(data.groups);
        setLastFetchTime(now);
      } catch (error) {
        console.error('Failed to load file groups');
      }
    }
  }, [lastFetchTime]);

  // 初始加载
  useEffect(() => {
    fetchFileGroups();
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
  };

  // 方便手动添加用户消息
  const addUserMessage = (content: string) => {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const nextId = messageIdCounter + 1;
    setMessageIdCounter(nextId);
    
    const newMessage: AutoModeMessage = {
      id: `user-${uuid}-${timestamp}-${nextId}`,
      type: 'USER_RESPONSE',
      content,
      contentType: 'markdown',
      isUser: true,
      isStreaming: true,
      isThinking: false
    };
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      if (newMessages.length > 0 && chatListName) {
        saveChatList(chatListName, newMessages);
      }
      return newMessages;
    });
    return newMessage.id;
  };

  // 方便手动添加机器人消息
  const addBotMessage = (content: string) => {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const nextId = messageIdCounter + 1;
    setMessageIdCounter(nextId);
    
    const newMessage: AutoModeMessage = {
      id: `bot-${uuid}-${timestamp}-${nextId}`,
      type: 'RESULT',
      content,
      contentType: 'markdown',
      isUser: false,
      isStreaming: false,
      isThinking: false
    };
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      if (newMessages.length > 0 && chatListName) {
        saveChatList(chatListName, newMessages);
      }
      return newMessages;
    });
    return newMessage.id;
  };



  const updateMessageStatus = (messageId: string, status: 'sending' | 'sent' | 'error') => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isStreaming: status === 'sending', isThinking: status === 'sending' }
          : msg
      )
    );
  };

  const handleRevert = async () => {    
  };

  // 消息已经是 AutoMode 格式，所以不需要转换
  const getAutoModeMessages = (): MessageProps[] => {
    return messages;
  };

  // 添加一个 useEffect 来处理消息保存，当 messages 或 shouldSaveMessages 变化时触发
  useEffect(() => {
    // 仅当需要保存且有消息且有聊天名称时保存
    if (shouldSaveMessages && chatListName && messages.length > 0) {
      saveChatList(chatListName, messages);
      console.log('Chat list saved with latest messages:', chatListName);
      // 重置保存标记
      setShouldSaveMessages(false);
    }
  }, [messages, shouldSaveMessages, chatListName]);

  // 处理来自聊天和编码服务的消息事件
  const setupMessageListener = (service: typeof chatService | typeof codingService) => {
    service.on('message', (autoModeMessage: AutoModeMessage) => {
      // 直接添加或更新 AutoMode 消息到我们的消息状态
      console.log('ChatPanel: Received message from service:', 
        service === chatService ? 'chatService' : 'codingService', 
        autoModeMessage.type, 
        autoModeMessage.id);
      setMessages(prev => {
        const existingMessageIndex = prev.findIndex(msg => msg.id === autoModeMessage.id);
        if (existingMessageIndex !== -1) {
          // 更新现有消息
          const updatedMessages = [...prev];
          updatedMessages[existingMessageIndex] = autoModeMessage;
          return updatedMessages;
        } else {
          // 添加新消息
          return [...prev, autoModeMessage];
        }
      });
    });

    service.on('taskComplete', handleTaskCompletion);
  };

  // 在组件挂载时设置事件监听器
  useEffect(() => {
    setupMessageListener(chatService);
    setupMessageListener(codingService);

    // 在组件卸载时清理事件监听器
    return () => {
      chatService.removeAllListeners();
      codingService.removeAllListeners();
    };
  }, []);
  
  // 新消息到达时自动滚动到底部
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  const handleSendMessage = async () => {
    const trimmedText = editorRef.current?.getValue()?.trim();
    if (!trimmedText) {
      AntdMessage.warning('Please enter a message');
      return;
    }

    const messageId = addUserMessage(trimmedText);
    editorRef.current?.setValue("");    
    setSendLoading(true);
    updateMessageStatus(messageId, 'sent');

    try {
      // 根据当前模式使用适当的服务
      if (isWriteMode) {
        // 编码模式
        console.log('ChatPanel: Sending message to codingService');
        const result = await codingService.executeCommand(`${trimmedText}`);
        console.log('ChatPanel: Received result from codingService:', result);
        setRequestId(result.event_file_id);
        setLocalRequestId(result.event_file_id);
      } else {
        // 聊天模式
        console.log('ChatPanel: Sending message to chatService');
        const result = await chatService.executeCommand(trimmedText);
        console.log('ChatPanel: Received result from chatService:', result);
        setRequestId(result.event_file_id);
        setLocalRequestId(result.event_file_id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      AntdMessage.error('Failed to send message');
      updateMessageStatus(messageId, 'error');
      addBotMessage(getMessage('processingError'));
      setSendLoading(false);
    }
  };

  // 处理停止生成的函数
  const handleStopGeneration = async () => {
    try {
      // 根据当前模式使用适当的服务来取消任务
      if (isWriteMode) {
        await codingService.cancelTask();
      } else {
        await chatService.cancelTask();
      }
      
      AntdMessage.info(getMessage('generationStopped'));
      setSendLoading(false);
    } catch (error) {
      console.error('Error stopping generation:', error);
      AntdMessage.error('Failed to stop generation');
    }
  };

  // 删除聊天列表的处理函数
  const handleDeleteChat = async (name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除对话 "${name}" 吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteChatList(name);
        AntdMessage.success('对话已删除');
      },
    });
  };

  // 生成聊天列表下拉菜单项，添加新建对话选项作为第一项
  const chatListMenuItems = [
    {
      key: 'new-chat',
      label: (
        <div className="flex items-center w-full group text-white font-medium">
          <PlusOutlined className="mr-1" style={{ fontSize: '12px' }} />
          <span>新建对话</span>
        </div>
      ),
    },
    // 如果有聊天列表，添加分隔线
    ...(chatLists.length > 0 ? [{ type: 'divider' as const }] : []),
    // 添加现有聊天列表
    ...chatLists.map(name => ({
      key: name,
      label: (
        <div className={`flex justify-between items-center w-full group ${chatListName === name ? 'bg-indigo-700/40 rounded-sm' : ''}`}>
          <span className={`truncate max-w-[180px] ${chatListName === name ? 'text-white font-medium' : 'text-gray-200'}`}>{name}</span>
          <Button 
            type="text" 
            size="small" 
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white" 
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteChat(name);
            }}
          />
        </div>
      ),
    })),
  ];

  return (
    <>
    <Layout className="h-screen flex flex-col overflow-hidden">
      {/* 头部导航栏 */}
      <Layout.Header className="bg-gray-800 px-2 py-0.5 h-8 flex justify-between items-center border-b border-gray-700 shadow-sm transition-all duration-300 sticky top-0 z-10">
        <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center flex-shrink-0">
            <svg className="w-3 h-3 mr-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text font-bold text-xs">auto-coder.web</span>
          </div>
          <div className="flex items-center min-w-0 flex-1 overflow-hidden">
            <span className="text-gray-400 text-xs mx-0.5">|</span>
            <div className="flex items-center min-w-0 flex-1 overflow-hidden">
              <span className="text-gray-200 text-xs font-medium truncate">
                {projectName || getMessage('noProjectSelected')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <ChatListDropdown
            chatListName={chatListName}
            chatLists={chatLists}
            setChatListName={setChatListName}
            loadChatList={loadChatList}
            setCurrentSessionName={setCurrentSessionName}
            showNewChatModal={showNewChatModal}
            deleteChatList={deleteChatList}
            getChatTitle={getChatTitle}
            renameChatList={renameChatList}
          />
          
          <Tooltip title="保存当前对话">
            <Button 
              icon={<SaveOutlined style={{ fontSize: '10px' }} />} 
              onClick={() => {
                if (chatListName && messages.length > 0) {
                  // 使用与自动保存相同的机制
                  setShouldSaveMessages(true);
                  AntdMessage.success('对话已保存');
                } else if (!chatListName) {
                  AntdMessage.warning('请先选择或创建一个对话');
                } else {
                  AntdMessage.warning('没有消息可保存');
                }
              }}
              className="text-gray-300 border-gray-600 bg-gray-700 hover:bg-gray-600 px-1 py-0 h-6 w-6 flex items-center justify-center"
              size="small"
            />
          </Tooltip>
          
          <Tooltip title="设置">
            <Button 
              icon={<SettingOutlined style={{ fontSize: '10px' }} />} 
              onClick={() => setShowConfig(!showConfig)}
              className="text-gray-300 border-gray-600 bg-gray-700 hover:bg-gray-600 px-1 py-0 h-6 w-6 flex items-center justify-center"
              size="small"
            />
          </Tooltip>
        </div>
      </Layout.Header>
      
      {/* 消息列表区域 */}
      <Layout.Content className="flex-1 overflow-hidden flex flex-col">
        <div 
          className="flex-1 overflow-y-auto bg-gray-900 p-2 transition-all duration-300" 
          id="chat-messages-container"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Token统计组件 */}
          {messages.length > 0 && (
            <div className="sticky top-0 right-0 float-right bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-md p-2 m-1 shadow-md z-10">
              <div className="font-mono text-xs text-gray-400 flex flex-col items-end gap-1 text-[11px]">
                <div className="flex items-center">
                  <span>{getMessage('tokens')}: </span>
                  <span className="text-green-500 ml-1">↑ {accumulatedStats.inputTokens}</span>
                  <span className="text-red-500 ml-1">↓ {accumulatedStats.outputTokens}</span>
                </div>
                {(accumulatedStats.cacheHits > 0 || accumulatedStats.cacheMisses > 0) && (
                  <div className="flex items-center">
                    <span>{getMessage('cache')}: </span>
                    <span className="text-white ml-1">⊕ {accumulatedStats.cacheHits}</span>
                    <span className="text-white ml-1">→ {accumulatedStats.cacheMisses}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <span>{getMessage('apiCost')}: </span>
                  <span className="text-white ml-1">${accumulatedStats.totalCost.toFixed(5)}</span>
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 animate-fade-in">
              <MessageOutlined style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.5 }} />
              <Typography.Title level={5} className="text-gray-300 mb-1">
                开始一个新的对话
              </Typography.Title>
              <Typography.Text className="text-gray-400 text-center max-w-md text-xs">
                有任何问题都可以在下方输入，我会尽力帮助您。
              </Typography.Text>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <MessageList
                messages={getAutoModeMessages()}
                onUserResponse={async (response, eventId) => {
                  if (eventId && pendingResponseEvent) {
                    const { requestId, eventData } = pendingResponseEvent;
                    await fetch('/api/event/response', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        request_id: requestId,
                        event: eventData,
                        response: JSON.stringify({ "value": response })
                      })
                    });
                    setPendingResponseEvent(null);
                  }
                }}
              />
            </div>
          )}
          <div ref={messagesEndRef} />
          
          {/* 添加"滚动到底部"按钮，当有新消息且用户不在底部时显示 */}
          {!isAtBottom && messages.length > 0 && (
            <Button
              type="primary"
              shape="circle"
              size="small"
              icon={<DownOutlined />}
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                setIsAtBottom(true);
              }}
              className="fixed bottom-24 right-4 z-10 bg-indigo-600 hover:bg-indigo-700 border-0 shadow-lg flex items-center justify-center"
              style={{ width: '36px', height: '36px' }}
            />
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="border-t border-gray-700 bg-gray-800 transition-all duration-300 shadow-inner">
          <InputArea
            showConfig={showConfig}
            setShowConfig={setShowConfig}
            config={config}
            updateConfig={updateConfig}
            fileGroups={fileGroups}
            selectedGroups={selectedGroups}
            setSelectedGroups={setSelectedGroups}
            fetchFileGroups={fetchFileGroups}
            isMaximized={isMaximized}
            setIsMaximized={setIsMaximized}
            handleEditorDidMount={handleEditorDidMount}
            setShouldSendMessage={setShouldSendMessage}
            isWriteMode={isWriteMode}
            setIsWriteMode={setIsWriteMode}
            handleRevert={handleRevert}
            handleSendMessage={handleSendMessage}
            handleStopGeneration={handleStopGeneration}
            sendLoading={sendLoading}
            setConfig={setConfig}
            isFullScreen={isMaximized}
            showFileGroupSelect={true}
          />
        </div>
      </Layout.Content>
    </Layout>

    {/* 新建对话模态框 */}
    <Modal
      title={<span style={{ color: '#FFFFFF' }}>创建新对话</span>}
      open={isNewChatModalVisible}
      onOk={handleNewChatCreate}
      onCancel={handleNewChatCancel}
      okText="创建"
      cancelText="取消"
      centered
      okButtonProps={{ 
        disabled: !newChatName.trim(),
        style: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' } 
      }}
      bodyStyle={{ backgroundColor: '#1F2937', color: '#E5E7EB' }}
      style={{ top: 20 }}
      className="custom-modal"
    >
      <div className="mb-4">
        <Typography.Text strong className="block mb-2" style={{ color: '#FFFFFF' }}>对话名称</Typography.Text>
        <Input 
          value={newChatName} 
          onChange={(e) => setNewChatName(e.target.value)}
          placeholder="请输入新对话的名称"
          onPressEnter={handleNewChatCreate}
          prefix={<MessageOutlined style={{ color: '#8B5CF6' }} />}
          autoFocus
          size="large"
          style={{ backgroundColor: '#374151', borderColor: '#4B5563', color: '#FFFFFF' }}
        />
        {!newChatName.trim() && (
          <Typography.Text type="danger" className="mt-1 block">
            对话名称不能为空
          </Typography.Text>
        )}
      </div>
    </Modal>
    </>
  );
};

export default ChatPanel;