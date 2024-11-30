# Queue Communicate 通信机制详解

queue_communicate 是一个用于前后端双向通信的机制，它基于队列实现，支持以下功能：

1. 双向通信：服务端可以暂停并等待客户端响应
2. 单向流式通信：支持从服务端到客户端的流式数据传输

## 基本概念

### 1. 请求标识 (request_id)
每个通信会话都有一个唯一的请求ID，用于标识和追踪特定的通信流程。

### 2. 事件类型
事件类型定义了不同的通信场景：

```python
class CommunicateEventType(Enum):
    CODE_MERGE = "code_merge"                 # 代码合并事件
    CODE_GENERATE = "code_generate"           # 代码生成事件
    CODE_MERGE_RESULT = "code_merge_result"   # 代码合并结果
    CODE_UNMERGE_RESULT = "code_unmerge_result" # 代码无法合并的结果
    CODE_START = "code_start"                 # 代码处理开始
    CODE_END = "code_end"                     # 代码处理结束
    CODE_HUMAN_AS_MODEL = "code_human_as_model" # 人工模型模式
    ASK_HUMAN = "ask_human"                   # 询问用户
    CODE_ERROR = "code_error"                 # 代码错误
```

## 使用方法

### 1. 双向通信

#### 后端发送事件
```python
# 发送事件并等待响应
response = queue_communicate.send_event(
    request_id=request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_MERGE_RESULT.value,
        data=json.dumps(event_data)
    )
)

# 发送事件但不等待响应
future = queue_communicate.send_event_no_wait(
    request_id=request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_START.value,
        data=query
    )
)
```

#### 前端处理事件和响应
```typescript
// 轮询获取事件
const response = await fetch('/api/event/get', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request_id: requestId })
});

// 响应事件
await fetch('/api/event/response', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        request_id: requestId,
        event: eventData,
        response: response
    })
});
```

### 2. 流式通信

#### 后端实现
```python
# 流式响应
request_queue.add_request(
    args.request_id,
    RequestValue(
        value=StreamValue(value=[chunk_data]),
        status=RequestOption.RUNNING
    )
)

# 完成响应
request_queue.add_request(
    args.request_id,
    RequestValue(
        value=StreamValue(value=[""]),
        status=RequestOption.COMPLETED
    )
)
```

#### 前端实现
```typescript
const pollStreamResult = async (
    requestId: string,
    onUpdate: (text: string) => void
): Promise<PollResult> => {
    let result = '';
    let status: 'running' | 'completed' | 'failed' = 'running';
    
    while (status === 'running') {
        const response = await fetch(`/api/result/${requestId}`);
        const data: ResponseData = await response.json();
        status = data.status;
        
        if ('value' in data.result && Array.isArray(data.result.value)) {
            const newText = data.result.value.join('');
            if (newText !== result) {
                result = newText;
                onUpdate(result);  // 更新UI
            }
        }
        
        if (status === 'completed') break;
        if (status === 'running') {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return { text: result, status };
};
```

## 使用示例

### 1. 代码合并确认流程

#### 后端代码
```python
# 发送代码合并结果
event_data = []
for file_path, old_block, new_block in changes_to_make:
    event_data.append({
        "file_path": file_path,
        "old_block": old_block,
        "new_block": new_block,
    })

response = queue_communicate.send_event(
    request_id=request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_MERGE_RESULT.value,
        data=json.dumps(event_data)
    )
)
```

#### 前端代码
```typescript
// 处理代码合并事件
if (eventData.event_type === 'code_merge_result') {
    const blocks = JSON.parse(eventData.data) as CodeBlock[];
    
    // 更新预览面板
    setPreviewFiles(blocks.map(block => ({
        path: block.file_path,
        content: `<<<<<<< SEARCH\n${block.old_block}\n=======\n${block.new_block}\n>>>>>>> REPLACE`
    })));
    
    // 切换到预览面板
    setActivePanel('preview');
    
    // 响应事件
    await response_event("proceed");
}
```

### 2. 人工模型模式

#### 后端代码
```python
# 发送人工模型请求
event_data = {
    "instruction": instruction,
    "model": model,
    "request_id": request_id,
}

response = queue_communicate.send_event(
    request_id=request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_HUMAN_AS_MODEL.value,
        data=json.dumps(event_data)
    )
)
```

#### 前端代码
```typescript
// 处理人工模型事件
if (eventData.event_type === 'code_human_as_model') {
    const result = JSON.parse(eventData.data);
    
    // 准备剪贴板内容
    setActivePanel('clipboard');
    setClipboardContent(result.instruction);
    
    // 保存事件以待响应
    setPendingResponseEvent({
        requestId: requestId,
        eventData: eventData
    });
    
    // 提示用户
    addBotMessage("请复制右侧的文本,然后将结果复制黏贴会右侧。黏贴完请回复 '确认'");
}
```

### 3. 流式聊天响应

#### 后端代码
```python
# 流式发送聊天响应
for chunk in chat_response:
    request_queue.add_request(
        request_id,
        RequestValue(
            value=StreamValue(value=[chunk]),
            status=RequestOption.RUNNING
        )
    )

# 标记完成
request_queue.add_request(
    request_id,
    RequestValue(
        value=StreamValue(value=[""]),
        status=RequestOption.COMPLETED
    )
)
```

#### 前端代码
```typescript
// 处理流式聊天响应
const messageBotId = addBotMessage("");
await pollStreamResult(data.request_id, (newText) => {
    if (newText === "") {
        newText = "typing...";
    }
    setMessages(prev => prev.map(msg =>
        msg.id === messageBotId ? { ...msg, content: newText } : msg
    ));
});
```

## 注意事项

1. 请始终处理超时情况，默认超时时间为 1800 秒
2. 确保正确处理错误状态和失败情况
3. 在使用流式通信时，注意处理网络断开的情况
4. 对于人工模型模式，建议实现适当的用户提示和引导
5. 使用 send_event_no_wait 时要注意处理异步操作的完成状态

通过这套通信机制，你可以实现复杂的前后端交互场景，特别适合需要人机协作或者流式响应的应用场景。