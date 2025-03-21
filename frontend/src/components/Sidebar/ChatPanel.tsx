import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message as AntdMessage, Modal, Input, Select, Button, Layout, Divider, Typography, Space, Dropdown, Menu, Tooltip } from 'antd';
import { PlusOutlined, SettingOutlined, DeleteOutlined, EditOutlined, MessageOutlined, CodeOutlined, MenuOutlined, DownOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import './ChatPanel.css';
import InputArea from './InputArea';
import { getMessage } from './lang';
import { pollEvents, pollStreamResult } from './polling';
import {
  FileGroup,
  ConfigState,
  CodingEvent,
  ChatPanelProps,
} from './types';
import { chatService } from '../../services/chatService';
import { codingService } from '../../services/codingService';
import { Message as AutoModeMessage } from '../../components/AutoMode/types';
import MessageList, { MessageProps } from '../../components/AutoMode/MessageList';

const CONFIRMATION_WORDS = ['confirm', '确认'] as const;

const ChatPanel: React.FC<ChatPanelProps> = ({ setPreviewFiles, setRequestId, setActivePanel, setClipboardContent, clipboardContent, projectName = '' }) => {
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
      // 检查是否滚动到底部（考虑一个小的阈值，如20像素）
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
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
    // Fetch initial config
    fetch('/api/conf')
      .then(response => response.json())
      .then(data => {
        const { human_as_model, skip_build_index, project_type, ...extraConf } = data.conf;
        setConfig({
          human_as_model: human_as_model === "true",
          skip_build_index: skip_build_index === "true",
          project_type: project_type,
          extra_conf: extraConf,
          available_keys: []
        });
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        AntdMessage.error('Failed to fetch configuration');
      });
  }, []);

  useEffect(() => {
    // Fetch available configuration keys
    fetch('/api/conf/keys')
      .then(response => response.json())
      .then(data => {
        setConfig(prev => ({
          ...prev,
          available_keys: data.keys
        }));
      })
      .catch(error => {
        console.error('Error fetching configuration keys:', error);
        AntdMessage.error('Failed to fetch configuration keys');
      });
  }, []);

  useEffect(() => {
    fetchChatLists();
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

  const updateConfig = async (key: string, value: boolean | string) => {
    try {
      const response = await fetch('/api/conf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: String(value) })
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      setConfig(prev => ({ ...prev, [key]: value }));
      AntdMessage.success('Configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      AntdMessage.error('Failed to update configuration');
    }
  };

  const [pendingResponseEvent, setPendingResponseEvent] = useState<{
    requestId: string;
    eventData: CodingEvent;
  } | null>(null);

  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

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

    service.on('taskComplete', (hasError: boolean) => {
      if (hasError) {
        AntdMessage.error('Task completed with errors');
      } else {
        AntdMessage.success('Task completed successfully');
      }
      setSendLoading(false);
      setRequestId("");
      
      // 在任务完成时保存当前的聊天记录
      if (chatListName && messages.length > 0) {
        saveChatList(chatListName, messages);
        console.log('Chat list saved after task completion:', chatListName);
      }
    });
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
        const result = await codingService.executeCommand(trimmedText);
        console.log('ChatPanel: Received result from codingService:', result);
        setRequestId(result.event_file_id);
      } else {
        // 聊天模式
        console.log('ChatPanel: Sending message to chatService');
        const result = await chatService.executeCommand(trimmedText);
        console.log('ChatPanel: Received result from chatService:', result);
        setRequestId(result.event_file_id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      AntdMessage.error('Failed to send message');
      updateMessageStatus(messageId, 'error');
      addBotMessage(getMessage('processingError'));
      setSendLoading(false);
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
        <div className="flex justify-between items-center w-full group">
          <span className="truncate max-w-[180px] text-white">{name}</span>
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
          <Dropdown 
            menu={{ 
              items: chatListMenuItems,
              onClick: ({ key }) => {
                if (key === 'new-chat') {
                  showNewChatModal();
                } else {
                  setChatListName(key);
                  loadChatList(key);
                }
              },
              style: { backgroundColor: '#1F2937', borderColor: '#4B5563', color: '#FFFFFF' }
            }} 
            trigger={['click']}
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
          >
            <Button 
              icon={<MessageOutlined style={{ fontSize: '12px' }} />}
              size="small" 
              className="flex items-center justify-center text-gray-300 border-gray-600 bg-gray-700 hover:bg-gray-600 px-1 py-0 h-6 w-6"
              title={getChatTitle()}
            />
          </Dropdown>
          
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
            sendLoading={sendLoading}
            setConfig={setConfig}
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