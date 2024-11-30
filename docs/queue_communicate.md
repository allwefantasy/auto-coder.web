# Queue Communicate 通信机制详解

## 1. 概述

Queue Communicate 是一个基于队列的前后端双向通信机制，主要用于支持服务端在执行过程中与客户端进行实时交互。该机制主要用于以下场景：

- 代码修改确认
- 人工模型交互
- 流式返回结果
- 错误处理与传递

## 2. 核心组件

### 2.1 通信事件（CommunicateEvent）

```python
class CommunicateEventType(Enum):
    CODE_MERGE = "code_merge"              # 代码合并事件
    CODE_GENERATE = "code_generate"        # 代码生成事件
    CODE_MERGE_RESULT = "code_merge_result"# 合并结果事件
    CODE_UNMERGE_RESULT = "code_unmerge_result"  # 未合并结果事件
    CODE_START = "code_start"              # 开始事件
    CODE_END = "code_end"                  # 结束事件
    CODE_HUMAN_AS_MODEL = "code_human_as_model"  # 人工模型事件
    ASK_HUMAN = "ask_human"                # 询问用户事件
    CODE_ERROR = "code_error"              # 错误事件
```

### 2.2 事件数据结构

```typescript
interface CommunicateEvent {
    event_type: string;  // 事件类型
    data: string;        // 事件数据
}
```

## 3. 使用指南

### 3.1 基本流程

1. 初始化通信
```typescript
const requestId = uuid.v4();
```

2. 发送事件
```typescript
// 后端发送事件
queue_communicate.send_event(
    request_id=request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_START.value,
        data="start processing"
    )
)

// 前端获取事件
const response = await fetch('/api/event/get', {
    method: 'POST',
    body: JSON.stringify({ request_id: requestId })
});
```

3. 响应事件
```typescript
await fetch('/api/event/response', {
    method: 'POST',
    body: JSON.stringify({
        request_id: requestId,
        event: eventData,
        response: "proceed"
    })
});
```

### 3.2 常见场景示例

#### 代码合并确认
```typescript
// 前端处理代码合并事件
if (eventData.event_type === 'code_merge_result') {
    const blocks = JSON.parse(eventData.data);
    setPreviewFiles(blocks.map(block => ({
        path: block.file_path,
        content: `<<<<<<< SEARCH\n${block.old_block}\n=======\n${block.new_block}\n>>>>>>> REPLACE`
    })));
    setActivePanel('preview');
}
```

#### 人工模型模式
```typescript
// 前端处理人工模型事件
if (eventData.event_type === 'code_human_as_model') {
    const result = JSON.parse(eventData.data);
    setActivePanel('clipboard');
    setClipboardContent(result.instruction);
    addBotMessage("请复制右侧的文本，完成后回复'确认'");
}
```

#### 流式结果处理
```typescript
// 前端处理流式结果
const pollStreamResult = async (requestId: string, onUpdate: (text: string) => void) => {
    let status = 'running';
    while (status === 'running') {
        const response = await fetch(`/api/result/${requestId}`);
        const data = await response.json();
        status = data.status;
        onUpdate(data.result.value);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
};
```

## 4. 最佳实践

### 4.1 错误处理
```typescript
try {
    // 业务逻辑
} catch (error) {
    queue_communicate.send_event(
        request_id=request_id,
        event=CommunicateEvent(
            event_type=CommunicateEventType.CODE_ERROR.value,
            data=str(error)
        )
    );
}
```

### 4.2 资源清理
```typescript
// 通信完成后清理资源
queue_communicate.close(request_id);
```

### 4.3 超时处理
```typescript
const TIMEOUT = 1800;  // 30分钟超时
const response = await fetch(`/api/result/${requestId}`, {
    signal: AbortSignal.timeout(TIMEOUT * 1000)
});
```

## 5. 注意事项

1. **请求ID管理**
   - 确保每个会话使用唯一的请求ID
   - 及时清理完成的请求ID相关资源

2. **事件处理**
   - 保持事件处理的原子性
   - 避免在事件处理中进行长时间阻塞操作

3. **错误处理**
   - 统一处理网络错误和超时
   - 提供清晰的错误信息给用户

4. **资源管理**
   - 及时清理不再使用的队列
   - 避免内存泄漏

5. **性能优化**
   - 合理设置轮询间隔
   - 使用防抖处理频繁更新