# Queue Communicate 机制详解

queue_communicate 是一个基于队列的前后端通信机制，它允许服务端在执行过程中暂停并等待客户端的响应，实现双向交互。
同时也支持单向的流式响应。

基本思路是，前端向后端发起请求，获取一个唯一的 request_id，接着可以完成两件事：
1. 双向通信，向后端轮询事件，然后根据事件回复后端。
2. 单向流式通信，轮询后端流式输出。

## 双向通信

1. **请求ID (request_id)**
   - 每个通信会话都有一个唯一的请求ID
   - 用于标识和追踪特定的通信流程
   - 通常使用 UUID 生成

2. **事件类型 (CommunicateEventType)**
   ```python
   class CommunicateEventType(Enum):
       CODE_MERGE = "code_merge"
       CODE_GENERATE = "code_generate"
       CODE_MERGE_RESULT = "code_merge_result"
       CODE_UNMERGE_RESULT = "code_unmerge_result"
       CODE_START = "code_start"
       CODE_END = "code_end"
       CODE_HUMAN_AS_MODEL = "code_human_as_model"
       ASK_HUMAN = "ask_human"
       CODE_ERROR = "code_error"
   ```

3. **通信队列**
   - request_queues: 存储每个请求ID对应的事件队列
   - response_queues: 存储每个请求ID对应的响应队列

## 工作流程

### 1. 基本流程

1. 服务端发送事件
   ```python
   queue_communicate.send_event(
       request_id=request_id,
       event=CommunicateEvent(
           event_type=CommunicateEventType.CODE_START.value,
           data=query
       )
   )
   ```

2. 客户端轮询事件
   ```typescript
   const response = await fetch('/api/event/get', {
       method: 'POST',
       headers: {
           'Content-Type': 'application/json',
       },
       body: JSON.stringify({ request_id: requestId })
   });
   ```

3. 客户端响应事件
   ```typescript
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

### 2. 使用场景

#### 场景一：代码合并确认

当代码需要合并但需要用户确认时：

1. 后端发送合并结果事件：
```python
queue_communicate.send_event(
    request_id=self.args.request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_MERGE_RESULT.value,
        data=json.dumps(event_data, ensure_ascii=False),
    )
)
```

2. 前端展示合并结果并等待用户确认：
```typescript
if (eventData.event_type === 'code_merge_result') {
    const blocks = JSON.parse(eventData.data) as CodeBlock[];
    setPreviewFiles(blocks.map(block => ({
        path: block.file_path,
        content: `<<<<<<< SEARCH\n${block.old_block}\n=======\n${block.new_block}\n>>>>>>> REPLACE`
    })));
    setActivePanel('preview');
}
```

#### 场景二：人工模型模式

当启用 human_as_model 模式时：

1. 后端发送请求事件：
```python
queue_communicate.send_event(
    request_id=request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_HUMAN_AS_MODEL.value,
        data=json.dumps({"instruction": instruction})
    )
)
```

2. 前端处理并等待用户输入：
```typescript
if (eventData.event_type === 'code_human_as_model') {
    const result = JSON.parse(eventData.data);
    setActivePanel('clipboard');
    setClipboardContent(result.instruction);
    setPendingResponseEvent({
        requestId: requestId,
        eventData: eventData
    });
    addBotMessage("请复制右侧的文本,然后将结果复制黏贴会右侧。黏贴完请回复 '确认'");
}
```

#### 场景三：错误处理

当发生错误时：

1. 后端发送错误事件：
```python
queue_communicate.send_event(
    request_id=request_id,
    event=CommunicateEvent(
        event_type=CommunicateEventType.CODE_ERROR.value,
        data=str(error)
    )
)
```

2. 前端处理错误：
```typescript
if (eventData.event_type === 'code_error') {
    addBotMessage("代码修改失败：" + eventData.data);
    setRequestId("");
}
```

## 单向流式获取服务端信息

### pollStreamResult 函数

`pollStreamResult` 是一个实现流式响应的核心函数，它通过轮询机制实现了服务端到客户端的实时数据流传输。

#### 函数签名
```typescript
const pollStreamResult = async (
    requestId: string, 
    onUpdate: (text: string) => void
): Promise<PollResult>
```

#### 参数说明
- `requestId`: 请求ID，标识特定的轮询会话
- `onUpdate`: 回调函数，用于处理每次更新的文本内容
- 返回值: `PollResult` 对象，包含最终文本和状态

#### 实现细节

1. **状态管理**
```typescript
let result = '';
let status: 'running' | 'completed' | 'failed' = 'running';
```

2. **轮询和数据处理**
```typescript
while (status === 'running') {
    const response = await fetch(`/api/result/${requestId}`);
    const data: ResponseData = await response.json();
    status = data.status;
    
    if ('value' in data.result && Array.isArray(data.result.value)) {
        const newText = data.result.value.join('');
        if (newText !== result) {
            result = newText;
            onUpdate(result);  // 实时更新UI
        }
    }
}
```

3. **特殊模式处理**
```typescript
if (config.human_as_model && !isWriteMode) {
    if ('value' in data.result && Array.isArray(data.result.value)) {
        const newText = data.result.value.join('');
        if (newText !== result) {
            result += newText;
        }
    }
    // 处理人工模型模式的特殊逻辑
}
```

#### 与后端的交互

后端流式响应示例：
```python
for res in v:
    markdown_content += res[0]
    assistant_response += res[0]
    request_queue.add_request(
        args.request_id,
        RequestValue(
            value=StreamValue(value=[res[0]]),
            status=RequestOption.RUNNING,
        )
    )
    # 更新UI显示
```

#### 使用示例

1. **基础用法**
```typescript
const messageBotId = addBotMessage("");
await pollStreamResult(data.request_id, (newText) => {
    setMessages(prev => prev.map(msg =>
        msg.id === messageBotId ? { ...msg, content: newText } : msg
    ));
});
```



