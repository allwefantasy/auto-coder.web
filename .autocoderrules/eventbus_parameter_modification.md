
##File: /Users/allwefantasy/projects/auto-coder.web/.autocoderrules/eventbus_parameter_modification.md
# EventBus 事件参数修改规范

## 简要说明

本规范描述了在使用 eventBus 进行组件间通信时，当需要修改事件参数时应遵循的最佳实践。特别是当发布者修改事件参数结构时，如何确保所有订阅者能够正确处理新的参数格式，避免运行时错误。

## 典型用法

以下示例基于项目中的 `EditorComponent.tsx` 和 `ChatPanel.tsx` 展示事件发布和订阅的典型模式。

### 1. 事件发布和订阅的基本结构

```typescript
// 发布者：EditorComponent.tsx
eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, autoModeMessage);

// 订阅者：ChatPanel.tsx
const unsubscribeNewMessage = eventBus.subscribe(
  EVENTS.CHAT.NEW_MESSAGE,
  (message: any) => {
    // 处理接收到的消息
    console.log('ChatPanel: Received message from eventBus:', message);
    // ...其他处理逻辑
  }
);
```

### 2. 修改事件参数时的处理流程

当需要修改事件的参数结构时（例如从传递字符串改为传递对象），应该采取以下步骤：

#### 2.1 定位所有事件订阅者

```typescript
// 使用代码搜索功能，查找所有订阅该事件的位置
// 例如搜索: eventBus.subscribe(EVENTS.CHAT.NEW_MESSAGE
```

#### 2.2 修改事件发布代码

```typescript
// 修改前的发布代码
eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, "some message");

// 修改后的发布代码
eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, {
  content: "some message",
  timestamp: Date.now(),
  // 其他新增字段
});
```

#### 2.3 更新所有订阅者的处理逻辑

```typescript
// 修改前的订阅代码
const unsubscribe = eventBus.subscribe(
  EVENTS.CHAT.NEW_MESSAGE,
  (message: string) => {
    if (editorRef.current) {
      editorRef.current.setValue(message);
      handleSendMessage();
    }
  }
);

// 修改后的订阅代码（兼容新旧格式）
const unsubscribe = eventBus.subscribe(
  EVENTS.CHAT.NEW_MESSAGE,
  (message: any) => {
    // 类型检查，兼容新旧格式
    if (typeof message === 'object' && message.content) {
      if (editorRef.current) {
        editorRef.current.setValue(message.content);
        handleSendMessage();
      }
    } else if (typeof message === 'string') {
      // 向后兼容，仍然处理字符串类型的消息
      if (editorRef.current) {
        editorRef.current.setValue(message);
        handleSendMessage();
      }
    }
  }
);
```

## 最佳实践

### 1. 事件参数类型定义

使用 TypeScript 接口定义事件参数结构，并在订阅函数中正确应用：

```typescript
// 在共享类型文件中定义
interface NewMessageEvent {
  content: string;
  timestamp: number;
  sender?: string;
  metadata?: Record<string, any>;
}

// 发布事件时
eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, {
  content: "Hello World",
  timestamp: Date.now()
} as NewMessageEvent);

// 订阅事件时
eventBus.subscribe(
  EVENTS.CHAT.NEW_MESSAGE,
  (event: NewMessageEvent) => {
    console.log(`收到消息: ${event.content}, 时间: ${new Date(event.timestamp).toLocaleString()}`);
  }
);
```

### 2. 使用类定义事件数据（推荐）

相比接口，使用类定义事件数据有以下优势：
- 可通过构造函数创建实例
- 提供更好的运行时类型支持
- 可以附加方法处理数据

```typescript
// 在共享类型文件 event_bus_data.ts 中定义
export class NewChatEventData {
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param panelId 面板ID
   */
  constructor(panelId?: string) {
    this.panelId = panelId;
  }
}

// 发布事件时
import { NewChatEventData } from '../../services/event_bus_data';

// 直接实例化类
eventBus.publish(EVENTS.CHAT.NEW_CHAT, new NewChatEventData(panelId));

// 订阅事件时
eventBus.subscribe(
  EVENTS.CHAT.NEW_CHAT,
  (data: NewChatEventData) => {
    // 类型安全的访问
    console.log(`处理面板 ${data.panelId} 的新对话事件`);
  }
);
```

