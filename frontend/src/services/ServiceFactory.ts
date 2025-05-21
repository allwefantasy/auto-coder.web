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

  static getChatService(panelId: string): ChatService {
    // 检查是否已存在实例
    const existing = this.chatServices.get(panelId);
    if (existing) {
      return existing; // 直接返回现有实例
    }
    
    // 创建并存储新实例
    const newService = new ChatService(panelId);
    this.chatServices.set(panelId, newService);
    return newService;
  }

  static getCodingService(panelId: string): CodingService {
    // 检查是否已存在实例
    const existing = this.codingServices.get(panelId);
    if (existing) {
      return existing; // 直接返回现有实例
    }
    
    // 创建并存储新实例
    const newService = new CodingService(panelId);
    this.codingServices.set(panelId, newService);
    return newService;
  }

  static getAgenticEditService(panelId: string): AgenticEditService {
    // 检查是否已存在实例
    const existing = this.agenticEditServices.get(panelId);
    if (existing) {
      return existing; // 直接返回现有实例
    }
  
    // 创建并存储新实例
    const newService = new AgenticEditService(panelId);
    this.agenticEditServices.set(panelId, newService);
    return newService;
  }

  static getAutoCoderConfService(panelId: string): AutoCoderConfService {
    // 检查是否已存在实例
    const existing = this.autoCoderConfServices.get(panelId);
    if (existing) {
      return existing; // 直接返回现有实例
    }
    
    // 创建并存储新实例
    const newService = new AutoCoderConfService();
    this.autoCoderConfServices.set(panelId, newService);
    return newService;
  }

  static getChatListService(panelId: string): ChatListService {
    // 检查是否已存在实例
    const existing = this.chatListServices.get(panelId);
    if (existing) {
      return existing; // 直接返回现有实例
    }
    
    // 创建并存储新实例
    const newService = new ChatListService();
    this.chatListServices.set(panelId, newService);
    return newService;
  }

  static getFileGroupService(panelId: string): FileGroupService {
    // 检查是否已存在实例
    const existing = this.fileGroupServices.get(panelId);
    if (existing) {
      return existing; // 直接返回现有实例
    }
    
    // 创建并存储新实例
    const newService = new FileGroupService();
    this.fileGroupServices.set(panelId, newService);
    return newService;
  }
  
  // 提供显式关闭服务的方法，用于组件销毁时
  static cleanupServices(panelId: string): void {
    try {
      // 清理聊天服务
      const chatService = this.chatServices.get(panelId);
      if (chatService) {
        chatService.closeEventStream();
        this.chatServices.delete(panelId);
      }
      
      // 清理编码服务
      const codingService = this.codingServices.get(panelId);
      if (codingService) {
        codingService.closeEventStream();
        this.codingServices.delete(panelId);
      }
      
      // 清理智能编辑服务
      const agenticService = this.agenticEditServices.get(panelId);
      if (agenticService) {
        agenticService.closeEventStream();
        this.agenticEditServices.delete(panelId);
      }
      
      // 移除其他不需要特殊清理的服务
      this.autoCoderConfServices.delete(panelId);
      this.chatListServices.delete(panelId);
      this.fileGroupServices.delete(panelId);
      
      console.log(`已清理与面板 ${panelId} 关联的所有服务`);
    } catch (error) {
      console.error(`清理面板 ${panelId} 的服务时出错:`, error);
    }
  }
}