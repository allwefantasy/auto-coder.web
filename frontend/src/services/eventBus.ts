// 事件名称常量
export const EVENTS = {
  EDITOR: {
    // 编辑器选项卡变更事件 CodeEditor.tsx 发布, FileGroupSelect.tsx 订阅
    TABS_CHANGED: 'editor.tabs.changed',
    // 编辑器获得焦点事件 FileGroupSelect.tsx 发布, EditorComponent.tsx 订阅
    FOCUS: 'editor.focus',
    // 编辑器中提到项变更事件 EditorComponent.tsx 发布, FileGroupSelect.tsx 订阅
    MENTIONS_CHANGED: 'editor.mentions.changed'
  },
  CODING: {
    // 编程任务完成事件 codingService.ts 发布, HistoryPanel.tsx 订阅
    TASK_COMPLETE: 'coding.task.complete'
  },
  UI: {
    // 激活面板事件 CompletionMessage.tsx 发布, ExpertModePage.tsx 订阅
    ACTIVATE_PANEL: 'ui.panel.activate',
    // InputArea全屏切换事件 EditorComponent.tsx 发布, InputArea.tsx 订阅
    TOGGLE_INPUT_FULLSCREEN: 'input.area.toggle.fullscreen',
    // 显示弹出框事件
    SHOW_MODAL: 'ui.modal.show'
  },
  FILE_GROUP_SELECT: {
    // 聚焦文件组选择事件 EditorComponent.tsx 发布, FileGroupSelect.tsx 订阅
    FOCUS: 'file.group.select.focus'
  },
  CHAT: {
    // 从特定消息重新开始对话事件 UserMessage.tsx 发布, ChatPanel.tsx 订阅
    REFRESH_FROM_MESSAGE: 'chat.refresh.from.message',
    // 新建对话事件 EditorComponent.tsx 发布, ChatPanel.tsx 订阅
    NEW_CHAT: 'chat.new'
  },
  RAG: {
    // RAG配置更新事件 RagConfig.tsx 发布, RagSelector.tsx 订阅
    UPDATED: 'rag.updated',
    // RAG启用状态变更事件 RagSelector.tsx 发布, ChatPanel.tsx 订阅
    ENABLED_CHANGED: 'rag.enabled.changed'
  },
  MCPS: { // 添加 MCPS 事件组
    // MCPs启用状态变更事件 MCPsSelector.tsx 发布, ChatPanel.tsx 订阅
    ENABLED_CHANGED: 'mcps.enabled.changed'
  },
  CONFIG: { // 配置相关事件
    // Code Model 配置更新事件 CodeModelSelector.tsx/ModelConfig.tsx 发布, 两者互相订阅
    CODE_MODEL_UPDATED: 'config.code_model.updated'
  },
  PROVIDER: {
    UPDATED: 'provider.updated'  // 新增供应商变更事件
  }
};

type Listener = (...args: any[]) => void;

class EventBus {
  private events: {[key: string]: Listener[]} = {};
  
  subscribe(event: string, callback: Listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // 返回取消订阅函数
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }
  
  publish(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }
}

export default new EventBus(); 