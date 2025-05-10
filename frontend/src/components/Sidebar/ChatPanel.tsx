import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message as AntdMessage, Modal, Input, Select, Button, Layout, Divider, Typography, Space, Dropdown, Menu, Tooltip } from 'antd';
import { PlusOutlined, SettingOutlined, DeleteOutlined, EditOutlined, MessageOutlined, CodeOutlined, MenuOutlined, DownOutlined, SaveOutlined, ClearOutlined, PictureOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import ChatListDropdown from './ChatListDropdown';
import html2canvas from 'html2canvas';
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
import { ServiceFactory } from '../../services/ServiceFactory';
import { Message as AutoModeMessage } from '../../components/AutoMode/types';
import MessageList, { MessageProps } from '../../components/AutoMode/MessageList';
import eventBus from '../../services/eventBus';
import { EVENTS } from '../../services/eventBus';
import { playTaskComplete, playErrorSound } from '../../components/AutoMode/utils/SoundEffects';
import { NewChatEventData, AgenticModeChangedEventData, HotkeyEventData, FileGroupSelectionUpdatedEventData, SendMessageEventData, StopGenerationEventData } from '../../services/event_bus_data';

const ChatPanel: React.FC<ChatPanelProps> = ({
  setPreviewFiles,
  setRequestId,
  setActivePanel,
  setClipboardContent,
  clipboardContent,
  projectName = '',
  setSelectedFiles,
  panelId = '',
  isActive = true
}) => {
  // 使用ServiceFactory获取对应服务
  const chatService = ServiceFactory.getChatService(panelId);
  const codingService = ServiceFactory.getCodingService(panelId);
  const agenticEditService = ServiceFactory.getAgenticEditService(panelId);
  const autoCoderConfService = ServiceFactory.getAutoCoderConfService(panelId);
  const chatListService = ServiceFactory.getChatListService(panelId);
  const fileGroupService = ServiceFactory.getFileGroupService(panelId);

  // Step By Step 模式标记
  const [enableAgenticMode, setEnableAgenticMode] = React.useState<boolean>(true);
  // Rule 模式标记
  const [isRuleMode, setIsRuleMode] = useState<boolean>(false);
  // 是否启用声音效果
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const soundEnabledRef = useRef<boolean>(false);
  
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  

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
      AntdMessage.error('聊天名称不能为空');
      return;
    }

    try {
      setChatListName(newChatName);
      setMessages([]);
      setChatLists(prev => [newChatName, ...prev]);

      // 保存新的空聊天列表
      await chatListService.saveChatList(newChatName, [], panelId);

      AntdMessage.success('新聊天创建成功');
      setIsNewChatModalVisible(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
      AntdMessage.error('创建新聊天失败');
    }
  };

  // 创建新对话，无需用户确认
  const handleNewChatDirectly = async (message: NewChatEventData) => {    
    // 如果传入了panelId且与当前面板的panelId不匹配，则不处理此事件
    if (message.panelId && message.panelId !== panelId) {
      return;
    }
    
    try {
      // 清空当前对话内容
      setMessages([]);

      const newChatName = await chatListService.createNewChat(panelId);
      if (newChatName) {
        // 设置新的对话名称
        setChatListName(newChatName);
        setChatLists(prev => [newChatName, ...prev.filter(name => name !== newChatName)]);        
      }
    } catch (error) {
      console.error('Error creating new chat directly:', error);
      AntdMessage.error('创建新聊天失败');
    }
  };

  const [messages, setMessages] = useState<AutoModeMessage[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [localRequestId, setLocalRequestId] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [config, setConfig] = useState<ConfigState>({
    human_as_model: false,
    extra_conf: {},
    available_keys: []
  });
  const [chatLists, setChatLists] = useState<string[]>([]);
  const [chatListName, setChatListName] = useState<string>('');
  const [showChatListInput, setShowChatListInput] = useState(false);

  const [sendLoading, setSendLoading] = useState<boolean>(false);
  const editorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null); // 添加消息容器的引用，用于导出图片
  const [isWriteMode, setIsWriteMode] = useState<boolean>(true);

  const isWriteModeRef = useRef<boolean>(true);

  useEffect(() => {
    isWriteModeRef.current = isWriteMode;
  }, [isWriteMode]);

  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [pendingRevert, setPendingRevert] = useState<boolean>(false);
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState<boolean>(false);
  const [newChatName, setNewChatName] = useState<string>('');  
  const [lastSelectedGroups, setLastSelectedGroups] = useState<string[]>([]);
  const [lastSelectedFiles, setLastSelectedFiles] = useState<string[]>([]);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  // 添加RAG启用状态
  const [enableRag, setEnableRag] = useState<boolean>(false);
  // 添加MCP启用状态
  const [enableMCPs, setEnableMCPs] = useState<boolean>(false);

  // Step By Step 模式标记已上移至顶部定义

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
    let maxContextWindow = 0;
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

      if (message.metadata?.path === "/agent/edit/window_length_change"){
        const content = JSON.parse(message.content)
        contextWindowUsage = content.tokens_used
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
    const container = messagesContainerRef.current;
    if (container) {
      // 检查是否滚动到底部（考虑一个小的阈值，如100像素）
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setIsAtBottom(isNearBottom);
    }
  }, []);

  // 添加滚动事件监听器
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // 初始化时设置isAtBottom
      handleScroll();
    }

    // 清理函数
    return () => {
      const container = messagesContainerRef.current;
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

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
    getCurrentSessionName();
    fetchChatLists();        
  }, [panelId]);

  const fetchChatLists = async () => {
    try {
      const lists = await chatListService.fetchChatLists();

      // 如果有任何聊天记录，自动加载最新的聊天
      if (lists && lists.length > 0) {                
        setChatLists(lists);        
      } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newChatName = `chat_${timestamp}`;
        setChatListName(newChatName);
        setChatLists([newChatName]);
      }
    } catch (error: any) {
      console.error('Error fetching chat lists:', error);
      AntdMessage.error('获取聊天列表失败');
    }
  };

  // 获取当前会话名称
  const getCurrentSessionName = async () => {
    try {
      // 修改为传递panelId参数，以获取特定面板的会话信息
      const sessionInfo = await chatListService.getCurrentSessionName(panelId);
      if (sessionInfo) {
        // 支持新的返回格式，可能是字符串或包含sessionName属性的对象
        const sessionName = typeof sessionInfo === 'string' ? sessionInfo : sessionInfo.sessionName;        
        if (sessionName) {
          setChatListName(sessionName);
          // 如果会话名称有效，加载该会话的消息
          if (!chatLists.includes(sessionName)) {
            setChatLists(prev => [sessionName, ...prev]);
          }
          await loadChatList(sessionName);
        }
      }
    } catch (error: any) {
      console.error('Error getting current session name:', error);
      // 如果获取失败，不向用户显示错误，而是使用默认行为
    }
  };

  // 设置当前会话名称
  const setCurrentSessionName = async (name: string) => {
    // 修改为传递panelId参数，以便为特定面板设置会话信息
    return await chatListService.setCurrentSessionName(name, panelId);
  };

  const saveChatList = async (name: string, newMessages: AutoModeMessage[] = [], mPanelId: string = panelId) => {
    console.log('save chat list:', name);
    console.log('messages:', newMessages);
    
    const success: boolean = await chatListService.saveChatList(name, newMessages, mPanelId);
    if (success) {
      setShowChatListInput(false);
      fetchChatLists();
    }
  };

  const loadChatList = async (name: string) => {
    try {
      const convertedMessages = await chatListService.loadChatList(name, panelId);
      setMessages(convertedMessages);
    } catch (error: any) {
      console.error('Error loading chat list:', error);
      AntdMessage.error('加载聊天列表失败');
    }
  };

  // 获取对话标题
  const getChatTitle = () => {
    return chatListService.getChatTitle(messages);
  };

  const deleteChatList = async (name: string) => {
    try {
      const success = await chatListService.deleteChatList(name);
      if (success) {
        AntdMessage.success('聊天列表已成功删除');
        fetchChatLists();
      } else {
        AntdMessage.error('删除聊天列表失败');
      }
    } catch (error) {
      console.error('Error deleting chat list:', error);
      AntdMessage.error('删除聊天列表失败');
    }
  };

  // 添加重命名聊天列表的函数
  const renameChatList = async (oldName: string, newName: string) => {
    try {
      const success = await chatListService.renameChatList(oldName, newName, panelId);
      if (success) {
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

        AntdMessage.success(`聊天已重命名为 ${newName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error renaming chat list:', error);
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
      if (soundEnabledRef.current) {
        console.log("play error sound")
        playErrorSound();
      }
    } else {
      AntdMessage.success('Task completed successfully');      

      // 使用 ref 中的最新值
      const currentRequestId = localRequestIdRef.current;      

      // 在任务完成时设置标记，表示应该保存消息
      // 而不是直接保存，让 useEffect 在消息状态更新后处理保存
      setShouldSaveMessages(true);
      // 等待一个渲染周期
      await new Promise(resolve => setTimeout(resolve, 0));

      // 如果是编码模式且有eventFileId，获取变更文件并打开
      if (isWriteModeRef.current && currentRequestId) {
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
            const fileMetadataList: FileMetadata[] = changed_files.map((file: { filename: string }) => ({
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
    if (soundEnabledRef.current) {
      console.log("play task completed")
      playTaskComplete()
    }
  }, [isWriteMode, setSelectedFiles, setActivePanel, setSendLoading, setRequestId, setLocalRequestId, setShouldSaveMessages, soundEnabled]);

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
      chatListService.saveChatList(chatListName, messages, panelId)
        .then((success: boolean) => {
          if (success) {
            console.log('Chat list saved with latest messages:', chatListName);
          }
          // 重置保存标记
          setShouldSaveMessages(false);
        })
        .catch((error: any) => {
          console.error('Error saving chat list:', error);
          // 重置保存标记
          setShouldSaveMessages(false);
        });
    }
  }, [messages, shouldSaveMessages, chatListName, panelId]);

  // 处理来自聊天和编码服务的消息事件
  const setupMessageListener = (service: typeof chatService | typeof codingService | typeof agenticEditService) => {
    
    service.on('message', (autoModeMessage: AutoModeMessage) => {
      // 直接添加或更新 AutoMode 消息到我们的消息状态
      console.log('ChatPanel: Received message from service:',
        service === chatService ? 'chatService' : 'codingService',
        autoModeMessage.type,
        autoModeMessage.id);

      eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, autoModeMessage); 

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

  // 处理从特定消息重新开始对话
  const handleRefreshFromMessage = useCallback((data: { messageId: string, messageContent: string, panelId?: string }) => {
    // 检查事件是否与当前面板相关
    if (data.panelId && data.panelId !== panelId) {
      return; // 如果事件不属于当前面板，直接返回
    }
    
    // 清理该消息后面的所有消息
    setMessages(prevMessages => {
      // 找到消息在数组中的实际位置
      const messagePosition = prevMessages.findIndex(msg => msg.id === data.messageId);
      if (messagePosition === -1) return prevMessages; // 如果找不到消息，不做任何改变

      // 只保留到该消息的所有消息（包括该消息）
      return prevMessages.slice(0, messagePosition);
    });

    // 设置编辑器内容为该消息的内容，准备重新发送
    if (editorRef.current) {
      editorRef.current.setValue(data.messageContent);

      // 等待DOM更新后，聚焦编辑器并自动提交消息
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          // 可选：自动提交消息
          // handleSendMessage();
        }
      }, 100);
    }

    // 滚动到底部
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);

  }, [panelId]);

  // 在组件挂载时设置事件监听器
  useEffect(() => {
    setupMessageListener(chatService);
    setupMessageListener(codingService);
    setupMessageListener(agenticEditService);

    // 订阅刷新消息事件
    const unsubscribeRefresh = eventBus.subscribe(
      EVENTS.CHAT.REFRESH_FROM_MESSAGE,
      handleRefreshFromMessage
    );

    // 订阅NEW_MESSAGE事件，处理字符串类型的消息
    const unsubscribeNewMessage = eventBus.subscribe(
      EVENTS.CHAT.NEW_MESSAGE,
      (message: any) => {
        // 如果消息包含 panelId 且与当前面板不匹配，直接返回
        if (message && typeof message === 'object' && message.panelId && message.panelId !== panelId) {
          return;
        }
        
        // 检查message是否为对象且具有action和commit_id属性
        if (message && typeof message === 'object' && message.action && message.commit_id) {
          console.log('ChatPanel: Received object message from eventBus:', message);
          
          const {action, commit_id, mode} = message;
          
          // 如果mode为chat，设置isWriteMode为false
          if (mode === 'chat') {
            setIsWriteMode(false);
          }
          
          // 根据action构建不同的命令格式
          let command = '';
          if (action === 'review') {
            command = `/review commit=${commit_id}`;
          }
          
          // 将消息内容填入编辑器
          if (command && editorRef.current) {
            editorRef.current.setValue(command);
            // 自动发送消息
            handleSendMessage();
          }
        } else if (typeof message === 'string') {
          // 向后兼容，仍然处理字符串类型的消息
          console.log('ChatPanel: Received string message from eventBus:', message);
          if (editorRef.current) {
            editorRef.current.setValue(message);
            handleSendMessage();
          }
        }
      }
    );

    // 订阅RAG启用状态变更事件
    const unsubscribeRagEnabled = eventBus.subscribe(
      EVENTS.RAG.ENABLED_CHANGED,
      (enabled: boolean, eventPanelId?: string) => {
        // 如果事件指定了panelId且与当前面板不匹配，直接返回
        if (eventPanelId && eventPanelId !== panelId) {
          return;
        }
        
        console.log('ChatPanel: RAG enabled changed to', enabled);
        setEnableRag(enabled);
      }
    );

    // 订阅MCP启用状态变更事件
    const unsubscribeMCPsEnabled = eventBus.subscribe(
      EVENTS.MCPS.ENABLED_CHANGED,
      (enabled: boolean, eventPanelId?: string) => {
        // 如果事件指定了panelId且与当前面板不匹配，直接返回
        if (eventPanelId && eventPanelId !== panelId) {
          return;
        }
        
        console.log('ChatPanel: MCPs enabled changed to', enabled);
        setEnableMCPs(enabled);
      }
    );

    // 订阅新建对话事件 - 使用直接创建函数
    const unsubscribeNewChat = eventBus.subscribe(
      EVENTS.CHAT.NEW_CHAT,
      handleNewChatDirectly
    );

    // 订阅 Step By Step 状态变更事件
    const unsubscribeAgentic = eventBus.subscribe(
      EVENTS.AGENTIC.MODE_CHANGED,
      (data: AgenticModeChangedEventData) => {
        // 如果事件指定了panelId且与当前面板不匹配，直接返回
        if (data.panelId && data.panelId !== panelId) {
          return;
        }
        
        console.log('ChatPanel: Step By Step mode changed to', data.enabled);
        setEnableAgenticMode(data.enabled);
      }
    );

    // 监听发送消息事件
    const handleSendMessageEvent = (data: SendMessageEventData) => {
      // 如果传入了panelId且与当前面板的panelId不匹配，则不处理此事件
      if (data.panelId && data.panelId !== panelId) {
        return;
      }
      
      // 调用发送消息函数
      handleSendMessage(data.text);
    };

    // 订阅发送消息事件
    const unsubscribeSendMessage = eventBus.subscribe(
      EVENTS.CHAT.SEND_MESSAGE,
      handleSendMessageEvent
    );

    // 监听停止生成事件
    const handleStopGenerationEvent = (data: StopGenerationEventData) => {
      // 如果传入了panelId且与当前面板的panelId不匹配，则不处理此事件
      if (data.panelId && data.panelId !== panelId) {
        return;
      }
      
      // 调用停止生成函数
      handleStopGeneration();
    };
    
    // 订阅停止生成事件
    const unsubscribeStopGeneration = eventBus.subscribe(
      EVENTS.CHAT.STOP_GENERATION,
      handleStopGenerationEvent
    );

    // 清理函数
    return () => {
      chatService.removeAllListeners();
      codingService.removeAllListeners();
      agenticEditService.removeAllListeners();
      unsubscribeRefresh();
      unsubscribeNewMessage();
      unsubscribeRagEnabled();
      unsubscribeNewChat();
      unsubscribeMCPsEnabled();
      unsubscribeAgentic();
      unsubscribeSendMessage();
      unsubscribeStopGeneration()

    };
  }, [handleRefreshFromMessage]);

  // 新消息到达时自动滚动到底部
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  const handleSendMessage = async (text?: string) => {        
    console.log('==== 发送消息时的状态 ====');
    console.log('chatListName:', chatListNameRef.current);
    console.log('messages 长度:', messagesRef.current.length);
    console.log('isWriteMode:', isWriteModeRef.current);
    console.log('isRuleMode:', isRuleModeRef.current);
    console.log('enableAgenticMode:', enableAgenticModeRef.current);
    console.log('enableRag:', enableRagRef.current);
    console.log('enableMCPs:', enableMCPsRef.current);
    console.log('lastSelectedGroups:', lastSelectedGroupsRef.current);
    console.log('lastSelectedFiles:', lastSelectedFilesRef.current);
    console.log('messageIdCounter:', messageIdCounterRef.current);
    console.log('panelId:', panelIdRef.current);
    console.log('sendLoading:', sendLoadingRef.current);
    console.log('localRequestId:', localRequestIdRef.current);
    console.log('=======================');

    const trimmedText = text?.trim() || editorRef.current?.getValue()?.trim();
    if (!trimmedText) {
      AntdMessage.warning('Please enter a message');
      return;
    }

    // 如果有当前对话名称且有消息，先保存当前对话
    if (chatListNameRef.current && messagesRef.current.length > 0) {
      await saveChatList(chatListNameRef.current, messagesRef.current, panelIdRef.current);
      console.log('Chat list saved before sending new message:', chatListNameRef.current);
    }
  
    // 在发送消息前，再次调用文件组服务确保上下文是最新的
    if (lastSelectedGroupsRef.current.length > 0 || lastSelectedFilesRef.current.length > 0) {
      try {
        console.log('ChatPanel: Re-syncing file groups before sending message', lastSelectedGroupsRef.current, lastSelectedFilesRef.current);        
        // 再切换文件组
        const result = await fileGroupService.switchFileGroups(lastSelectedGroupsRef.current, lastSelectedFilesRef.current);
        console.log('ChatPanel: File groups re-synced successfully', result);
      } catch (error) {
        console.error('ChatPanel: Error re-syncing file groups', error);
        // 继续发送消息，不阻止用户操作
      }
    }else {
      // 清空当前文件组
      try {
        await fileGroupService.clearCurrentFiles();
      } catch (error) {
        console.error('ChatPanel: Error clearing current files', error);
      }
    }  

    // 添加用户消息
    const messageId = addUserMessage(trimmedText);
    editorRef.current?.setValue("");
    setSendLoading(true);
    updateMessageStatus(messageId, 'sent');

    try {
      // 处理Rule模式
      let processedText = trimmedText;
      if (isRuleModeRef.current) {
        console.log('ChatPanel: Rule mode enabled, accessing context prompt');
        try {
          const response = await fetch('/api/rules/context/prompt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: trimmedText
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to get rule context prompt: ${response.statusText}`);
          }
          
          const data = await response.json();
          if (data.prompt) {
            processedText = data.prompt;
            console.log('ChatPanel: Received prompt from rules API');

            // 添加一条系统消息，说明使用了Rule模式
            addBotMessage(getMessage('ruleModePromptGenerated'));
          }
        } catch (error: unknown) {
          console.error('Error fetching rule context prompt:', error);
          // 添加一条bot消息，显示错误信息
          const errorMessage = error instanceof Error ? error.message : String(error);
          addBotMessage(getMessage('ruleModePromptError', { error: errorMessage }));
          return;
        }
      }

      // 根据当前模式使用适当的服务
      if (isWriteModeRef.current || isRuleModeRef.current) {
        // 编码模式
        if (enableAgenticModeRef.current) {
          console.log('ChatPanel: Step By Step enabled, using agenticEditService');
          const result = await agenticEditService.executeCommand(processedText, true);
          console.log('ChatPanel: Received result from agenticEditService:', result);
          setRequestId(result.event_file_id);
          setLocalRequestId(result.event_file_id);
        } else {
          console.log('ChatPanel: Sending message to codingService');
          const result = await codingService.executeCommand(`${processedText}`);
          console.log('ChatPanel: Received result from codingService:', result);
          setRequestId(result.event_file_id);
          setLocalRequestId(result.event_file_id);
        }

      } else {
        // 聊天模式
        console.log('ChatPanel: Sending message to chatService');

        let commandText = processedText;

        // 检查是否同时启用了 RAG 和 MCP
        if (enableRagRef.current && enableMCPsRef.current && !isWriteModeRef.current) {
          Modal.warning({
            title: getMessage('ragMcpConflictTitle'),
            content: getMessage('ragMcpConflictContent'),
            centered: true,
          });
          setSendLoading(false); // 重置加载状态
          return; // 阻止发送消息
        }

        // 检查是否启用了RAG（且未启用MCP）
        if (enableRagRef.current && !enableMCPsRef.current && !isWriteModeRef.current) {
          console.log('ChatPanel: RAG enabled, prepending /rag to message');
          commandText = `/rag ${processedText}`;
        }
        // 检查是否启用了MCP（且未启用RAG）
        else if (enableMCPsRef.current && !enableRagRef.current && !isWriteModeRef.current) {
          console.log('ChatPanel: MCPs enabled, prepending /mcp to message');
          commandText = `/mcp ${processedText}`;
        }
        const result = await chatService.executeCommand(commandText);
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
      // 根据当前模式和子模式使用适当的服务来取消任务
      if (isWriteModeRef.current || isRuleModeRef.current) {
        if (enableAgenticModeRef.current) {
          console.log('ChatPanel: Stopping agentic edit task');
          await agenticEditService.cancelTask();
        } else {
          console.log('ChatPanel: Stopping coding task');
          await codingService.cancelTask();
        }
      } else {
        console.log('ChatPanel: Stopping chat task');
        await chatService.cancelTask();
      }

      AntdMessage.info(getMessage('generationStopped'));
      setSendLoading(false);
    } catch (error) {
      console.error('Error stopping generation:', error);
      AntdMessage.error('Failed to stop generation');
    }
  };

  // 导出消息列表为完整图片（自动展开滚动区域）
  const handleExportMessagesAsImage = async () => {
    const container = messagesContainerRef.current;
    if (!container) {
      AntdMessage.error('未找到消息列表区域');
      return;
    }
    // 记录原始样式
    const originalHeight = container.style.height;
    const originalMaxHeight = container.style.maxHeight;
    const originalOverflow = container.style.overflow;

    try {
      // 展开消息区域，确保完整内容渲染
      container.style.height = container.scrollHeight + 'px';
      container.style.maxHeight = 'none';
      container.style.overflow = 'visible';

      // 等待浏览器渲染
      await new Promise(resolve => requestAnimationFrame(resolve));

      const canvas = await html2canvas(container, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `chat_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      link.click();
    } catch (error) {
      console.error('导出图片失败:', error);
      AntdMessage.error('导出图片失败');
    } finally {
      // 恢复原样式
      container.style.height = originalHeight;
      container.style.maxHeight = originalMaxHeight;
      container.style.overflow = originalOverflow;
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
 
  // 设置chatListService事件监听
  useEffect(() => {
    // 监听错误事件
    const handleError = (errorMessage: string) => {
      AntdMessage.error(errorMessage);
    };

    // 监听聊天列表重命名事件
    const handleChatListRenamed = ({ oldName, newName, eventPanelId }: { oldName: string, newName: string, eventPanelId?: string }) => {
      // 只处理本面板的事件或全局事件
      if (eventPanelId && eventPanelId !== panelId) {
        return;
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
    };

    // 监听聊天列表删除事件
    const handleChatListDeleted = ({ name, eventPanelId }: { name: string, eventPanelId?: string }) => {
      // 只处理本面板的事件或全局事件
      if (eventPanelId && eventPanelId !== panelId) {
        return;
      }
      
      // 从列表中移除已删除的聊天
      setChatLists(prev => prev.filter(item => item !== name));
      
      // 如果当前正在使用的聊天被删除，创建一个新的
      if (chatListName === name) {
        handleNewChatDirectly({ panelId });
      }
    };

    // 监听新聊天创建事件
    const handleNewChatCreated = ({ name, eventPanelId }: { name: string, eventPanelId?: string }) => {
      // 只处理本面板的事件或全局事件
      if (eventPanelId && eventPanelId !== panelId) {
        return;
      }
      
      setChatListName(name);
      setChatLists(prev => [name, ...prev.filter(item => item !== name)]);
      setMessages([]);
    };

    // 添加事件监听器
    chatListService.on('error', handleError);
    chatListService.on('chatListRenamed', handleChatListRenamed);
    chatListService.on('chatListDeleted', handleChatListDeleted);
    chatListService.on('newChatCreated', handleNewChatCreated);    

    // 清理函数
    return () => {
      chatListService.off('error', handleError);
      chatListService.off('chatListRenamed', handleChatListRenamed);
      chatListService.off('chatListDeleted', handleChatListDeleted);
      chatListService.off('newChatCreated', handleNewChatCreated);      
    };
  }, [chatListName, panelId]);

  
  // 监听RAG启用状态变更事件
  useEffect(() => {
    const handleRagEnabledChanged = (enabled: boolean) => {
      setEnableRag(enabled);
    };

    // 订阅事件
    const unsubscribe = eventBus.subscribe(EVENTS.RAG.ENABLED_CHANGED, handleRagEnabledChanged);
    
    return () => {
      unsubscribe();
    };
  }, []);

  // 监听文件组选择更新事件
  useEffect(() => {
    const handleFileGroupSelectionUpdated = (data: FileGroupSelectionUpdatedEventData) => {
      // 如果传入了panelId且与当前面板的panelId不匹配，则不处理此事件
      if (data.panelId && data.panelId !== panelId) {
        return;
      }
      
      console.log('ChatPanel: Received file group selection update event', data.groupNames, data.filePaths);
      // 保存最近选择的文件组和文件
      setLastSelectedGroups(data.groupNames);
      setLastSelectedFiles(data.filePaths);
    };

    // 订阅文件组选择更新事件
    const unsubscribe = eventBus.subscribe(
      EVENTS.FILE_GROUP_SELECT.SELECTION_UPDATED, 
      handleFileGroupSelectionUpdated
    );

    // 清理函数
    return () => {
      unsubscribe();
    };
  }, [panelId]);

  // 监听MCPs启用状态变更事件
  useEffect(() => {
    const handleMcpsEnabledChanged = (enabled: boolean) => {
      setEnableMCPs(enabled);
    };

    // 订阅事件
    const unsubscribe = eventBus.subscribe(EVENTS.MCPS.ENABLED_CHANGED, handleMcpsEnabledChanged);
    
    return () => {
      unsubscribe();
    };
  }, []);

  // 当消息更新或面板ID变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, panelId]);

  // 在组件挂载时加载文件组列表
  useEffect(() => {
    fetchFileGroups();

    // 监听Chat面板刷新消息事件
    const handleRefreshFromMessage = (messageId: string) => {
      // 查找消息索引
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex >= 0) {
        // 保留点击的消息及之前的所有消息
        const updatedMessages = messages.slice(0, msgIndex + 1);
        setMessages(updatedMessages);
        
        // 将最后一条用户消息的内容设置为编辑器内容
        const lastUserMsg = [...updatedMessages].reverse().find(m => m.isUser);
        if (lastUserMsg) {
          setEditorContent(lastUserMsg.content);
        }
      }
    };

    // 订阅刷新事件
    const unsubscribe = eventBus.subscribe(EVENTS.CHAT.REFRESH_FROM_MESSAGE, handleRefreshFromMessage);
    
    return () => {
      unsubscribe();
    };
  }, [messages]);

  // 滚动到对话区域底部
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 重置对话
  const handleReset = async () => {
    if (pendingRevert) return;
    
    try {
      setPendingRevert(true);
      
      // 重置消息列表
      setMessages([]);
      
      // 重置编辑器内容
      setEditorContent('');
      
      // 重置其他状态
      setSendLoading(false);
      
      // 生成新会话ID
      const newSessionId = uuidv4();
      
      // 发送重置请求到服务器
      await fetch('/api/chat/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: newSessionId,
          panel_id: panelId || "main"
        })
      });
      
      console.log('Chat reset successfully');
    } catch (error) {
      console.error('Failed to reset chat:', error);
    } finally {
      setPendingRevert(false);
    }
  };

  // 添加编辑器内容状态
  const [editorContent, setEditorContent] = useState<string>('');

  // 添加其他状态的 ref 引用
  const chatListNameRef = useRef<string>('');
  const messagesRef = useRef<AutoModeMessage[]>([]);
  const isRuleModeRef = useRef<boolean>(false);
  const enableAgenticModeRef = useRef<boolean>(true);
  const enableRagRef = useRef<boolean>(false);
  const enableMCPsRef = useRef<boolean>(false);
  const lastSelectedGroupsRef = useRef<string[]>([]);
  const lastSelectedFilesRef = useRef<string[]>([]);
  const messageIdCounterRef = useRef<number>(0);
  const panelIdRef = useRef<string>('');
  const sendLoadingRef = useRef<boolean>(false);

  // 更新 ref 引用的值
  useEffect(() => {
    chatListNameRef.current = chatListName;
  }, [chatListName]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isRuleModeRef.current = isRuleMode;
  }, [isRuleMode]);

  useEffect(() => {
    enableAgenticModeRef.current = enableAgenticMode;
  }, [enableAgenticMode]);

  useEffect(() => {
    enableRagRef.current = enableRag;
  }, [enableRag]);

  useEffect(() => {
    enableMCPsRef.current = enableMCPs;
  }, [enableMCPs]);

  useEffect(() => {
    lastSelectedGroupsRef.current = lastSelectedGroups;
  }, [lastSelectedGroups]);

  useEffect(() => {
    lastSelectedFilesRef.current = lastSelectedFiles;
  }, [lastSelectedFiles]);

  useEffect(() => {
    messageIdCounterRef.current = messageIdCounter;
  }, [messageIdCounter]);

  useEffect(() => {
    panelIdRef.current = panelId;
  }, [panelId]);

  useEffect(() => {
    sendLoadingRef.current = sendLoading;
  }, [sendLoading]);

  return (
    <>
      <Layout className="h-screen flex flex-col overflow-hidden">
        {/* 头部导航栏 */}
        <Layout.Header className="bg-gray-800 px-2 py-0.5 h-8 flex justify-between items-center border-b border-gray-700 shadow-sm transition-all duration-300 sticky top-0 z-10">
          <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center flex-shrink-0">
              <svg className="w-3 h-3 mr-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              panelId={panelId}
            />

            <Tooltip title="清空当前对话">
              <Button
                icon={<ClearOutlined style={{ fontSize: '10px' }} />}
                onClick={() => {
                  if (chatListName) {
                    Modal.confirm({
                      title: '确认清空',
                      content: '确定要清空当前对话中的所有消息吗？此操作不可撤销。',
                      okText: '清空',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: async () => {
                        // 清空消息列表
                        setMessages([]);
                        // 触发会话更新逻辑
                        if (chatListName) {
                          await saveChatList(chatListName, [], panelId);
                          AntdMessage.success('对话已清空');
                        }
                      },
                    });
                  } else {
                    AntdMessage.warning('请先选择或创建一个对话');
                  }
                }}
                className="text-gray-300 border-gray-600 bg-gray-700 hover:bg-gray-600 px-1 py-0 h-6 w-6 flex items-center justify-center"
                size="small"
              />
            </Tooltip>

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

            <Tooltip title="导出对话为图片">
              <Button
                icon={<PictureOutlined style={{ fontSize: '10px' }} />}
                onClick={handleExportMessagesAsImage}
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
            ref={messagesContainerRef}
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          >
            {/* Token统计组件 */}
            {messages.length > 0 && (
              <div className="sticky top-0 right-0 float-right bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-sm p-0.5 m-0.5 shadow-md z-10">
                <div className="font-mono text-gray-400 flex flex-col items-end gap-0 text-[9px] leading-tight">
                  <div className="flex items-center">
                    <span>{getMessage('tokens')}: </span>
                    <span className="text-green-500 ml-0.5">↑ {accumulatedStats.inputTokens}</span>
                    <span className="text-red-500 ml-0.5">↓ {accumulatedStats.outputTokens}</span>
                  </div>
                  {(accumulatedStats.cacheHits > 0 || accumulatedStats.cacheMisses > 0) && (
                    <div className="flex items-center">
                      <span>{getMessage('cache')}: </span>
                      <span className="text-white ml-0.5">⊕ {accumulatedStats.cacheHits}</span>
                      <span className="text-white ml-0.5">→ {accumulatedStats.cacheMisses}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span>{getMessage('apiCost')}: </span>
                    <span className="text-white ml-0.5">${accumulatedStats.totalCost.toFixed(5)}</span>
                  </div>
                  <div className="flex items-center">
                    <span>{getMessage('contextWindow')}: </span>
                    <span className="text-white ml-0.5">{Math.round(accumulatedStats.contextWindowUsage / 1024)}K</span>
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
              fileGroups={fileGroups}
              selectedGroups={selectedGroups}
              setSelectedGroups={setSelectedGroups}
              fetchFileGroups={fetchFileGroups}
              isMaximized={isMaximized}
              setIsMaximized={setIsMaximized}
              handleEditorDidMount={handleEditorDidMount}
              isWriteMode={isWriteMode}
              setIsWriteMode={setIsWriteMode}
              isRuleMode={isRuleMode}
              setIsRuleMode={setIsRuleMode}
              handleRevert={handleReset}
              sendLoading={sendLoading}
              setConfig={setConfig}
              isFullScreen={isMaximized}
              showFileGroupSelect={true}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              panelId={panelId}
              isActive={isActive}
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