interface Message {
  en: string;
  zh: string;
}

export const mainContentMessages: { [key: string]: Message } = {
  // 基础设置
  basicSettings: {
    en: "Basic Settings",
    zh: "基本设置"
  },
  advancedSettings: {
    en: "Advanced",
    zh: "高级设置"
  },
  
  // 模型配置
  modelConfiguration: {
    en: "Model Configuration",
    zh: "模型配置"
  },
  defaultModel: {
    en: "Default Model",
    zh: "默认模型"
  },
  defaultModelDescription: {
    en: "Used for general purpose tasks",
    zh: "用于通用任务"
  },
  codeModel: {
    en: "Code Model",
    zh: "代码模型"
  },
  codeModelDescription: {
    en: "Used for code generation and analysis",
    zh: "用于代码生成和分析"
  },
  chatModel: {
    en: "Chat Model",
    zh: "聊天模型"
  },
  chatModelDescription: {
    en: "Used for conversational responses",
    zh: "用于对话响应"
  },
  rerankModel: {
    en: "Rerank Model",
    zh: "重排序模型"
  },
  rerankModelDescription: {
    en: "Used for reranking generated content",
    zh: "用于重新排序生成的内容"
  },
  indexModel: {
    en: "Index Model",
    zh: "索引模型"
  },
  indexModelDescription: {
    en: "Used for indexing content",
    zh: "用于内容索引"
  },
  commitModel: {
    en: "Commit Model",
    zh: "提交模型"
  },
  commitModelDescription: {
    en: "Used for code commit message generation",
    zh: "用于代码提交信息生成"
  },
  contextPruneModel: {
    en: "Context Prune Model",
    zh: "上下文剪枝模型"
  },
  contextPruneModelDescription: {
    en: "The model used for pruning code context",
    zh: "用于剪枝代码上下文的模型"
  },
  conversationPruneModel: {
    en: "Conversation Prune Model",
    zh: "对话剪枝模型"
  },
  conversationPruneModelDescription: {
    en: "The model used for pruning conversation history",
    zh: "用于剪枝对话历史的模型"
  },
  indexFilterModel: {
    en: "Index Filter Model",
    zh: "索引过滤模型"
  },
  indexFilterModelDescription: {
    en: "Used for filtering index content",
    zh: "用于过滤索引内容"
  },
  
  // 编译器配置
  compilerConfiguration: {
    en: "Compiler Configuration",
    zh: "编译器配置"
  },
  addCompiler: {
    en: "Add Compiler",
    zh: "添加编译器"
  },
  editCompiler: {
    en: "Edit Compiler",
    zh: "编辑编译器"
  },
  deleteConfirmation: {
    en: "Are you sure you want to delete this compiler?",
    zh: "确定要删除此编译器吗？"
  },
  compilerName: {
    en: "Name",
    zh: "名称"
  },
  compilerType: {
    en: "Type",
    zh: "类型"
  },
  workingDirectory: {
    en: "Working Directory",
    zh: "工作目录"
  },
  actions: {
    en: "Actions",
    zh: "操作"
  },
  
  // RAG配置
  ragConfiguration: {
    en: "RAG Configuration",
    zh: "知识库配置"
  },
  addRag: {
    en: "Add RAG",
    zh: "添加知识库"
  },
  editRag: {
    en: "Edit RAG",
    zh: "编辑知识库"
  },
  deleteRag: {
    en: "Delete RAG",
    zh: "删除知识库"
  },
  ragName: {
    en: "RAG Name",
    zh: "知识库名称"
  },
  ragBaseUrl: {
    en: "RAG URL",
    zh: "知识库地址"
  },
  ragApiKey: {
    en: "API Key",
    zh: "API密钥"
  },
  
  // MCP服务配置
  mcpServerConfiguration: {
    en: "MCP Servers",
    zh: "MCP服务"
  },
  marketplace: {
    en: "Marketplace",
    zh: "市场"
  },
  manualInstall: {
    en: "Manual Add to Marketplace",
    zh: "手动添加到市场"
  },
  installed: {
    en: "Installed",
    zh: "已安装"
  },
  install: {
    en: "Install",
    zh: "安装"
  },
  
  // 记忆系统
  memorySystemTasks: {
    en: "Memory System Tasks",
    zh: "记忆系统任务"
  },
  taskId: {
    en: "Task ID",
    zh: "任务ID"
  },
  startTime: {
    en: "Start Time",
    zh: "开始时间"
  },
  completionTime: {
    en: "Completion Time",
    zh: "完成时间"
  },
  total: {
    en: "Total",
    zh: "总计"
  },
  input: {
    en: "Input",
    zh: "输入"
  },
  output: {
    en: "Output",
    zh: "输出"
  },
  cost: {
    en: "Cost",
    zh: "花费"
  },
  processedDirs: {
    en: "Processed Dirs",
    zh: "处理的目录"
  },
  
  // 任务管理
  todos: {
    en: "Requirements",
    zh: "需求管理"
  },
  createNewTask: {
    en: "Create New Task",
    zh: "新建需求"
  },
  editTask: {
    en: "Edit",
    zh: "编辑"
  },
  splitTask: {
    en: "Split Task with AI",
    zh: "AI拆分任务"
  },
  todoTitle: {
    en: "Title",
    zh: "标题"
  },
  todoDescription: {
    en: "Description",
    zh: "任务描述"
  },
  priority: {
    en: "Priority",
    zh: "优先级"
  },
  tags: {
    en: "Tags",
    zh: "标签"
  },
  
  // 优先级
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
  
  // 状态
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
};