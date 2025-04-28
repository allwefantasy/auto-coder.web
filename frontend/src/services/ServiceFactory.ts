import { ChatService} from './chatService';
import { CodingService } from './codingService';
import { AgenticEditService } from './agenticEditService';
import { AutoCoderConfService } from './AutoCoderConfService';
import { ChatListService } from './chatListService';



// 服务工厂
export class ServiceFactory {
  private static chatServices: Map<string, ChatService> = new Map();
  private static codingServices: Map<string, CodingService> = new Map();
  private static agenticEditServices: Map<string, AgenticEditService> = new Map();
  private static autoCoderConfServices: Map<string, AutoCoderConfService> = new Map();
  private static chatListServices: Map<string, ChatListService> = new Map();

  static getChatService(panelId: string): any {
    if (!this.chatServices.has(panelId)) {
      this.chatServices.set(panelId, new ChatService());
    }
    return this.chatServices.get(panelId)!;
  }

  static getCodingService(panelId: string): any {
    if (!this.codingServices.has(panelId)) {
      this.codingServices.set(panelId, new CodingService());
    }
    return this.codingServices.get(panelId)!;
  }

  static getAgenticEditService(panelId: string): any {
    if (!this.agenticEditServices.has(panelId)) {
      this.agenticEditServices.set(panelId, new AgenticEditService());
    }
    return this.agenticEditServices.get(panelId)!;
  }

  static getAutoCoderConfService(panelId: string): any {
    if (!this.autoCoderConfServices.has(panelId)) {
      this.autoCoderConfServices.set(panelId, new AutoCoderConfService());
    }
    return this.autoCoderConfServices.get(panelId)!;
  }

  static getChatListService(panelId: string): any {
    if (!this.chatListServices.has(panelId)) {
      this.chatListServices.set(panelId, new ChatListService());
    }
    return this.chatListServices.get(panelId)!;
  }
}