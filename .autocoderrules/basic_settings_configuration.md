---
title: 基础设置页配置新增规范
description: 指导如何在 BasicSettings.tsx 中正确添加新的配置选项
keywords:
  - BasicSettings
  - 配置管理
  - React组件
  - 多语言支持
  - 用户界面
tags:
  - Frontend
  - Configuration
  - Best Practices
globs: ["frontend/src/components/MainContent/BasicSettings.tsx", "frontend/src/components/MainContent/BasicSettings.lang.ts", "frontend/src/components/Sidebar/lang.ts"]
alwaysApply: false
---

# 基础设置页配置新增规范

## 简要说明
本规范介绍如何在 BasicSettings.tsx 组件中正确添加新的配置选项，包括多语言支持、状态管理、API集成和条件显示等功能。确保新增配置选项与现有代码风格保持一致，并提供良好的用户体验。

## 典型用法
以下示例基于项目中添加 `enable_agentic_auto_approve` 和 `enable_agentic_dangerous_command_check` 配置的实际案例。

### 1. 添加多语言支持

首先在 `BasicSettings.lang.ts` 中定义多语言文本：

```typescript
// frontend/src/components/MainContent/BasicSettings.lang.ts
export const basicSettingsMessages: { [key: string]: Message } = {
  // 配置选项标题
  enableAgenticAutoApprove: {
    en: "Auto Approve Shell Commands",
    zh: "自动同意执行Shell命令"
  },
  // 配置选项描述
  enableAgenticAutoApproveDescription: {
    en: "Automatically approve shell command execution without manual confirmation. Enable with caution as this allows automatic execution of system commands.",
    zh: "自动同意执行shell命令，无需手动确认。请谨慎启用，因为这允许自动执行系统命令。"
  },
  // 带推荐标记的配置选项
  enableAgenticDangerousCommandCheck: {
    en: "Enable Dangerous Command Check(Recommended)",
    zh: "启用危险命令检查(推荐开启)"
  },
  enableAgenticDangerousCommandCheckDescription: {
    en: "When enabled, the system will check for potentially dangerous commands before auto-approval and require manual confirmation for risky operations.",
    zh: "启用后，系统会在自动批准前检查潜在的危险命令，对于风险操作需要手动确认。"
  },
};
```

### 2. 确保多语言文件已集成

检查 `lang.ts` 是否已导入新的语言文件：

```typescript
// frontend/src/components/Sidebar/lang.ts
import { basicSettingsMessages } from '../MainContent/BasicSettings.lang';

export const messages: { [key: string]: Message } = {
  ...basicSettingsMessages, // 确保已合并
  // ... 其他消息
};
```

### 3. 更新接口定义

在 `BasicSettingsState` 接口中添加新的配置字段：

```typescript
// frontend/src/components/MainContent/BasicSettings.tsx
interface BasicSettingsState {
  // 现有字段...
  enable_agentic_auto_approve: boolean; // 新增字段
  enable_agentic_dangerous_command_check: boolean; // 新增字段，有条件显示
  // 其他字段...
}
```

### 4. 初始化状态

在 `useState` 中为新配置提供默认值：

```typescript
const [settings, setSettings] = useState<BasicSettingsState>({
  // 现有配置...
  enable_agentic_auto_approve: false, // 默认为false
  enable_agentic_dangerous_command_check: false, // 默认为false
  // 其他配置...
});
```

### 5. 添加配置获取逻辑

在 `fetchCurrentConfig` 函数中添加新配置的获取逻辑：

```typescript
// 在 fetchCurrentConfig 函数中
if (currentConfig.enable_agentic_auto_approve !== undefined) {
  updatedSettings.enable_agentic_auto_approve = String(currentConfig.enable_agentic_auto_approve).toLowerCase() === 'true';
}
if (currentConfig.enable_agentic_dangerous_command_check !== undefined) {
  updatedSettings.enable_agentic_dangerous_command_check = String(currentConfig.enable_agentic_dangerous_command_check).toLowerCase() === 'true';
}
```

### 6. 添加回退逻辑

在 `availableKeys` 处理中添加回退机制：

```typescript
// 在处理 availableKeys 的 useEffect 中
if (key.key === 'enable_agentic_auto_approve' && initialSettings.enable_agentic_auto_approve === undefined) {
  initialSettings.enable_agentic_auto_approve = String(key.default).toLowerCase() === 'true' || false;
}
if (key.key === 'enable_agentic_dangerous_command_check' && initialSettings.enable_agentic_dangerous_command_check === undefined) {
  initialSettings.enable_agentic_dangerous_command_check = String(key.default).toLowerCase() === 'true' || false;
}
```

