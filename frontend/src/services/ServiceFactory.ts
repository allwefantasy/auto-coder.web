import { ChatService} from './chatService';
import { CodingService } from './codingService';
import { AgenticEditService } from './agenticEditService';
import { AutoCoderConfService } from './AutoCoderConfService';
import { ChatListService } from './chatListService';
import { FileGroupService } from './fileGroupService';


// 服务工厂
export class ServiceFactory {
  private static chatServices: Map<string, ChatService> = new Map();
  private static codingServices: Map<string, CodingService> = new Map();
  private static agenticEditServices: Map<string, AgenticEditService> = new Map();
  private static autoCoderConfServices: Map<string, AutoCoderConfService> = new Map();
  private static chatListServices: Map<string, ChatListService> = new Map();
  private static fileGroupServices: Map<string, FileGroupService> = new Map();

  static getChatService(panelId: string): any {
    // If an instance already exists, safely destroy it
    if (this.chatServices.has(panelId)) {
      try {
        const oldService = this.chatServices.get(panelId);
        if (oldService) {
          oldService.closeEventStream();
        }
      } catch (error) {
        console.error(`Error closing event stream for chat service panel ${panelId}:`, error);
        // Continue despite error, we still want to create a new instance
      }
    }
    
    // Create and store a new instance
    const newService = new ChatService(panelId);
    this.chatServices.set(panelId, newService);
    return newService;
  }

  static getCodingService(panelId: string): any {
    // If an instance already exists, safely destroy it
    if (this.codingServices.has(panelId)) {
      try {
        const oldService = this.codingServices.get(panelId);
        if (oldService) {
          oldService.closeEventStream();
        }
      } catch (error) {
        console.error(`Error closing event stream for coding service panel ${panelId}:`, error);
        // Continue despite error, we still want to create a new instance
      }
    }
    
    // Create and store a new instance
    const newService = new CodingService(panelId);
    this.codingServices.set(panelId, newService);
    return newService;
  }

  static getAgenticEditService(panelId: string): any {
    // If an instance already exists, safely destroy it
    if (this.agenticEditServices.has(panelId)) {
      try {
        const oldService = this.agenticEditServices.get(panelId);
        if (oldService) {
          oldService.closeEventStream();
        }
      } catch (error) {
        console.error(`Error closing event stream for panel ${panelId}:`, error);
        // Continue despite error, we still want to create a new instance
      }
    }
  
    // Create and store a new instance
    const newService = new AgenticEditService(panelId);
    this.agenticEditServices.set(panelId, newService);
    return newService;
  }

  static getAutoCoderConfService(panelId: string): any {
    // AutoCoderConfService doesn't have a specific cleanup method,
    // but we still create a new instance each time
    
    // Create and store a new instance
    const newService = new AutoCoderConfService();
    this.autoCoderConfServices.set(panelId, newService);
    return newService;
  }

  static getChatListService(panelId: string): any {
    // ChatListService doesn't have a specific cleanup method,
    // but we still create a new instance each time
    
    // Create and store a new instance
    const newService = new ChatListService();
    this.chatListServices.set(panelId, newService);
    return newService;
  }

  static getFileGroupService(panelId: string): any {
    // FileGroupService doesn't have a specific cleanup method,
    // but we still create a new instance each time
    
    // Create and store a new instance
    const newService = new FileGroupService();
    this.fileGroupServices.set(panelId, newService);
    return newService;
  }
}