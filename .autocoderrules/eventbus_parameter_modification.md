---
title: EventBus 参数修改规范
description: 指导如何正确修改 EventBus 中的事件参数
keywords:
  - EventBus
  - 参数修改
  - 事件驱动
  - 重构
tags:
  - EventBus
  - Refactoring
  - Best Practices
globs: ["src/auto_coder_web/event_bus.py", "src/auto_coder_web/common_router/**/*.py", "src/auto_coder_web/routers/**/*.py", "src/auto_coder_web/services/**/*.py"]
alwaysApply: false
---

# EventBus 参数修改规范

## 背景

在使用 EventBus 进行事件驱动编程时，经常会遇到需要修改事件定义（例如，增删参数、修改参数类型）的情况。直接修改事件定义可能会导致系统中其他依赖此事件的模块出现兼容性问题。本规范旨在提供一种安全、渐进的方式来修改 EventBus 中的事件参数，确保系统的稳定性和向后兼容性。

## 规范步骤

### 1. 新增参数或修改参数类型（保持向后兼容）

如果需要给事件新增参数，或者修改现有参数的类型（确保新类型能够兼容旧类型，或者旧代码不使用该参数时不会出错），可以遵循以下步骤：

*   **步骤 1.1：修改事件定义**
    在事件类中添加新的参数，并为其提供默认值，或者确保旧的发布者不传递该参数时，订阅者能够正常处理（例如，在订阅者中使用 `getattr` 或 `try-except`）。
    如果修改类型，确保订阅者能处理新旧两种类型，或者旧代码逻辑不受影响。

    ```python
    # 示例：新增参数
    class OldEvent:
        def __init__(self, param1: str):
            self.param1 = param1

    class NewEvent: # 或者直接修改 OldEvent
        def __init__(self, param1: str, param2: int = 0): # 新增 param2 并提供默认值
            self.param1 = param1
            self.param2 = param2
    ```

*   **步骤 1.2：更新事件发布者**
    修改事件的发布者，使其能够传递新的参数或新的参数类型。

*   **步骤 1.3：更新事件订阅者（可选，但推荐）**
    根据需要更新事件的订阅者，以利用新的参数或适应新的参数类型。由于提供了默认值或保持了兼容性，旧的订阅者代码应该仍然能够正常工作。

*   **步骤 1.4：测试**
    充分测试，确保所有相关的发布者和订阅者都能正常工作。

### 2. 删除参数或进行不兼容的参数类型修改

如果需要删除事件的参数，或者进行不兼容的参数类型修改（例如，将 `str` 修改为 `int`，且无法简单兼容），这是一个破坏性变更，需要更谨慎地处理。

*   **方案一：引入新事件（推荐）**

    *   **步骤 2.1.1：定义一个全新的事件**
        创建一个新的事件类，包含新的参数定义。
        ```python
        class OriginalEvent:
            def __init__(self, param_to_remove: str, param_to_keep: int):
                self.param_to_remove = param_to_remove
                self.param_to_keep = param_to_keep

        class UpdatedEvent: # 新事件
            def __init__(self, param_to_keep: int, new_param: float):
                self.param_to_keep = param_to_keep
                self.new_param = new_param
        ```

    *   **步骤 2.1.2：更新发布者以发布新事件**
        修改事件发布者，让其开始发布新的 `UpdatedEvent`。可以选择同时发布旧事件一段时间（双发），以支持尚未迁移的订阅者。

    *   **步骤 2.1.3：迁移订阅者**
        逐步将所有订阅 `OriginalEvent` 的模块修改为订阅 `UpdatedEvent`，并适配新的参数。

    *   **步骤 2.1.4：移除旧事件的发布（可选）**
        当所有订阅者都迁移到新事件后，可以停止发布旧事件。

    *   **步骤 2.1.5：移除旧事件定义（可选）**
        在确认系统中不再有任何地方引用旧事件后，可以安全地删除旧事件的定义。

*   **方案二：版本化事件或参数（较复杂）**
    这种方案通常更为复杂，需要事件本身或其参数包含版本信息，订阅者根据版本信息进行不同处理。一般情况下，对于参数删除或不兼容修改，引入新事件是更清晰和安全的方式。

### 3. 修改参数名称

修改参数名称也属于破坏性变更，因为订阅者代码会依赖参数名。

*   **步骤 3.1：在事件定义中同时支持新旧参数名（过渡期）**
    在事件类的 `__init__` 和属性访问中，同时支持新旧参数名。例如，通过 `@property` 和 setter。

    ```python
    class MyEvent:
        def __init__(self, old_name: str, new_name_value: str = None):
            if new_name_value is not None:
                self._actual_value = new_name_value
            else:
                self._actual_value = old_name # 假设 old_name 传递的是实际值

            # 为了向后兼容，允许通过旧名称访问，但内部存储为新名称对应的概念
            # 或者在 __init__ 中接受 old_name, new_name，优先使用 new_name

        @property
        def new_name(self):
            return self._actual_value

        @new_name.setter
        def new_name(self, value):
            self._actual_value = value

        @property
        def old_name(self):
            # 可以选择打印一个废弃警告
            # import warnings
            # warnings.warn("param 'old_name' is deprecated, use 'new_name' instead.", DeprecationWarning)
            return self._actual_value

        # 如果旧代码通过 old_name=value 方式设置，__init__ 需要更复杂的处理
        # def __init__(self, *, old_name=None, new_name=None):
        #    if new_name is not None:
        #        self._value = new_name
        #    elif old_name is not None:
        #        self._value = old_name
        #        # log deprecation warning
        #    else:
        #        raise ValueError("Either old_name or new_name must be provided")
    ```

*   **步骤 3.2：更新发布者**
    修改发布者，使用新的参数名传递数据。

*   **步骤 3.3：更新订阅者**
    逐步修改所有订阅者，使其使用新的参数名。

*   **步骤 3.4：移除对旧参数名的支持**
    在所有订阅者都更新完毕后，可以从事件定义中移除对旧参数名的支持。

## 总结

修改 EventBus 事件参数时，务必优先考虑向后兼容性。
- 对于非破坏性变更（如添加带默认值的参数），可以直接修改。
- 对于破坏性变更（如删除参数、不兼容的类型修改、修改参数名），推荐引入新事件或提供过渡期兼容方案。

在整个过程中，充分的测试和清晰的团队沟通至关重要。