### 3. 版本兼容性处理

在修改事件参数结构时，采用增量方式而非破坏性更改：

```typescript
// 好的做法：添加新字段，保留原有字段
eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, {
  message: "原始消息字段保持不变",  // 保留原有字段
  details: {                     // 添加新字段
    timestamp: Date.now(),
    source: "user"
  }
});

// 避免的做法：完全改变结构
// 不要这样做，会破坏现有的订阅者
eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, {
  content: "这是新结构，不兼容旧订阅者",
  meta: { time: Date.now() }
});
```

### 4. 参数验证与默认值

在订阅者中添加参数验证和默认值，增强代码健壮性：

```typescript
eventBus.subscribe(
  EVENTS.CHAT.NEW_MESSAGE,
  (message: any) => {
    // 参数验证
    if (!message) {
      console.warn('接收到无效的消息参数');
      return;
    }
    
    // 默认值处理
    const content = typeof message === 'object' ? message.content || '' : String(message);
    const timestamp = message.timestamp || Date.now();
    
    // 处理逻辑...
  }
);
```

### 5. 事件参数重构步骤

当需要对事件参数进行重大改动时，遵循以下步骤：

1. **分析影响范围**：使用代码搜索确定所有订阅该事件的位置
2. **设计新参数结构**：确保新结构满足需求且具有良好的扩展性
3. **实现向后兼容性**：修改所有订阅者以支持新旧格式
4. **测试验证**：确保所有订阅者都能正确处理新的参数格式
5. **逐步迁移**：在一定过渡期后，可以考虑移除对旧格式的支持

## 实际案例分析

以 `ChatPanel.tsx` 中的 `EVENTS.CHAT.NEW_CHAT` 事件为例：

```typescript
// 原始代码
// 订阅者
const unsubscribeNewChat = eventBus.subscribe(
  EVENTS.CHAT.NEW_CHAT,
  handleNewChatDirectly
);

// 处理函数
const handleNewChatDirectly = async () => {
  try {
    // 清空当前对话内容
    setMessages([]);

    const newChatName = await chatListService.createNewChat(panelId);
    if (newChatName) {
      // 设置新的对话名称
      setChatListName(newChatName);
      setChatLists(prev => [newChatName, ...prev.filter(name => name !== newChatName)]);        
    }
  } catch (error) {
    console.error('Error creating new chat directly:', error);
    AntdMessage.error('创建新聊天失败');
  }
};
```

当需要向 `handleNewChatDirectly` 函数添加 `panelId` 参数时，修改步骤：

```typescript
// 修改后的处理函数
const handleNewChatDirectly = async (eventPanelId: string) => {
  // 如果传入了panelId且与当前面板的panelId不匹配，则不处理此事件
  if (eventPanelId && eventPanelId !== panelId) {
    return;
  }

  try {
    // 清空当前对话内容
    setMessages([]);

    const newChatName = await chatListService.createNewChat(panelId);
    if (newChatName) {
      // 设置新的对话名称
      setChatListName(newChatName);
      setChatLists(prev => [newChatName, ...prev.filter(name => name !== newChatName)]);        
    }
  } catch (error) {
    console.error('Error creating new chat directly:', error);
    AntdMessage.error('创建新聊天失败');
  }
};

// 同时修改发布代码（在其他组件中）
eventBus.publish(EVENTS.CHAT.NEW_CHAT, targetPanelId);
```

## 注意事项

1. **参数类型检查**：始终在订阅者中对事件参数进行类型检查
2. **文档更新**：修改事件参数后，更新相关文档，说明新的参数结构
3. **渐进式改进**：采用渐进式方法修改事件参数，确保向后兼容
4. **测试覆盖**：为事件发布和订阅添加足够的测试用例
5. **跨团队协调**：事件修改可能影响多个团队负责的组件，应提前协调

按照本规范进行 EventBus 事件参数修改，可以确保组件间通信的稳定性和代码的健壮性，同时减少因参数更改导致的运行时错误。
