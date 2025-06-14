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
    SHOW_MODAL: 'ui.modal.show',
    // 模式切换事件 EditorComponent.tsx 发布, InputArea.tsx 订阅
    TOGGLE_WRITE_MODE: 'ui.toggle.write.mode'
  },
  HISTORY: {
    // 按提交哈希过滤历史记录
    FILTER_BY_COMMIT: 'history.filter.by.commit'
  },
  FILE_GROUP_SELECT: {
    // 聚焦文件组选择事件 EditorComponent.tsx 发布, FileGroupSelect.tsx 订阅
    FOCUS: 'file.group.select.focus',
    // 文件组选择更新事件 FileGroupSelect.tsx 发布, ChatPanel.tsx 订阅
    SELECTION_UPDATED: 'file.group.select.selection.updated'
  },
  CHAT: {
    // 从特定消息重新开始对话事件 UserMessage.tsx 发布, ChatPanel.tsx 订阅
    REFRESH_FROM_MESSAGE: 'chat.refresh.from.message',
    // 新建对话事件 EditorComponent.tsx 发布, ChatPanel.tsx 订阅
    NEW_CHAT: 'chat.new',
    // 对话面板产生新消息事件， ChatPanel.tsx 发布, ExpertModePage.tsx 订阅
    NEW_MESSAGE: 'chat.new.message',
    // 发送消息事件 InputArea.tsx/EditorComponent.tsx 发布, ChatPanel.tsx 订阅
    SEND_MESSAGE: 'chat.send.message',
    // 停止生成事件 InputArea.tsx/EditorComponent.tsx 发布, ChatPanel.tsx 订阅
    STOP_GENERATION: 'chat.stop.generation'
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
  AGENTIC: { // 添加 AGENTIC 事件组
    // Step By Step 模式变更事件
    MODE_CHANGED: 'agentic.mode.changed'
  },
  CONFIG: { // 配置相关事件
    // Code Model 配置更新事件 CodeModelSelector.tsx/ModelConfig.tsx 发布, 两者互相订阅
    CODE_MODEL_UPDATED: 'config.code_model.updated',
    // Model 列表更新事件 ModelManagement.tsx 发布, CodeModelSelector.tsx 订阅
    MODEL_LIST_UPDATED: 'config.model_list.updated'
  },
  PROVIDER: { // 供应商相关事件
    // 供应商列表更新事件 ProviderManagement.tsx 发布, ModelManagement.tsx 订阅
    UPDATED: 'provider.updated'
  },
  HOTKEY: { // 全局热键事件
    // 发送消息热键
    SEND: 'hotkey.send',
    // 切换全屏热键
    TOGGLE_FULLSCREEN: 'hotkey.toggle.fullscreen',
    // 聚焦文件组选择热键
    FOCUS_FILE_GROUP: 'hotkey.focus.file.group',
    // 新建对话热键
    NEW_CHAT: 'hotkey.new.chat',
    // 切换模式热键
    TOGGLE_MODE: 'hotkey.toggle.mode'
  }
}  as const;

type Listener = (...args: any[]) => void;


type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
}[keyof T];

type PickValues<T> = {
  -readonly [k in keyof T]: T[k] extends Record<string,any> ?  Mutable<T[k]> : T[k];
}[keyof T];

type EventNames = PickValues<typeof EVENTS>;

// type SubTypes<T> =   (T extends any ? (arg: T) => void : never) extends (arg: infer P) => void ? P : never

class EventBus {
  private events: {[key: string]: Listener[]} = {};
  
  subscribe(event: EventNames, callback: Listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
   const index =  this.events[event].push(callback);
    
    // 返回取消订阅函数
    return () => {
      this.events[event] = this.events[event].splice(index - 1, 1);
    };
  }
  
  publish(event: EventNames, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }
}

export default new EventBus(); 