interface Message {
  en: string;
  zh: string;
}

export const messages: { [key: string]: Message } = {
  // Settings Panel
  settingsTitle: {
    en: "Settings",
    zh: "设置"
  },
  ragToggle: {
    en: "RAG",
    zh: "RAG检索增强"
  },
  ragUrlInput: {
    en: "RAG URL",
    zh: "RAG 服务地址"
  },
  ragUrlPlaceholder: {
    en: "Enter RAG URL",
    zh: "请输入RAG服务地址"
  },
  ragTypeInput: {
    en: "RAG Type",
    zh: "RAG 类型"
  },
  ragTypePlaceholder: {
    en: "Enter RAG Type",
    zh: "请输入RAG类型"
  },
  ragTokenInput: {
    en: "RAG Token",
    zh: "RAG 访问令牌"
  },
  ragTokenPlaceholder: {
    en: "Enter RAG Token",
    zh: "请输入RAG访问令牌"
  },
  indexToggle: {
    en: "Index",
    zh: "索引"
  },
  skipBuildIndexToggle: {
    en: "Skip Build Index",
    zh: "跳过构建索引"
  },
  skipFilterIndexToggle: {
    en: "Skip Filter Index",
    zh: "跳过过滤索引"
  },
  indexFilterLevelInput: {
    en: "Index Filter Level",
    zh: "索引过滤级别"
  },
  indexFilterWorkersInput: {
    en: "Index Filter Workers",
    zh: "索引过滤工作线程数"
  },
  indexFilterWorkersPlaceholder: {
    en: "Default: 100",
    zh: "默认值：100"
  },
  indexFilterFileNumInput: {
    en: "Index Filter File Number",
    zh: "索引过滤文件数量"
  },
  indexFilterFileNumPlaceholder: {
    en: "Default: 10",
    zh: "默认值：10"
  },
  indexBuildWorkersInput: {
    en: "Index Build Workers",
    zh: "索引构建工作线程数"
  },
  indexBuildWorkersPlaceholder: {
    en: "Default: 100",
    zh: "默认值：100"
  },
  settingsUpdateSuccess: {
    en: "Configuration updated successfully",
    zh: "配置更新成功"
  },
  settingsUpdateError: {
    en: "Failed to update configuration",
    zh: "配置更新失败"
  },
  indexBuildStart: {
    en: "Build incremental index...",
    zh: "增量索引..."
  },
  indexBuildComplete: {
    en: "Index build complete",
    zh: "索引构建完成"
  },
  filterStart: {
    en: "Starting to filter files...",
    zh: "开始过滤文件..."
  },
  filterComplete: {
    en: "File filtering complete",
    zh: "文件过滤完成"
  },
  fileSelected: {
    en: "Selected file: {file}",
    zh: "已选择文件: {file}"
  },
  copyInstructions: {
    en: "Please copy the text on the right side, then paste the result back to the right side. Reply 'confirm' when done.",
    zh: "请复制右侧的文本,然后将结果复制黏贴会右侧。黏贴完请回复 '确认'"
  },
  noQueryFound: {
    en: "No query found in the last action",
    zh: "在上一次操作中未找到查询内容"
  },
  revertConfirmation: {
    en: "Are you sure you want to revert the last operation?\n\nLast modification request: {query}\n\nPlease reply 'confirm' to proceed with the revert.",
    zh: "你确定要撤回上一次的操作吗？\n\n上一次修改需求为：{query}\n\n请回复 '确认' 进行撤回操作。"
  },
  getLastActionError: {
    en: "Failed to get last action information. Please try again.",
    zh: "获取上一次操作信息失败，请重试。"
  },
  revertSuccess: {
    en: "Successfully reverted the last chat action.",
    zh: "成功撤回上一次的操作。"
  },
  revertFailure: {
    en: "Failed to revert: {message}",
    zh: "撤回失败：{message}"
  },
  revertError: {
    en: "Failed to revert changes. Please try again.",
    zh: "撤回更改失败，请重试。"
  },
  revertCancelled: {
    en: "Revert cancelled.",
    zh: "已取消撤回操作。"
  },
  codeModificationComplete: {
    en: "Code modification complete. Please check the preview panel on the right. If you're not satisfied, click the undo button on the left of the send button.",
    zh: "代码修改完成。请查看右侧修改预览面板。如果不满意，在发送按钮左侧点击撤销最近修改"
  },
  codeModificationFailed: {
    en: "Code modification failed: {content}",
    zh: "代码修改失败：{content}"
  },
  processingError: {
    en: "Sorry, there was an error processing your request. Please try again.",
    zh: "抱歉，处理您的请求时出错，请重试。"
  },
  cancelResponseEvent: {
    en: "Cancel response event",
    zh: "取消响应事件"
  },
  ragSearchStart: {
    en: "Starting RAG search...",
    zh: "开始RAG搜索..."
  },
  ragSearchComplete: {
    en: "RAG search complete",
    zh: "RAG搜索完成"
  },
  codeGenerateStart: {
    en: "Starting code generation...",
    zh: "开始代码生成..."
  },
  codeGenerateComplete: {
    en: "Code generation complete",
    zh: "代码生成完成"
  },
  priorityP0: {
    en: "P0 - Urgent",
    zh: "P0 - 紧急"
  },
  priorityP1: {
    en: "P1 - High",
    zh: "P1 - 高"
  },
  priorityP2: {
    en: "P2 - Medium",
    zh: "P2 - 中"
  },
  priorityP3: {
    en: "P3 - Low",
    zh: "P3 - 低"
  },
  statusPending: {
    en: "Pending",
    zh: "待评估"
  },
  statusDeveloping: {
    en: "Developing",
    zh: "进行中"
  },
  statusTesting: {
    en: "Testing",
    zh: "测试中"
  },
  statusDone: {
    en: "Done",
    zh: "已完成"
  },
  loading: {
    en: "Loading...",
    zh: "加载中..."
  },
  appTitle: {
    en: "Auto-Coder",
    zh: "Auto-Coder"
  },
  currentProject: {
    en: "Current Project:",
    zh: "当前项目:"
  },
  noProjectSelected: {
    en: "No Project Selected",
    zh: "未选择项目"
  },
  todos: {
    en: "Todos",
    zh: "待办事项"
  },
  devHistory: {
    en: "Dev History",
    zh: "开发历史"
  },
  codeViewer: {
    en: "Code Viewer",
    zh: "代码查看器"
  },
  fileGroups: {
    en: "File Groups",
    zh: "文件分组"
  },
  previewChanges: {
    en: "Preview Changes",
    zh: "预览更改"
  },
  clipboard: {
    en: "Clipboard",
    zh: "剪贴板"
  },
  settings: {
    en: "Settings",
    zh: "设置"
  },
  searchFiles: {
    en: "Search Files",
    zh: "搜索文件"
  },
  searchFilesPlaceholder: {
    en: "Enter file name to search...",
    zh: "输入文件名进行搜索..."
  },
  createNewTask: {
    en: "Create New Task",
    zh: "新建需求"
  },
  newChat: {
    en: "New Chat",
    zh: "新建聊天"
  },
  settingsAndGroups: {
    en: "Settings & Groups",
    zh: "设置与分组"
  },
  humanAsModel: {
    en: "Human As Model",
    zh: "人工模型"
  },
  humanAsModelTooltip: {
    en: "Enable to let human act as the model",
    zh: "启用人工模型"
  },
  skipBuildIndex: {
    en: "Skip Build Index",
    zh: "跳过构建索引"
  },
  skipBuildIndexTooltip: {
    en: "Skip building index for better performance",
    zh: "跳过构建索引以提高性能"
  },
  projectType: {
    en: "Project Type",
    zh: "项目类型"
  },
  projectTypeTooltip: {
    en: "Filter files by extensions (e.g. .py,.ts)",
    zh: "按文件扩展名过滤（例如 .py,.ts）"
  },
  customConfig: {
    en: "Custom Configuration",
    zh: "自定义配置"
  },
  addConfig: {
    en: "Add Config",
    zh: "添加配置"
  },
  clearEvents: {
    en: "Clear Events",
    zh: "清除事件"
  },
  clearEventsTooltip: {
    en: "Clear event queue to resolve any stuck operations",
    zh: "清除事件队列以解决卡住的操作"
  },
  undoTooltip: {
    en: "Undo last modification",
    zh: "撤销上次修改"
  },
  sending: {
    en: "Sending...",
    zh: "发送中..."
  },
  send: {
    en: "Send",
    zh: "发送"
  },
  taskTitlePlaceholder: {
    en: "Task Title",
    zh: "需求标题"
  },
  priorityPlaceholder: {
    en: "Priority",
    zh: "优先级"
  },
  autoMode: {
    en: "Auto",
    zh: "自动模式"
  },
  expertMode: {
    en: "Expert",
    zh: "专家模式"
  },
  searchIn: {
    en: "Search in",
    zh: "搜索"
  },
  yourProject: {
    en: "your project",
    zh: "你的项目"
  },
  autoModeDescription: {
    en: "Ask anything about your code or what you want to build",
    zh: "询问任何关于你的代码或者你想构建的内容"
  },
  tryExamples: {
    en: "Try examples",
    zh: "尝试示例"
  },
  // Expanded Editor
  expandedEditor: {
    en: "Expanded Editor",
    zh: "扩展编辑器"
  },
  expandEditor: {
    en: "Expand editor for large text input",
    zh: "展开编辑器以输入大段文本"
  },
  cancel: {
    en: "Cancel",
    zh: "取消"
  },
  submit: {
    en: "Submit",
    zh: "提交"
  },
  // Message list component keys
  modelPerformanceStats: {
    en: "Model Consumption Statistics",
    zh: "模型消费统计"
  },
  modelName: {
    en: "Model",
    zh: "模型"
  },
  totalTime: {
    en: "Total Time",
    zh: "总时间"
  },
  firstTokenTime: {
    en: "First Token Time",
    zh: "首个令牌时间"
  },
  inputTokens: {
    en: "Input Tokens",
    zh: "输入令牌数"
  },
  outputTokens: {
    en: "Output Tokens",
    zh: "输出令牌数"
  },
  inputCost: {
    en: "Input Cost",
    zh: "输入成本"
  },
  outputCost: {
    en: "Output Cost",
    zh: "输出成本"
  },
  tokenSpeed: {
    en: "Speed",
    zh: "速度"
  },
  commandPreparation: {
    en: "Tool Preparation",
    zh: "准备工具"
  },
  command: {
    en: "Tool",
    zh: "工具"
  },
  parameters: {
    en: "Parameters",
    zh: "参数"
  },
  commandExecution: {
    en: "Execution Result",
    zh: "执行结果"
  },
  contextUsed: {
    en: "Context Used",
    zh: "使用的上下文"
  },
  filesReferenced: {
    en: "Files Referenced",
    zh: "引用的文件"
  },
  completionTime: {
    en: "Completion Time",
    zh: "完成时间"
  },
  jobCompleted: {
    en: "Job Completed",
    zh: "任务完成"
  },
  // Chat panel component keys
  tokens: {
    en: "Tokens",
    zh: "令牌数"
  },
  cache: {
    en: "Cache",
    zh: "缓存"
  },
  contextWindow: {
    en: "Context Window",
    zh: "上下文窗口"
  },
  apiCost: {
    en: "API Cost",
    zh: "API成本"
  },
  noActiveTask: {
    en: "No active task",
    zh: "没有活动任务"
  },
  projectName: {
    en: "Current Project",
    zh: "当前项目"
  },
  commandSuggestionTitle: {
    en: "After thinking, we will call the following command:",
    zh: "经过思考，我们会调用以下命令："
  },
  processingStatus: {
    en: "Thinking...",
    zh: "正在思考..."
  },
  processingComplete: {
    en: "Thinking Complete",
    zh: "思考完成"
  },
  close: {
    en: "Close",
    zh: "关闭"
  },
  showMessages: {
    en: "Show Messages",
    zh: "显示消息"
  }
};

// 当前语言设置
let currentLanguage: 'en' | 'zh' = 'zh';

// 初始化语言设置
export const initLanguage = async () => {
  try {
    const response = await fetch('/api/settings/language');
    const data = await response.json();
    currentLanguage = data.language || 'zh';
  } catch (error) {
    console.error('Failed to load language settings:', error);
    currentLanguage = 'zh';
  }
};

// 设置语言
export const setLanguage = async (lang: 'en' | 'zh') => {
  try {
    await fetch('/api/settings/language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lang)
    });
    currentLanguage = lang;
  } catch (error) {
    console.error('Failed to save language settings:', error);
  }
};

// 获取当前语言
export const getCurrentLanguage = () => {
  return currentLanguage;
};

// 获取消息文本
export const getMessage = (key: keyof typeof messages, params: { [key: string]: string } = {}): string => {
  const message = messages[key]?.[currentLanguage] || messages[key]?.en || String(key);
  return Object.entries(params).reduce(
    (text, [key, value]) => String(text).replace(`{${key}}`, value),
    String(message)
  );
};
