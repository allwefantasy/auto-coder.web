// 事件名称常量
export const EVENTS = {
  EDITOR: {
    // 编辑器选项卡变更事件 CodeEditor.tsx 发布, FileGroupSelect.tsx 订阅
    TABS_CHANGED: 'editor.tabs.changed',
    // 编辑器获得焦点事件 FileGroupSelect.tsx 发布, EditorComponent.tsx 订阅
    FOCUS: 'editor.focus'
  },
  CODING: {
    // 编程任务完成事件 codingService.ts 发布, HistoryPanel.tsx 订阅
    TASK_COMPLETE: 'coding.task.complete'
  },
  UI: {
    // 激活面板事件 CompletionMessage.tsx 发布, ExpertModePage.tsx 订阅
    ACTIVATE_PANEL: 'ui.panel.activate',
    // InputArea全屏切换事件 EditorComponent.tsx 发布, InputArea.tsx 订阅
    TOGGLE_INPUT_FULLSCREEN: 'input.area.toggle.fullscreen'
  },
  FILE_GROUP_SELECT: {
    // 聚焦文件组选择事件 EditorComponent.tsx 发布, FileGroupSelect.tsx 订阅
    FOCUS: 'file.group.select.focus'
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