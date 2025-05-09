---
title: 消息解析器扩展规范
description: 指导如何正确添加新的消息解析器
keywords:
  - MessageParser
  - 消息解析
  - 工具消息
  - 扩展
tags:
  - MessageParser
  - Extension
  - Best Practices
globs: ["src/auto_coder_web/agentic_message_parser/**/*.py", "src/auto_coder_web/routers/**/*.py"]
alwaysApply: false
---

# 消息解析器扩展规范

## 背景

在 Auto-coder 的对话系统中，各种工具（如 ReadFileTool、CodeSearchTool 等）会生成包含大量信息的消息。这些消息在发送给大模型前需要进行适当处理，例如截断过长的文件内容、简化搜索结果等，以减少 token 消耗并提高用户体验。

消息解析器模块（agentic_message_parser）提供了一个可扩展的框架，允许为不同的工具添加特定的消息处理逻辑。这些处理后的消息会在 `src/auto_coder_web/routers/auto_router.py` 中的 `coding_prompt` 函数中被应用，该函数负责生成发送给大模型的对话模板。

## 规范步骤

### 1. 了解消息解析器的工作原理及应用场景

消息解析器基于注册机制工作。每个解析器负责处理特定类型的工具消息，并决定是否以及如何处理这些消息。解析器通过 `@register_parser` 装饰器注册到系统中，当消息需要处理时，系统会尝试所有已注册的解析器，直到找到一个能够处理该消息的解析器。

这些解析器在 `src/auto_coder_web/routers/auto_router.py` 中的 `coding_prompt` 函数中被调用：

```python
@byzerllm.prompt()
def coding_prompt(messages: List[Dict[str, Any]], query: str):
    '''        
    【历史对话】按时间顺序排列，从旧到新：
    {% for message in messages %}
    <message>
    {% if message.type == "USER" or message.type == "USER_RESPONSE" or message.metadata.path == "/agent/edit/tool/result" %}【用户】{% else %}【助手】{% endif %}    
    <content>
    {{ message.content }}
    </content>
    </message>
    {% endfor %}
    
    【当前问题】用户的最新需求如下:
    <current_query>
    {{ query }}
    </current_query>            
    '''
    # 使用消息解析器处理消息
    from auto_coder_web.agentic_message_parser import parse_messages
    processed_messages = parse_messages(messages)
    
    return {
        "messages": processed_messages,
        "query": query
    }
```

在这个函数中，`parse_messages` 函数会遍历所有消息，并将每个消息传递给各个注册的解析器进行处理。处理后的消息会被用于生成发送给大模型的对话模板。

### 2. 添加新的消息解析器

要为新的工具添加消息解析器，请按照以下步骤操作：

*   **步骤 2.1：在 tool_parsers.py 中添加新的解析器函数**

    在 `src/auto_coder_web/agentic_message_parser/tool_parsers.py` 文件中，添加一个新的解析器函数，并使用 `@register_parser` 装饰器注册它。以 ReadFileTool 为例：

    ```python
    @register_parser("ReadFileTool")
    def read_file_tool_parser(content_obj: Dict[str, Any], message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        ReadFileTool 消息的解析器。
        截断过长的文件内容。
        
        Args:
            content_obj: 解析后的内容对象
            message: 原始消息
            
        Returns:
            处理后的消息，如果此解析器不能处理该消息则返回 None
        """
        # 验证这是否是 ReadFileTool 消息
        if not (isinstance(content_obj, dict) and
                content_obj.get("tool_name") == "ReadFileTool" and
                "success" in content_obj and
                "message" in content_obj and
                "content" in content_obj):
            return None
        
        # 处理逻辑，这里 ReadFileTool 只截断了文件内容，其他工具的处理逻辑可以有所不同
        processed_message = message.copy()
        if isinstance(content_obj["content"], str) and len(content_obj["content"]) > 200:
            content_obj["content"] = content_obj["content"][:200] + "..."
            processed_message["content"] = json.dumps(content_obj)
        
        return processed_message
    ```

*   **步骤 2.2：测试新的解析器**

    确保新的解析器能够正确处理目标工具的消息，并且不会影响其他工具的消息处理。可以通过以下方式进行测试：

    1. 创建一个模拟的 ReadFileTool 消息
    2. 使用 `parse_message` 函数处理该消息
    3. 验证处理结果是否符合预期，例如文件内容是否被截断到 200 个字符

### 3. 最佳实践

*   **3.1 保持解析器的专一性**：每个解析器应该只处理一种类型的工具消息，并且应该明确验证消息类型。

*   **3.2 保持向后兼容性**：如果修改现有的解析器，确保它仍然能够处理旧格式的消息。

*   **3.3 处理异常情况**：解析器应该能够优雅地处理异常情况，例如消息格式不正确、缺少必要字段等。

*   **3.4 文档化**：为每个解析器提供详细的文档，说明它的功能、处理逻辑和预期结果。

*   **3.5 性能考虑**：解析器应该高效地处理消息，避免不必要的计算或内存使用。

### 4. 示例

以下是 ReadFileTool 解析器的实际应用示例，展示了它如何在 `coding_prompt` 函数中工作：

#### 4.1 ReadFileTool 原始消息

当用户请求查看文件内容时，ReadFileTool 会返回如下格式的消息：

```json
{
  "tool_name": "ReadFileTool",
  "success": true,
  "message": "成功读取文件",
  "content": "import os\nimport json\nimport asyncio\nfrom typing import List, Dict, Any, Optional\n\n# 这里是一个很长的文件内容，可能有成百行的代码..."
}
```

#### 4.2 ReadFileTool 解析器实现

```python
@register_parser("ReadFileTool")
def read_file_tool_parser(content_obj: Dict[str, Any], message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    ReadFileTool 消息的解析器。
    截断过长的文件内容。
    
    Args:
        content_obj: 解析后的内容对象
        message: 原始消息
        
    Returns:
        处理后的消息，如果此解析器不能处理该消息则返回 None
    """
    # 验证这是否是 ReadFileTool 消息
    if not (isinstance(content_obj, dict) and
            content_obj.get("tool_name") == "ReadFileTool" and
            "success" in content_obj and
            "message" in content_obj and
            "content" in content_obj):
        return None
    
    # 处理内容
    processed_message = message.copy()
    if isinstance(content_obj["content"], str) and len(content_obj["content"]) > 200:
        content_obj["content"] = content_obj["content"][:200] + "..."
        processed_message["content"] = json.dumps(content_obj)
    
    return processed_message
```

#### 4.3 处理后的消息

经过解析器处理后，消息内容被截断到 200 个字符：

```json
{
  "tool_name": "ReadFileTool",
  "success": true,
  "message": "成功读取文件",
  "content": "import os\nimport json\nimport asyncio\nfrom typing import List, Dict, Any, Optional\n\n# 这里是一个很长的文件内容..."
}
```

#### 4.4 在 coding_prompt 中的应用

当 `coding_prompt` 函数调用 `parse_messages` 时，所有消息都会被处理，包括 ReadFileTool 的消息。这些处理后的消息会被用于生成发送给大模型的对话模板，从而减少 token 消耗并提高用户体验。

## 总结

通过遵循本规范，您可以为 Auto-coder 的对话系统添加新的消息解析器，提高用户体验并保持系统的一致性和可维护性。消息解析器模块的设计允许以一种模块化和可扩展的方式处理不同类型的工具消息，使系统能够适应未来的需求变化。
