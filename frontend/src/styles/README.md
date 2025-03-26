# 自定义 Ant Design 样式

这个目录包含了用于覆盖 Ant Design 默认样式的自定义暗色主题样式。

## custom_antd.css

此文件包含了所有 Ant Design 组件的暗色主题样式覆盖。这些样式可以通过添加特定的类名来应用于组件。

### 使用方法

1. 在你的组件中导入样式文件：

```tsx
import '../../styles/custom_antd.css';
```

2. 在组件上应用相应的类名：

```tsx
// 按钮
<Button className="dark-button">按钮</Button>
<Button className="dark-button" type="primary">主按钮</Button>

// 输入框
<Input className="dark-input" />
<Input.TextArea className="dark-input" />

// 选择器
<Select className="dark-select" />

// 表单
<Form className="dark-form" />

// 模态框
<Modal className="dark-modal" />

// 表格
<Table className="dark-table" />

// 复选框
<Checkbox className="dark-checkbox" />

// 开关
<Switch className="dark-switch" />

// 树组件
<Tree className="dark-tree" />

// 标签页
<Tabs className="dark-tabs" />

// 消息
message.config({ className: 'dark-message' });

// 气泡确认框
<Popconfirm overlayClassName="dark-popconfirm" />

// 下拉菜单
<Dropdown overlayClassName="dark-dropdown" />

// 菜单
<Menu className="dark-menu" />

// 骨架屏
<Skeleton className="dark-skeleton" />
```

## 使用 CSS 变量

你可以使用 `custom_antd.css` 中定义的 CSS 变量来保持样式一致性：

```css
.my-component {
  background-color: var(--dark-bg-primary);
  color: var(--dark-text-primary);
  border: 1px solid var(--dark-border);
}

.my-component:hover {
  background-color: var(--dark-bg-secondary);
}

.my-component.active {
  color: var(--dark-primary);
}
```

## 可用的 CSS 变量

```
--dark-bg-primary: 主要背景色
--dark-bg-secondary: 次要背景色
--dark-bg-tertiary: 第三级背景色
--dark-border: 主要边框色
--dark-border-light: 次要边框色
--dark-text-primary: 主要文本色
--dark-text-secondary: 次要文本色
--dark-text-tertiary: 第三级文本色
--dark-text-disabled: 禁用状态文本色
--dark-primary: 主题色
--dark-primary-hover: 主题色悬停状态
--dark-primary-active: 主题色激活状态
--dark-success: 成功色
--dark-warning: 警告色
--dark-error: 错误色
--dark-highlight: 高亮色
``` 