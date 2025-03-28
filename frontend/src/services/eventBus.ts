// 事件名称常量
export const EVENTS = {
  EDITOR: {
    // 编辑器选项卡变更事件 CodeEditor.tsx 发布, FileGroupSelect.tsx 订阅
    TABS_CHANGED: 'editor.tabs.changed'
  },
  CODING: {
    // 编程任务完成事件
    TASK_COMPLETE: 'coding.task.complete'
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