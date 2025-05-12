import eventBus, { EVENTS } from '../services/eventBus';
import { HotkeyEventData } from '../services/event_bus_data';

type Scope = string; // panelId

/**
 * 全局热键管理器
 * 负责管理系统中所有快捷键，并通过事件总线分发给正确的组件
 */
class HotkeyManager {
  private currentScope: Scope = 'main';
  private enabled: boolean = true;
  private isMac: boolean = navigator.platform.indexOf('Mac') === 0;
  // 添加一个标记，指示是否允许覆盖Monaco编辑器热键
  private overrideMonacoHotkeys: boolean = true;

  constructor() {
    // 初始化时添加全局事件监听
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 设置当前热键作用域（当前激活的面板ID）
   * @param scope 作用域标识（面板ID）
   */
  setScope(scope: Scope): void {
    this.currentScope = scope;
  }

  /**
   * 启用或禁用热键管理器
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 设置是否覆盖Monaco编辑器热键
   * @param override 是否覆盖
   */
  setOverrideMonacoHotkeys(override: boolean): void {
    this.overrideMonacoHotkeys = override;
  }

  /**
   * 获取当前作用域
   * @returns 当前作用域（面板ID）
   */
  getScope(): Scope {
    return this.currentScope;
  }

  /**
   * 检查当前焦点是否在Monaco编辑器内
   * @returns 是否在Monaco编辑器内
   */
  private isInMonacoEditor(): boolean {
    // 检查当前焦点元素是否在Monaco编辑器内
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    // 检查标记Monaco编辑器的特征
    // 1. 检查textarea元素是否有Monaco编辑器相关类名
    if (activeElement.tagName === 'TEXTAREA' && 
        (activeElement.className.includes('monaco') || 
         activeElement.className.includes('editor'))) {
      return true;
    }
    
    // 2. 向上查找父元素，寻找编辑器容器
    let parent = activeElement.parentElement;
    while (parent) {
      if (parent.className.includes('monaco-editor') || 
          parent.className.includes('editor-container')) {
        return true;
      }
      parent = parent.parentElement;
    }
    
    return false;
  }

  /**
   * 全局键盘事件处理函数
   * @param e 键盘事件
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;    
    const metaOrCtrl = this.isMac ? e.metaKey : e.ctrlKey;
    const isInEditor = this.isInMonacoEditor();
    
    // 如果在编辑器内，并且不覆盖Monaco热键，则按需处理
    if (isInEditor && !this.overrideMonacoHotkeys) {
      // 我们仍然处理某些必要的快捷键，但允许其他快捷键传递给Monaco
      if (metaOrCtrl) {
        switch (e.code) {
          case 'Enter': // 发送消息是基础功能，始终重写
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.HOTKEY.SEND, new HotkeyEventData(this.currentScope));
            return;
            
          case 'KeyL': // 全屏切换是基础功能，始终重写
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.HOTKEY.TOGGLE_FULLSCREEN, new HotkeyEventData(this.currentScope));
            return;
            
          case 'Period': // 模式切换是基础功能，始终重写
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.HOTKEY.TOGGLE_MODE, new HotkeyEventData(this.currentScope));
            return;
            
          // 其他快捷键让Monaco处理
        }
      }
      
      // 让其他快捷键传递给Monaco
      return;
    }
    
    // 正常处理所有快捷键（不在编辑器中，或允许覆盖）
    if (metaOrCtrl) {
      switch (e.code) {
        case 'Enter':
          // Cmd/Ctrl + Enter: 发送消息
          e.preventDefault();
          eventBus.publish(EVENTS.HOTKEY.SEND, new HotkeyEventData(this.currentScope));
          break;
          
        case 'KeyL':
          // Cmd/Ctrl + L: 切换全屏
          e.preventDefault();
          eventBus.publish(EVENTS.HOTKEY.TOGGLE_FULLSCREEN, new HotkeyEventData(this.currentScope));
          break;
          
        case 'KeyI':
          // Cmd/Ctrl + I: 聚焦文件组选择
          e.preventDefault();
          eventBus.publish(EVENTS.HOTKEY.FOCUS_FILE_GROUP, new HotkeyEventData(this.currentScope));
          break;
          
        case 'Slash':
          // Cmd/Ctrl + /: 新建对话
          e.preventDefault();
          eventBus.publish(EVENTS.HOTKEY.NEW_CHAT, new HotkeyEventData(this.currentScope));
          break;
          
        case 'Period':
          // Cmd/Ctrl + .: 切换模式
          e.preventDefault();
          eventBus.publish(EVENTS.HOTKEY.TOGGLE_MODE, new HotkeyEventData(this.currentScope));
          break;
      }
    }
  };

  /**
   * 清理函数，移除事件监听
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

// 导出单例实例
export default new HotkeyManager(); 