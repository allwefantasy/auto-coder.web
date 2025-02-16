import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessages from './ChatMessages';
import { message as AntdMessage } from 'antd';
import InputArea from './InputArea';
import { getMessage } from './lang';
import { pollEvents, pollStreamResult } from './polling';
import {
  FileGroup,
  ConfigState,
  CodingEvent,
  Message,
  ChatPanelProps,
} from './types';

const CONFIRMATION_WORDS = ['confirm', '确认'] as const;

const ChatPanel: React.FC<ChatPanelProps> = ({ setPreviewFiles, setRequestId, setActivePanel, setClipboardContent, clipboardContent }) => {
  const handleNewChat = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newChatName = `chat_${timestamp}`;
    setChatListName(newChatName);
    setMessages([]);
    setChatLists(prev => [newChatName, ...prev]);
  };

  const [messages, setMessages] = useState<Message[]>([]);
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

  const saveChatList = async (name: string, newMessages: Message[] = []) => {
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
      data.messages.forEach((message: Message) => {
        if (message.role === 'user') {
          message.status = 'sent';
        }
      });
      setMessages(data.messages);
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
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      status: 'sending',
      timestamp: Date.now()
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
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'bot',
      content,
      timestamp: Date.now()
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
          ? { ...msg, status }
          : msg
      )
    );
  };


  const handleRevert = async () => {
    try {
      // First get the YAML content
      const yamlResponse = await fetch('/api/last-yaml');
      if (!yamlResponse.ok) {
        throw new Error('Failed to get last action information');
      }

      const yamlData = await yamlResponse.json();
      if (!yamlData.status) {
        AntdMessage.error(yamlData.message);
        addBotMessage(yamlData.message);
        return;
      }

      // Get the query from YAML content
      const query = yamlData.content.query;
      if (!query) {
        AntdMessage.error('No query found in the last action');
        addBotMessage(getMessage('noQueryFound'));
        return;
      }

      // Ask for confirmation
      addBotMessage(getMessage('revertConfirmation', { query }));
      setPendingRevert(true);

    } catch (error) {
      AntdMessage.error('Failed to get last action information');
      addBotMessage(getMessage('getLastActionError'));
      console.error('Error getting last action:', error);
    }
  };

  const handleSendMessage = async () => {
    const trimmedText = editorRef.current?.getValue()?.trim();
    if (!trimmedText) {
      AntdMessage.warning('Please enter a message');
      return;
    }

    const messageId = addUserMessage(trimmedText);
    editorRef.current?.setValue("");

    // Handle revert confirmation
    if (pendingRevert) {
      const isConfirmed = CONFIRMATION_WORDS.includes(trimmedText.toLowerCase());
      if (isConfirmed) {
        try {
          const response = await fetch('/api/revert', {
            method: 'POST'
          });

          if (!response.ok) {
            throw new Error('Failed to revert changes');
          }

          const data = await response.json();
          if (data.status) {
            AntdMessage.success('Changes reverted successfully');
            addBotMessage(getMessage('revertSuccess'));
          } else {
            AntdMessage.error(data.message);
            addBotMessage(getMessage('revertFailure', { message: data.message }));
          }

          // Refresh preview panel if active
          setPreviewFiles([]);
          setActivePanel('code');
        } catch (error) {
          AntdMessage.error('Failed to revert changes');
          addBotMessage(getMessage('revertError'));
          console.error('Error reverting changes:', error);
        }
      } else {
        addBotMessage(getMessage('revertCancelled'));
      }
      setPendingRevert(false);
      updateMessageStatus(messageId, 'sent');
      return;
    }

    // Original handleSendMessage logic
    if (pendingResponseEvent) {
      const isConfirmed = CONFIRMATION_WORDS.includes(trimmedText.toLowerCase());
      if (isConfirmed) {
        const { requestId, eventData } = pendingResponseEvent;
        const v = JSON.stringify({
          "value": clipboardContent
        });
        await fetch('/api/event/response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            event: eventData,
            response: v
          })
        });
        console.log('Response event:', JSON.stringify({
          request_id: requestId,
          event: eventData,
          response: v
        }));
      } else {
        const { requestId, eventData } = pendingResponseEvent;
        const v = JSON.stringify({
          "value": ""
        });
        await fetch('/api/event/response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            event: eventData,
            response: v
          })
        });
        console.log('Response event:', JSON.stringify({
          request_id: requestId,
          event: eventData,
          response: v
        }));
        addBotMessage(getMessage('cancelResponseEvent'));
      }
      updateMessageStatus(messageId, 'sent');
      setPendingResponseEvent(null);
      updateMessageStatus(messageId, 'sent');
      return;
    }

    setSendLoading(true);

    try {
      const endpoint = isWriteMode ? '/api/coding' : '/api/chat';
      console.log('Sending message to:', endpoint);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedText })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      if (data.request_id) {
        // Update original message status
        setRequestId(data.request_id);
        updateMessageStatus(messageId, 'sent');
        if (isWriteMode) {
          // Start polling for events
          const { final_status, content } = await pollEvents(data.request_id, {
            addBotMessage,
            setPreviewFiles,
            setActivePanel,
            setClipboardContent,
            setPendingResponseEvent
          });
          if (final_status === 'completed') {
            addBotMessage(getMessage('codeModificationComplete'));
            setRequestId("");
          } else {
            addBotMessage(getMessage('codeModificationFailed', { content }));
            setRequestId("");
          }
        } else {
          const messageBotId = addBotMessage("");
          const { text } = await pollStreamResult(
            data.request_id,
            (newText) => {
              if (newText === "") {
                newText = "typing...";
              }
              setMessages(prev => prev.map(msg =>
                msg.id === messageBotId ? { ...msg, content: newText } : msg
              ));
            },
            config,
            isWriteMode,
            {
              setActivePanel,
              setClipboardContent
            }
          );
          if (text) {
            setMessages(prev => prev.map(msg =>
              msg.id === messageBotId ? { ...msg, content: text } : msg
            ));
          }
        }

      }

    } catch (error) {
      console.error('Error sending message:', error);
      AntdMessage.error('Failed to send message');
      updateMessageStatus(messageId, 'error');

      // Add error message from bot
      addBotMessage(getMessage('processingError'));
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div id="chat-panel-container" className="flex flex-col h-screen">
      <div id="chat-messages-container" className="h-[50%] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        <ChatMessages
          messages={messages}
          messagesEndRef={messagesEndRef}
          handleNewChat={handleNewChat}
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

  );
};

export default ChatPanel;