### 7. 添加UI组件

在组件的render部分添加新的配置UI：

```typescript
{/* 普通配置选项 */}
<div className="model-config-item">
  <label className="model-config-label">{getMessage('enableAgenticAutoApprove')}</label>
  <div className="mt-1">
    <Select
      value={settings.enable_agentic_auto_approve}
      onChange={(value) => handleSettingChange('enable_agentic_auto_approve', value)}
      size="small"
      style={{ width: '100%' }}
      options={[
        { value: true, label: getMessage('enable') },
        { value: false, label: getMessage('disable') },
      ]}
    />
  </div>
  <p className="model-config-description">{getMessage('enableAgenticAutoApproveDescription')}</p>
</div>

{/* 条件显示的配置选项 */}
{settings.enable_agentic_auto_approve && (
  <div className="model-config-item">
    <label className="model-config-label">{getMessage('enableAgenticDangerousCommandCheck')}</label>
    <div className="mt-1">
      <Select
        value={settings.enable_agentic_dangerous_command_check}
        onChange={(value) => handleSettingChange('enable_agentic_dangerous_command_check', value)}
        size="small"
        style={{ width: '100%' }}
        options={[
          { value: true, label: getMessage('enable') },
          { value: false, label: getMessage('disable') },
        ]}
      />
    </div>
    <p className="model-config-description">{getMessage('enableAgenticDangerousCommandCheckDescription')}</p>
  </div>
)}
```

## 最佳实践

### 1. 配置类型规范

- **布尔类型配置**：使用 `Select` 组件，提供启用/禁用选项
- **数字类型配置**：使用 `InputNumber` 组件，设置合理的最小值和最大值
- **字符串类型配置**：使用 `Input` 或 `Select` 组件
- **标签类型配置**：使用 `Select` 的 `mode="tags"` 模式

### 2. 多语言支持规范

- 所有配置选项必须提供中英文支持
- 配置名称应简洁明了，描述应详细准确
- 对于需要特别注意的配置，在标题中添加标记（如"推荐开启"）
- 描述文本应包含配置的作用和注意事项

### 3. 条件显示规范

```typescript
{/* 条件显示模式 */}
{parentCondition && (
  <div className="model-config-item">
    {/* 子配置选项 */}
  </div>
)}

{/* 多条件显示 */}
{condition1 && condition2 && (
  <div className="model-config-item">
    {/* 配置选项 */}
  </div>
)}
```

### 4. 默认值设置规范

- 布尔类型：一般默认为 `false`，除非功能默认应该启用
- 数字类型：设置安全的默认值，避免极端值
- 安全相关配置：默认选择更安全的选项

### 5. 状态管理规范

- 使用 `handleSettingChange` 函数统一处理配置变更
- 确保类型安全，避免类型转换错误
- 在 `fetchCurrentConfig` 中处理服务器返回的字符串转布尔值转换

### 6. UI组件规范

- 使用 `model-config-item` 作为容器类名
- 使用 `model-config-label` 作为标签类名
- 使用 `model-config-description` 作为描述类名
- 组件大小统一使用 `size="small"`
- 宽度统一使用 `style={{ width: '100%' }}`

### 7. Tooltip支持

对于复杂配置，可以添加 Tooltip 提供额外说明：

```typescript
<Tooltip title={getMessage('configTooltip')}>
  <label className="model-config-label">{getMessage('configLabel')}</label>
</Tooltip>
```

## 配置组织策略

### 1. 配置分组

- **基础配置**：项目类型、索引设置等
- **Agent配置**：Agentic相关功能设置
- **性能配置**：Token限制、生成次数等
- **高级配置**：调试、实验性功能

### 2. 配置依赖关系

使用条件渲染实现配置之间的依赖关系：
- 子配置只在父配置启用时显示
- 相互冲突的配置不能同时启用
- 提供清晰的依赖关系说明

### 3. 配置验证

在 `handleSettingChange` 中添加必要的验证逻辑：
- 数值范围检查
- 字符串格式验证
- 配置冲突检测

## 常见问题

1. **配置不生效**：检查是否在所有相关位置添加了配置处理逻辑
2. **多语言显示异常**：确认语言文件已正确导入并合并
3. **条件显示不正确**：检查条件表达式和状态更新逻辑
4. **类型错误**：确保接口定义与实际使用保持一致

## 学习来源
基于项目中 `BasicSettings.tsx` 组件的实际开发经验，以及 `enable_agentic_auto_approve` 和 `enable_agentic_dangerous_command_check` 配置选项的成功实现案例。 