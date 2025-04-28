import { Message as AutoModeMessage } from '../components/AutoMode/types';
import { EventEmitter } from 'events';

class ChatListService extends EventEmitter {
  private defaultChatName: string = '';

  constructor() {
    super();
  }

  /**
   * 获取聊天列表
   * @returns 聊天列表数组
   */
  async fetchChatLists(): Promise<string[]> {
    try {
      const response = await fetch('/api/chat-lists');
      const data = await response.json();
      return data.chat_lists || [];
    } catch (error) {
      console.error('Error fetching chat lists:', error);
      this.emit('error', '获取聊天列表失败');
      return [];
    }
  }

  /**
   * 获取当前会话名称
   * @param panelId 面板ID，可选
   * @returns 当前会话名称或会话信息对象
   */
  async getCurrentSessionName(panelId?: string): Promise<string | { sessionName: string, panelId: string } | null> {
    try {      
      const url = panelId 
        ? `/api/chat-session/name?panel_id=${encodeURIComponent(panelId)}` 
        : '/api/chat-session/name';
            
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch current session name');
      }
      const data = await response.json();
      
      // 如果有panelId，返回一个包含sessionName和panelId的对象
      // 否则只返回sessionName字符串
      if (panelId) {
        return data.session_name ? {
          sessionName: data.session_name,
          panelId: panelId
        } : null;
      }
      
      return data.session_name || null;
    } catch (error) {
      console.error('Error getting current session name:', error);
      return null;
    }
  }

  /**
   * 设置当前会话名称
   * @param name 会话名称
   * @param panelId 面板ID，可选
   * @returns 是否设置成功
   */
  async setCurrentSessionName(name: string, panelId?: string): Promise<boolean> {
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
          panel_id: panelId || ''
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set current session name');
      }

      return true;
    } catch (error) {
      console.error('Error setting current session name:', error);
      this.emit('error', '设置当前会话名称失败');
      return false;
    }
  }

  /**
   * 保存聊天列表
   * @param name 聊天名称
   * @param messages 消息列表
   * @param panelId 面板ID，可选
   * @returns 是否保存成功
   */
  async saveChatList(name: string, messages: AutoModeMessage[] = [], panelId?: string): Promise<boolean> {
    if (!name.trim()) {
      this.emit('error', '请输入聊天列表名称');
      return false;
    }

    try {
      const response = await fetch('/api/chat-lists/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          messages: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save chat list');
      }

      // 同步更新当前会话名称，传递panelId参数
      await this.setCurrentSessionName(name, panelId);
      // 发布事件时包含panelId信息
      this.emit('chatListSaved', { name, panelId });
      return true;
    } catch (error) {
      console.error('Error saving chat list:', error);
      this.emit('error', '保存聊天列表失败');
      return false;
    }
  }

  /**
   * 加载聊天列表
   * @param name 聊天名称
   * @returns 消息列表
   */
  async loadChatList(name: string, panelId?: string): Promise<AutoModeMessage[]> {
    try {
      const response = await fetch(`/api/chat-lists/${name}`);
      const data = await response.json();
      
      // 转换消息格式
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
      
      // 发布事件时包含panelId信息
      this.emit('chatListLoaded', { name, messages: convertedMessages, panelId });
      return convertedMessages;
    } catch (error) {
      console.error('Error loading chat list:', error);
      this.emit('error', '加载聊天列表失败');
      return [];
    }
  }

  /**
   * 获取聊天标题（基于第一条用户消息）
   * @param messages 消息列表
   * @returns 聊天标题
   */
  getChatTitle(messages: AutoModeMessage[]): string {
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
    return '新聊天';
  }

  /**
   * 删除聊天列表
   * @param name 聊天名称
   * @returns 是否删除成功
   */
  async deleteChatList(name: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/chat-lists/${name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat list');
      }

      this.emit('chatListDeleted', { name });
      return true;
    } catch (error) {
      console.error('Error deleting chat list:', error);
      this.emit('error', '删除聊天列表失败');
      return false;
    }
  }

  /**
   * 重命名聊天列表
   * @param oldName 原名称
   * @param newName 新名称
   * @returns 是否重命名成功
   */
  async renameChatList(oldName: string, newName: string, panelId?: string): Promise<boolean> {
    try {
      // 验证新名称不为空
      if (!newName.trim()) {
        this.emit('error', '聊天名称不能为空');
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

      // 发布事件时包含panelId信息
      this.emit('chatListRenamed', { oldName, newName, panelId });
      return true;
    } catch (error: any) {
      console.error('Error renaming chat list:', error);
      this.emit('error', `重命名聊天失败: ${error.message || '未知错误'}`);
      return false;
    }
  }

  /**
   * 创建新的空聊天
   * @param panelId 面板ID，可选
   * @returns 新聊天的名称
   */
  async createNewChat(panelId?: string): Promise<string | null> {
    // 设置默认的新对话名称
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newChatName = `chat_${timestamp}`;

    try {
      // 保存新的空对话列表
      const saveSuccess = await this.saveChatList(newChatName, [], panelId);
      if (!saveSuccess) {
        throw new Error('Failed to save new chat');
      }

      // 设置当前会话名称
      await this.setCurrentSessionName(newChatName, panelId);

      // 向聊天路由器发送 /new 命令
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
        // 不向用户显示错误，因为这是后台操作
      }

      // 发布事件时包含panelId信息
      this.emit('newChatCreated', { name: newChatName, panelId });
      return newChatName;
    } catch (error) {
      console.error('Error creating new chat directly:', error);
      this.emit('error', '创建新聊天失败');
      return null;
    }
  }
}

// 创建单例实例
export const chatListService = new ChatListService(); 