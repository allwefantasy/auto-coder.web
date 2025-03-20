import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message as AntdMessage, Modal, Input } from 'antd';
import { v4 as uuidv4 } from 'uuid';
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

const ChatPanel: React.FC<ChatPanelProps> = ({ setPreviewFiles, setRequestId, setActivePanel, setClipboardContent, clipboardContent }) => {
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
  
  // 添加消息ID计数器，用于生成唯一的消息ID
  const [messageIdCounter, setMessageIdCounter] = useState<number>(0);

  // 添加新的 useEffect 用于滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      // Automatically load the latest chat if there are any chats
      if (data.chat_lists && data.chat_lists.length > 0) {
        // The first chat in the list is the latest one since they're sorted by modification time
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
          // Legacy format, convert to AutoModeMessage
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
        // Already in AutoModeMessage format or close enough
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

    if (timeSinceLastFetch >= 30000) { // 30 seconds
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

  // Initial fetch
  useEffect(() => {
    fetchFileGroups();
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
  };

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

  // Messages are already in AutoMode format, so we don't need conversion
  const getAutoModeMessages = (): MessageProps[] => {
    return messages;
  };

  // Handle message events from chat and coding services
  const setupMessageListener = (service: typeof chatService | typeof codingService) => {
    service.on('message', (autoModeMessage: AutoModeMessage) => {
      // Directly add or update AutoMode message to our messages state
      console.log('ChatPanel: Received message from service:', 
        service === chatService ? 'chatService' : 'codingService', 
        autoModeMessage.type, 
        autoModeMessage.id);
      setMessages(prev => {
        const existingMessageIndex = prev.findIndex(msg => msg.id === autoModeMessage.id);
        if (existingMessageIndex !== -1) {
          // Update existing message
          const updatedMessages = [...prev];
          updatedMessages[existingMessageIndex] = autoModeMessage;
          return updatedMessages;
        } else {
          // Add new message
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
    });
  };

  // Set up event listeners when component mounts
  useEffect(() => {
    setupMessageListener(chatService);
    setupMessageListener(codingService);

    // Clean up event listeners when component unmounts
    return () => {
      chatService.removeAllListeners();
      codingService.removeAllListeners();
    };
  }, []);

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
      // Use the appropriate service based on the current mode
      if (isWriteMode) {
        // Coding mode
        console.log('ChatPanel: Sending message to codingService');
        const result = await codingService.executeCommand(trimmedText);
        console.log('ChatPanel: Received result from codingService:', result);
        setRequestId(result.event_file_id);
      } else {
        // Chat mode
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

  return (
    <>
    <div id="chat-panel-container" className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-2 bg-gray-100 border-b border-gray-300">
        <div className="flex items-center">
          <select 
            className="px-2 py-1 border rounded mr-2 text-sm" 
            value={chatListName} 
            onChange={(e) => {
              setChatListName(e.target.value);
              loadChatList(e.target.value);
            }}
          >
            {chatLists.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <button 
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          onClick={showNewChatModal}
        >
          New Chat
        </button>
      </div>
      <div id="chat-messages-container" className="h-[50%] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
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
        <div id="input-area-container" className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
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
    </div>

    {/* New Chat Modal */}
    <Modal
      title="创建新对话"
      open={isNewChatModalVisible}
      onOk={handleNewChatCreate}
      onCancel={handleNewChatCancel}
      okText="创建"
      cancelText="取消"
    >
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">对话名称</label>
        <Input 
          value={newChatName} 
          onChange={(e) => setNewChatName(e.target.value)}
          placeholder="请输入新对话的名称"
          onPressEnter={handleNewChatCreate}
        />
      </div>
    </Modal>
    </>
  );
};

export default ChatPanel;