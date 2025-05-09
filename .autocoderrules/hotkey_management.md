
---
title: 全局热键管理最佳实践
description: 本文档描述了在 React 应用中实现全局热键管理的最佳实践，特别是通过事件总线（EventBus）将热键事件分发到正确的组件的方法。
---
# 全局热键管理最佳实践

## 简要说明

本文档描述了在 React 应用中实现全局热键管理的最佳实践，特别是通过事件总线（EventBus）将热键事件分发到正确的组件的方法。

## 全局热键管理器

通过实现全局热键管理器，将热键监听逻辑集中管理，然后通过事件总线将事件分发到当前活跃的组件：

### 1. 热键管理器设计

```typescript
// HotkeyManager.ts
import eventBus, { EVENTS } from '../services/eventBus';
import { HotkeyEventData } from '../services/event_bus_data';

class HotkeyManager {
  private currentScope: string = 'main'; // 当前活跃面板ID
  private enabled: boolean = true;
  private isMac: boolean = navigator.platform.indexOf('Mac') === 0;

  constructor() {
    // 初始化时添加全局事件监听
    document.addEventListener('keydown', this.handleKeyDown);
  }

  setScope(scope: string): void {
    this.currentScope = scope;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;

    const metaOrCtrl = this.isMac ? e.metaKey : e.ctrlKey;
    
    if (metaOrCtrl) {
      switch (e.code) {
        case 'Enter':
          // Cmd/Ctrl + Enter: 发送消息
          e.preventDefault();
          eventBus.publish(EVENTS.HOTKEY.SEND, new HotkeyEventData(this.currentScope));
          break;
        // 其他快捷键...
      }
    }
  };

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

export default new HotkeyManager();
```

### 2. 事件数据类定义

```typescript
// event_bus_data.ts
export class HotkeyEventData {
  /** 面板ID */
  panelId: string;
  
  constructor(panelId: string) {
    this.panelId = panelId;
  }
}
```

### 3. 事件类型定义

```typescript
// eventBus.ts
export const EVENTS = {
  // 其他事件...
  HOTKEY: {
    SEND: 'hotkey.send',
    TOGGLE_FULLSCREEN: 'hotkey.toggle.fullscreen',
    FOCUS_FILE_GROUP: 'hotkey.focus.file.group',
    NEW_CHAT: 'hotkey.new.chat',
    TOGGLE_MODE: 'hotkey.toggle.mode'
  }
};
```

## 实施步骤

### 1. 初始化热键管理器

在应用入口点（如 `App.tsx`）初始化热键管理器：

```typescript
// App.tsx
import HotkeyManager from './utils/HotkeyManager';

const App: React.FC = () => {
  useEffect(() => {
    // 其他初始化...
    
    // 确保热键管理器在组件卸载时清理
    return () => {
      HotkeyManager.destroy();
    };
  }, []);
  
  // 其他组件逻辑...
};
```

### 2. 在面板切换时设置作用域

确保当用户切换活跃面板时，更新热键管理器的作用域：

```typescript
// ChatPanels.tsx
useEffect(() => {
  // 设置热键管理器的作用域为当前活动标签ID
  HotkeyManager.setScope(activeTabId);
}, [activeTabId]);
```

### 3. 组件订阅热键事件

组件根据自身需要，订阅相关的热键事件：

```typescript
// InputArea.tsx
useEffect(() => {
  // 只有当面板处于活跃状态时才订阅热键事件
  if (!isActive) return;

  // 处理发送消息热键
  const handleSendHotkey = (data: HotkeyEventData) => {
    if (data.panelId !== panelId) return;
    handleSendMessage();
  };

  // 订阅热键事件
  const unsubscribe = eventBus.subscribe(EVENTS.HOTKEY.SEND, handleSendHotkey);

  return () => {
    unsubscribe();
  };
}, [isActive, panelId, handleSendMessage]);
```

## 最佳实践

### 1. 热键定义集中管理

将所有热键定义集中在 `eventBus.ts` 中的 `EVENTS.HOTKEY` 对象内，便于统一管理和文档化。

