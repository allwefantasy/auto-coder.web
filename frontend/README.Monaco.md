# Monaco Editor 本地资源配置指南

## 为什么需要本地资源？

Monaco Editor 默认会从 CDN 加载其资源文件，这可能导致以下问题：

- 在无网络环境下无法使用
- 受到网络速度限制，影响加载时间
- 潜在的安全问题和合规性问题

## 配置步骤

我们提供了两种解决方案：临时使用 CDN 和长期使用本地资源。

### 临时解决方案：使用 CDN

临时解决方案配置示例：
```tsx
// 导入必要的模块
import { Editor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// 配置 Monaco 编辑器加载器使用 CDN 资源
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs'
  }
});

// 在 beforeMount 中设置 worker
beforeMount={(monaco) => {
  window.MonacoEnvironment = {
    getWorkerUrl: (workerId: string, label: string): string => {
      return `https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs/base/worker/workerMain.js`;
    }
  };
}}
```

### 长期解决方案：使用本地资源

为了使用本地资源，请按照以下步骤操作：

1. 安装所需依赖
```bash
npm install monaco-editor fs-extra
```

2. 运行设置脚本
```bash
npm run setup-monaco
```

3. 将代码中的配置改为使用本地资源
```tsx
// 导入必要的模块
import { Editor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// 配置 Monaco 编辑器加载器使用本地资源
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn'
    }
  }
});

// 在 beforeMount 中设置 worker
beforeMount={(monaco) => {
  window.MonacoEnvironment = {
    getWorkerUrl: (workerId: string, label: string): string => {
      return `/monaco-editor/min/vs/base/worker/workerMain.js`;
    }
  };
}}
```

## 目录结构

设置脚本会在 `public` 目录中创建以下结构：

```
public/
└── monaco-editor/
    └── min/
        └── vs/
            ├── loader.js
            ├── editor/
            ├── base/
            │   └── worker/
            │       └── workerMain.js
            └── ... (其他文件)
```

## 注意事项

- 在构建生产版本前，请确保已经运行了 `npm run setup-monaco` 脚本
- 如果 Monaco Editor 版本更新，需要重新运行设置脚本
- 如遇到问题，请检查浏览器控制台中是否有资源加载错误 