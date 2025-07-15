
interface Message {
  en: string;
  zh: string;
}

export const messagesConfig: { [key: string]: Message } = {
  // 任务和状态相关
  noActiveTask: {
    en: "No active task",
    zh: "无活动任务"
  },
  tokens: {
    en: "Tokens",
    zh: "令牌"
  },
  cache: {
    en: "Cache",
    zh: "缓存"
  },
  apiCost: {
    en: "API Cost",
    zh: "API费用"
  },
  
  // 工具相关
  agenticEditReplaceInFileToolTitle: {
    en: "Replace in File",
    zh: "替换文件内容"
  },
  agenticEditWriteToFileToolTitle: {
    en: "Write to File",
    zh: "写入文件"
  },
  
  // 代码生成相关
  generatingCode: {
    en: "Generating Code...",
    zh: "生成代码中..."
  },
  generatedCode: {
    en: "Generated Code",
    zh: "生成的代码"
  },
  
  // 通用操作
  copy: {
    en: "Copy",
    zh: "复制"
  },
  maximize: {
    en: "Maximize",
    zh: "最大化"
  },
  markdown: {
    en: "Markdown",
    zh: "Markdown"
  },
  
  // 命令相关
  commandPreparation: {
    en: "Command Preparation",
    zh: "命令准备"
  },
  command: {
    en: "Command",
    zh: "命令"
  },
  parameters: {
    en: "Parameters",
    zh: "参数"
  },
  
  // 处理状态
  processingStatus: {
    en: "Processing...",
    zh: "处理中..."
  },
  processingComplete: {
    en: "Processing Complete",
    zh: "处理完成"
  },
  agenticFilterContext: {
    en: "Context Analysis",
    zh: "上下文分析"
  },
  
  // 依赖关系
  dependsOn: {
    en: "Depends on",
    zh: "依赖于"
  }
};