### 2. 考虑面板作用域

始终在事件处理函数中检查 `panelId` 是否匹配当前组件：

```typescript
const handleHotkey = (data: HotkeyEventData) => {
  // 只处理当前面板的事件
  if (data.panelId !== panelId) return;
  
  // 执行热键操作
};
```

### 3. 基于活跃状态订阅事件

只在组件处于活跃状态时订阅热键事件，非活跃时取消订阅：

```typescript
useEffect(() => {
  // 只有当面板处于活跃状态时才订阅热键事件
  if (!isActive) return;
  
  // 订阅事件...
  
  return () => {
    // 清理订阅...
  };
}, [isActive]);
```

### 4. 避免在编辑器中直接绑定快捷键

避免使用 Monaco Editor 的 `addCommand` 直接绑定快捷键：

```typescript
// 不推荐的方式
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
  // 逻辑...
});

// 推荐的方式：使用事件总线
// 在 HotkeyManager 中监听并发布事件
// 在组件中订阅事件
```

### 5. 热键反馈

在触发热键时提供适当的视觉或声音反馈，增强用户体验：

```typescript
const handleHotkey = (data: HotkeyEventData) => {
  if (data.panelId !== panelId) return;
  
  // 执行操作
  someAction();
  
  // 可选的反馈
  message.info('操作已执行', 1);
};
```

## 实际案例

### 用例 1：发送消息

当用户按下 `Cmd/Ctrl+Enter` 时，在当前活跃面板中发送消息：

```typescript
// HotkeyManager.ts
case 'Enter':
  if (metaOrCtrl) {
    e.preventDefault();
    eventBus.publish(EVENTS.HOTKEY.SEND, new HotkeyEventData(this.currentScope));
  }
  break;

// InputArea.tsx
useEffect(() => {
  if (!isActive) return;
  
  const handleSendHotkey = (data: HotkeyEventData) => {
    if (data.panelId !== panelId) return;
    handleSendMessage();
  };
  
  const unsubscribe = eventBus.subscribe(EVENTS.HOTKEY.SEND, handleSendHotkey);
  
  return () => unsubscribe();
}, [isActive, panelId, handleSendMessage]);
```

### 用例 2：聚焦文件组选择器

当用户按下 `Cmd/Ctrl+I` 时，聚焦到当前面板的文件组选择器：

```typescript
// FileGroupSelect.tsx
useEffect(() => {
  const handleHotkeyFocus = (data: HotkeyEventData) => {
    if (data.panelId !== panelId) return;
    
    if (selectRef.current) {
      selectRef.current.focus();
    }
  };

  const unsubscribe = eventBus.subscribe(EVENTS.HOTKEY.FOCUS_FILE_GROUP, handleHotkeyFocus);
  
  return () => unsubscribe();
}, [panelId]);
```

## 优势与局限性

### 优势

1. **避免热键冲突**：只有当前活跃面板会响应热键
2. **集中管理**：所有热键定义和监听逻辑集中在一处
3. **易于扩展**：添加新的热键只需在 `HotkeyManager` 和相关组件中添加少量代码
4. **更好的跨组件复用**：热键逻辑可以在多个不同类型的组件间共享
5. **性能优化**：只有当前活跃组件订阅热键事件，减少不必要的事件处理

### 局限性

1. **学习曲线**：开发者需要理解事件总线和热键管理器的工作方式
2. **调试复杂性**：事件发布和订阅分离，可能增加调试难度
3. **与第三方组件集成**：可能需要特殊处理才能与某些第三方组件兼容

## 注意事项

1. **热键冲突**：避免与浏览器默认热键冲突
2. **文档更新**：热键更改时及时更新用户文档
3. **平台差异**：考虑不同操作系统（macOS、Windows）的按键差异
4. **键盘事件顺序**：注意 `keydown`, `keypress`, `keyup` 的顺序会影响事件处理
5. **可访问性**：确保所有通过热键触发的功能也可以通过鼠标操作

按照本文档中的最佳实践实现全局热键管理，可以显著提升用户体验，同时简化代码维护和扩展。
