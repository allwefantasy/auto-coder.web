# Queue Communicate 机制详解

queue_communicate 是一个基于队列的前后端通信机制，它允许服务端在执行过程中暂停并等待客户端的响应，实现双向交互。这个机制在 auto-coder 项目中被广泛使用，特别是在需要用户确认或输入的场景中。

## 核心概念

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

## 实现细节

### 1. 队列管理

QueueCommunicate 类使用两个主要的数据结构：

```python
self.request_queues = {}  # 存储请求队列
self.response_queues = {}  # 存储响应队列
```

### 2. 线程安全

- 使用线程锁确保并发安全
- 使用线程池管理事件发送和消费

```python
self.lock = threading.Lock()
self.send_event_executor = ThreadPoolExecutor(max_workers=100)
self.consume_event_executor = ThreadPoolExecutor(max_workers=100)
```

### 3. 超时处理

- 默认超时时间为 1800 秒（30分钟）
- 可以在发送事件时指定超时时间

```python
def send_event(self, request_id: str, event: Any, timeout: int = TIMEOUT) -> Any:
    future = self.send_event_executor.submit(
        self._send_event_task, request_id, event
    )
    return future.result(timeout=timeout)
```

## 最佳实践

1. **始终使用唯一的请求ID**
   ```python
   request_id = str(uuid.uuid4())
   ```

2. **正确处理事件生命周期**
   - 发送开始事件
   - 处理中间事件
   - 发送结束事件
   - 处理错误事件

3. **适当的错误处理**
   ```python
   try:
       # 处理逻辑
   except Exception as e:
       queue_communicate.send_event(
           request_id=request_id,
           event=CommunicateEvent(
               event_type=CommunicateEventType.CODE_ERROR.value,
               data=str(e)
           )
       )
   ```

4. **及时清理资源**
   ```python
   def close(self, request_id: str):
       with self.lock:
           if request_id in self.request_queues:
               request_queue = self.request_queues.pop(request_id)
               request_queue.put(None)
           if request_id in self.response_queues:
               self.response_queues.pop(request_id)
   ```

## 注意事项

1. 避免长时间阻塞队列
2. 正确处理超时情况
3. 确保请求ID的唯一性
4. 适当处理并发情况
5. 及时清理不再需要的队列