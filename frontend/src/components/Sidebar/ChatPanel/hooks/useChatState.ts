import { useState, useEffect } from 'react';
import { Message } from '../../types';
import { message as AntdMessage } from 'antd';

const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLists, setChatLists] = useState<string[]>([]);
  const [chatListName, setChatListName] = useState<string>('');
  const [showChatListInput, setShowChatListInput] = useState(false);

  const handleNewChat = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newChatName = `chat_${timestamp}`;
    setChatListName(newChatName);
    setMessages([]);
    setChatLists(prev => [newChatName, ...prev]);
  };

  const saveChatList = async (name: string, newMessages: Message[] = []) => {
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

  const fetchChatLists = async () => {
    try {
      const response = await fetch('/api/chat-lists');
      const data = await response.json();

      if (data.chat_lists && data.chat_lists.length > 0) {
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

  useEffect(() => {
    fetchChatLists();
  }, []);

  return {
    messages,
    setMessages,
    chatLists,
    setChatLists,
    chatListName,
    setChatListName,
    showChatListInput,
    setShowChatListInput,
    handleNewChat,
    saveChatList,
    loadChatList,
    deleteChatList,
    fetchChatLists
  };
};

export default useChatState;