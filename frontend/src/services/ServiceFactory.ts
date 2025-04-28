// frontend/src/services/ServiceFactory.ts
import { EventEmitter } from 'events';
import { chatService as globalChatService } from './chatService';
import { codingService as globalCodingService } from './codingService';
import { agenticEditService as globalAgenticEditService } from './agenticEditService';
import { autoCoderConfService as globalAutoCoderConfService } from './AutoCoderConfService';
import { chatListService as globalChatListService } from './chatListService';

// 服务代理基类
class ServiceProxy extends EventEmitter {
  protected originalService: EventEmitter;
  protected panelId: string;
  
  constructor(service: EventEmitter, panelId: string) {
    super();
    this.originalService = service;
    this.panelId = panelId;
    
    // 转发原服务的事件，并添加面板ID
    this.originalService.on('message', (...args) => {
      // 检查消息是否包含面板ID或是否与当前面板匹配
      const message = args[0];
      if (!message.panelId || message.panelId === this.panelId) {
        this.emit('message', ...args);
      }
    });
    
    this.originalService.on('taskComplete', (...args) => {
      this.emit('taskComplete', ...args);
    });
    
    // 转发其他所需事件...
  }
  
  // 通用方法代理
  on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }
  
  off(event: string, listener: (...args: any[]) => void): this {
    super.off(event, listener);
    return this;
  }
  
  removeAllListeners(event?: string): this {
    super.removeAllListeners(event);
    return this;
  }
}

// 具体服务代理类
class ChatServiceProxy extends ServiceProxy {
  async executeCommand(command: string): Promise<any> {
    // 添加面板ID到消息中
    const modifiedCommand = {
      originalCommand: command,
      panelId: this.panelId
    };
    
    // 调用原始服务的方法，但传递修改后的命令
    return (this.originalService as any).executeCommand(command, this.panelId);
  }
  
  async cancelTask(): Promise<any> {
    return (this.originalService as any).cancelTask();
  }
}

class CodingServiceProxy extends ServiceProxy {
  async executeCommand(command: string): Promise<any> {
    return (this.originalService as any).executeCommand(command, this.panelId);
  }
  
  async cancelTask(): Promise<any> {
    return (this.originalService as any).cancelTask();
  }
}

class AgenticEditServiceProxy extends ServiceProxy {
  async executeCommand(command: string, flag?: boolean): Promise<any> {
    return (this.originalService as any).executeCommand(command, flag, this.panelId);
  }
  
  async cancelTask(): Promise<any> {
    return (this.originalService as any).cancelTask();
  }
}

class AutoCoderConfServiceProxy extends ServiceProxy {
  async updateConfig(key: string, value: any): Promise<any> {
    return (this.originalService as any).updateConfig(key, value);
  }
}

class ChatListServiceProxy extends ServiceProxy {
  async getCurrentSessionName(panelId?: string): Promise<any> {
    return (this.originalService as any).getCurrentSessionName(panelId || this.panelId);
  }
  
  async setCurrentSessionName(name: string, panelId?: string): Promise<any> {
    return (this.originalService as any).setCurrentSessionName(name, panelId || this.panelId);
  }
  
  async saveChatList(name: string, messages: any[], panelId?: string): Promise<any> {
    return (this.originalService as any).saveChatList(name, messages, panelId || this.panelId);
  }
  
  async loadChatList(name: string, panelId?: string): Promise<any> {
    return (this.originalService as any).loadChatList(name, panelId || this.panelId);
  }
  
  async fetchChatLists(): Promise<any> {
    return (this.originalService as any).fetchChatLists();
  }
  
  async deleteChatList(name: string): Promise<any> {
    return (this.originalService as any).deleteChatList(name);
  }
  
  async renameChatList(oldName: string, newName: string, panelId?: string): Promise<any> {
    return (this.originalService as any).renameChatList(oldName, newName, panelId || this.panelId);
  }
  
  getChatTitle(messages: any[]): string {
    return (this.originalService as any).getChatTitle(messages);
  }
  
  async createNewChat(panelId?: string): Promise<any> {
    return (this.originalService as any).createNewChat(panelId || this.panelId);
  }
}

// 服务工厂
export class ServiceFactory {
  private static chatServices: Map<string, ChatServiceProxy> = new Map();
  private static codingServices: Map<string, CodingServiceProxy> = new Map();
  private static agenticEditServices: Map<string, AgenticEditServiceProxy> = new Map();
  private static autoCoderConfServices: Map<string, AutoCoderConfServiceProxy> = new Map();
  private static chatListServices: Map<string, ChatListServiceProxy> = new Map();

  static getChatService(panelId: string): any {
    if (!this.chatServices.has(panelId)) {
      this.chatServices.set(panelId, new ChatServiceProxy(globalChatService, panelId));
    }
    return this.chatServices.get(panelId)!;
  }

  static getCodingService(panelId: string): any {
    if (!this.codingServices.has(panelId)) {
      this.codingServices.set(panelId, new CodingServiceProxy(globalCodingService, panelId));
    }
    return this.codingServices.get(panelId)!;
  }

  static getAgenticEditService(panelId: string): any {
    if (!this.agenticEditServices.has(panelId)) {
      this.agenticEditServices.set(panelId, new AgenticEditServiceProxy(globalAgenticEditService, panelId));
    }
    return this.agenticEditServices.get(panelId)!;
  }

  static getAutoCoderConfService(panelId: string): any {
    if (!this.autoCoderConfServices.has(panelId)) {
      this.autoCoderConfServices.set(panelId, new AutoCoderConfServiceProxy(globalAutoCoderConfService, panelId));
    }
    return this.autoCoderConfServices.get(panelId)!;
  }

  static getChatListService(panelId: string): any {
    if (!this.chatListServices.has(panelId)) {
      this.chatListServices.set(panelId, new ChatListServiceProxy(globalChatListService, panelId));
    }
    return this.chatListServices.get(panelId)!;
  }
}