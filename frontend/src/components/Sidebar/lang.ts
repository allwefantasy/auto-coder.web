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
  skipFilterIndexDescription: {
    en: "When enabled, system won't automatically filter files based on context. You'll need to manually add files using /add_files command.",
    zh: "启用后，系统不会自动根据上下文过滤文件。你需要使用/add_files指令手动添加文件。"
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
  generatingCode: {
    en: "Generating code...",
    zh: "正在生成代码..."
  },
  generatedCode: {
    en: "Generated Code",
    zh: "生成的代码"
  },
  codeGenerationComplete: {
    en: "Code generation complete",
    zh: "代码生成完成"
  },
  rankingCode: {
    en: "Ranking code...",
    zh: "正在对代码进行排序..."
  },
  codeRankingComplete: {
    en: "Code ranking complete",
    zh: "代码排序完成"
  },
  rankedCode: {
    en: "Code Rank Result",
    zh: "代码排序结果"
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
  // Model Management
  modelManagement: {
    en: "Model Management",
    zh: "模型管理"
  },
  providerManagement: {
    en: "Provider Management",
    zh: "供应商管理"
  },
  addModel: {
    en: "Add Model",
    zh: "添加模型"
  },
  addProvider: {
    en: "Add Provider",
    zh: "添加供应商"
  },
  editModel: {
    en: "Edit Model",
    zh: "编辑模型"
  },
  editProvider: {
    en: "Edit Provider",
    zh: "编辑供应商"
  },
  deleteModel: {
    en: "Delete Model",
    zh: "删除模型"
  },
  deleteProvider: {
    en: "Delete Provider",
    zh: "删除供应商"
  },
  modelName: {
    en: "Model Name",
    zh: "模型名称"
  },
  modelDescription: {
    en: "Description",
    zh: "描述"
  },
  modelProvider: {
    en: "Provider",
    zh: "供应商"
  },
  modelType: {
    en: "Model Type",
    zh: "模型类型" // Specific model like 'gpt-4'
  },
  modelTypeInterface: {
    en: "Interface Type",
    zh: "接口类型" // Backend interface like 'saas/openai'
  },
  modelBaseUrl: {
    en: "Base URL",
    zh: "基础URL"
  },
  modelApiKey: {
    en: "API Key",
    zh: "API密钥"
  },
  providerName: {
    en: "Provider Name",
    zh: "供应商名称"
  },
  providerBaseUrl: {
    en: "Provider Base URL",
    zh: "供应商基础URL"
  },
  providerModels: {
    en: "Provider Models",
    zh: "供应商模型"
  },
  modelInputPrice: {
    en: "Input Price",
    zh: "输入价格"
  },
  modelOutputPrice: {
    en: "Output Price",
    zh: "输出价格"
  },
  modelAverageSpeed: {
    en: "Average Speed",
    zh: "平均速度"
  },
  modelIsReasoning: {
    en: "Reasoning Model",
    zh: "推理模型"
  },
  saveModel: {
    en: "Save Model",
    zh: "保存模型"
  },
  cancelModelEdit: {
    en: "Cancel",
    zh: "取消"
  },
  modelAddSuccess: {
    en: "Model added successfully",
    zh: "模型添加成功"
  },
  modelUpdateSuccess: {
    en: "Model updated successfully",
    zh: "模型更新成功"
  },
  modelDeleteSuccess: {
    en: "Model deleted successfully",
    zh: "模型删除成功"
  },
  modelOperationFailed: {
    en: "Operation failed: {message}",
    zh: "操作失败：{message}"
  },
  confirmDeleteModel: {
    en: "Are you sure you want to delete this model?",
    zh: "确定要删除此模型吗？"
  },
  confirmDeleteProvider: {
    en: "Are you sure you want to delete this provider?",
    zh: "确定要删除此供应商吗？"
  },
  providerAddSuccess: {
    en: "Provider added successfully",
    zh: "供应商添加成功"
  },
  providerUpdateSuccess: {
    en: "Provider updated successfully",
    zh: "供应商更新成功"
  },
  providerDeleteSuccess: {
    en: "Provider deleted successfully",
    zh: "供应商删除成功"
  },
  volcanoEngine: {
    en: "Volcano Engine",
    zh: "火山引擎"
  },
  openrouter: {
    en: "OpenRouter",
    zh: "OpenRouter"
  },
  summary: {
    en: "Reply",
    zh: "答案"
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
  modelConfiguration: {
    en: "Model Configuration",
    zh: "模型配置"
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
  compilerCommand: {
    en: "Command",
    zh: "命令"
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
  contextAwareInfo: {
    en: "Context Awareness",
    zh: "上下文感知信息"
  },
  analyzingContext: {
    en: "Analyzing Context...",
    zh: "正在分析上下文..."
  },
  contextAnalysisComplete: {
    en: "Context Analysis Complete",
    zh: "上下文分析完成"
  },
  relevantContext: {
    en: "Relevant Context",
    zh: "相关上下文"
  },
  viewChange: {
    en: "History Changes",
    zh: "历史变化"
  },
  viewChangeComingSoon: {
    en: "View this change feature coming soon",
    zh: "查看此次变更功能即将上线"
  },
  viewChanges: {
    en: "View Changes",
    zh: "查看变更"
  },
  completion: {
    en: "Completion",
    zh: "完成"
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
  },
  // 提交历史和差异查看相关
  beforeChange: {
    en: "Before Changes",
    zh: "变更前"
  },
  afterChange: {
    en: "After Changes", 
    zh: "变更后"
  },
  diffView: {
    en: "Diff View",
    zh: "差异视图"
  },
  splitView: {
    en: "Split View",
    zh: "三列视图"
  },
  unifiedView: {
    en: "Unified View",
    zh: "单列视图"
  },
  newFile: {
    en: "New File",
    zh: "新增文件"
  },
  fileDeleted: {
    en: "File Deleted",
    zh: "已删除文件"
  },
  commitHistory: {
    en: "Commit History",
    zh: "提交历史"
  },
  currentChange: {
    en: "Current Change",
    zh: "当前变化"
  },
  currentChangeTitle: {
    en: "Current Change Details",
    zh: "当前变化详情"
  },
  files: {
    en: "Files",
    zh: "文件列表"
  },
  // TodoPanel specific messages
  failedToFetchTodos: {
    en: "Failed to fetch todos",
    zh: "获取待办事项失败"
  },
  failedToLoadTodos: {
    en: "Failed to load todos",
    zh: "加载待办事项失败"
  },
  failedToExecuteTask: {
    en: "Failed to execute task",
    zh: "执行任务失败"
  },
  failedToCreateTodo: {
    en: "Failed to create todo",
    zh: "创建待办事项失败"
  },
  failedToSaveChanges: {
    en: "Failed to save changes. Please try again.",
    zh: "保存更改失败，请重试。"
  },
  failedToCreateNewTodo: {
    en: "Failed to create new todo. Please try again.",
    zh: "创建新待办事项失败，请重试。"
  },
  droppableError: {
    en: "Droppable Error: {message}",
    zh: "拖放错误: {message}"
  },
  dueDate: {
    en: "Due: {date}",
    zh: "截止: {date}"
  },
  // TodoEditModal specific messages
  editTodoTitle: {
    en: "Edit Task",
    zh: "编辑任务"
  },
  todoTitle: {
    en: "Title",
    zh: "标题"
  },
  todoTitlePlaceholder: {
    en: "Enter task title",
    zh: "输入任务标题"
  },
  todoDescription: {
    en: "Description",
    zh: "任务描述"
  },
  todoDescriptionPlaceholder: {
    en: "Enter detailed task description",
    zh: "输入详细任务描述"
  },
  priority: {
    en: "Priority",
    zh: "优先级"
  },
  tags: {
    en: "Tags",
    zh: "标签"
  },
  addTag: {
    en: "Add",
    zh: "添加"
  },
  addTagPlaceholder: {
    en: "New tag",
    zh: "新标签"
  },
  save: {
    en: "Save",
    zh: "保存"
  },
  todoTitleRequired: {
    en: "Task title is required",
    zh: "任务标题不能为空"
  },
  todoDescriptionRequired: {
    en: "Task description is required for splitting",
    zh: "拆分任务需要提供任务描述"
  },
  failedToSaveTodo: {
    en: "Failed to save task",
    zh: "保存任务失败"
  },
  splitTask: {
    en: "Split Task with AI",
    zh: "AI拆分任务"
  },
  failedToSplitTask: {
    en: "Failed to split task",
    zh: "拆分任务失败"
  },
  taskSplitSuccess: {
    en: "Successfully split into {count} sub-tasks",
    zh: "成功拆分为 {count} 个子任务"
  },
  editTask: {
    en: "Edit",
    zh: "编辑"
  },
  // AutoExecuteNotificationModal specific messages
  taskAutoExecuteTitle: {
    en: "Task Auto-Execution",
    zh: "任务自动执行"
  },
  taskAutoExecuteMessage: {
    en: "This task will be automatically executed in the background",
    zh: "该任务将在后台自动执行"
  },
  taskExecutingMessage: {
    en: "Task is being executed in the background...",
    zh: "任务正在后台执行中..."
  },
  taskAutoExecuteDescription: {
    en: "The system will process this task automatically. You can close this notification and continue working on other tasks.",
    zh: "系统将自动处理此任务。您可以关闭此通知并继续处理其他任务。"
  },
  taskConfirmExecuteMessage: {
    en: "Do you want to automatically execute this task?",
    zh: "是否要自动执行此任务？"
  },
  taskConfirmExecuteDescription: {
    en: "The system will begin processing this task in the background. You can continue working on other tasks while this is running.",
    zh: "系统将在后台开始处理此任务。在任务运行期间，您可以继续处理其他任务。"
  },
  confirm: {
    en: "Confirm",
    zh: "确认"
  },
  taskRunningStatus: {
    en: "Running",
    zh: "运行中"
  },
  taskExecutingInBackground: {
    en: "Executing in background...",
    zh: "后台执行中..."
  },
  // 任务拆分结果查看相关
  taskSplitResultTitle: {
    en: "Task Split Results",
    zh: "任务拆分结果"
  },
  originalTask: {
    en: "Original Task",
    zh: "原始任务"
  },
  taskAnalysis: {
    en: "Analysis",
    zh: "需求分析"
  },
  subTasks: {
    en: "Sub Tasks",
    zh: "子任务"
  },
  noSubTasks: {
    en: "No sub tasks found",
    zh: "未找到子任务"
  },
  references: {
    en: "References",
    zh: "参考资料"
  },
  implementationSteps: {
    en: "Implementation Steps",
    zh: "实现步骤"
  },
  acceptanceCriteria: {
    en: "Acceptance Criteria",
    zh: "验收标准"
  },
  taskDependencies: {
    en: "Task Dependencies",
    zh: "任务依赖关系"
  },
  dependsOn: {
    en: "depends on",
    zh: "依赖于"
  },
  viewTaskSplitResult: {
    en: "View Split Results",
    zh: "查看拆分结果"
  },
  hideTaskSplitResult: {
    en: "Hide Split Results",
    zh: "隐藏拆分结果"
  },
  errorTitle: {
    en: "Error",
    zh: "错误"
  },
  noSplitResultData: {
    en: "No split result data available",
    zh: "没有可用的拆分结果数据"
  },
  // Panel maximize related
  maximizePanel: {
    en: "Maximize Panel",
    zh: "最大化面板"
  },
  languageSettings: {
    en: "Language",
    zh: "语言设置"
  },
  restorePanel: {
    en: "Restore Panel",
    zh: "恢复面板"
  },
  expandConfig: {
    en: "Expand",
    zh: "展开"
  },
  collapseConfig: {
    en: "Collapse",
    zh: "折叠"
  },
  // Stop generation related messages
  stop: {
    en: "Stop",
    zh: "停止"
  },
  more: {
    en: "More",
    zh: "更多"
  },
  generationStopped: {
    en: "Generation stopped",
    zh: "生成已停止"
  },
  // Initialization page keys
  initializeProject: {
    en: "Initialize Project",
    zh: "初始化项目"
  },
  projectNeedsInitialization: {
    en: "This project needs to be initialized",
    zh: "该项目需要初始化"
  },
  initializationExplanation: {
    en: "Initialize the project to set up necessary files and configurations",
    zh: "初始化项目以设置必要的文件和配置"
  },
  initializeNow: {
    en: "Initialize Now",
    zh: "立即初始化"
  },
  configureProjectType: {
    en: "Configure Project Type",
    zh: "配置项目类型"
  },
  configureProjectTypeTitle: {
    en: "Configure Project Type",
    zh: "配置项目类型"
  },
  projectTypeExplanation: {
    en: "Project type defines file extensions AI should focus on",
    zh: "项目类型定义了AI应关注的文件扩展名"
  },
  projectTypePlaceholder: {
    en: "e.g. js,ts,jsx,tsx",
    zh: "例如：js,ts,jsx,tsx"
  },
  saveConfiguration: {
    en: "Save Configuration",
    zh: "保存配置"
  },
  failedToInitialize: {
    en: "Failed to initialize project",
    zh: "项目初始化失败"
  },
  projectConfigurationComplete: {
    en: "Project configuration complete",
    zh: "项目配置完成"
  },
  failedToConfigureProjectType: {
    en: "Failed to configure project type",
    zh: "配置项目类型失败"
  },
  loadingProject: {
    en: "Loading project...",
    zh: "加载项目中..."
  },
  searchFilesAndSymbols: {
    en: "Search Files and Symbols",
    zh: "搜索文件和符号"
  },
  searchFilesAndSymbolsPlaceholder: {
    en: "Enter file name or symbol to search...",
    zh: "输入文件名或符号进行搜索..."
  },
  buildIndex: {
    en: "Build Index",
    zh: "构建索引"
  },
  buildingIndex: {
    en: "Building Index...",
    zh: "构建索引中..."
  },
  indexBuildSuccess: {
    en: "Index built successfully",
    zh: "索引构建成功"
  },
  indexBuildFailed: {
    en: "Index build failed",
    zh: "索引构建失败"
  },
  // Model configuration descriptions
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
  // Advanced settings
  advancedSettings: {
    en: "Advanced",
    zh: "高级设置"
  },
  enableAutoFixLint: {
    en: "Auto Fix Lint",
    zh: "自动修复代码风格"
  },
  enableAutoFixLintDescription: {
    en: "Automatically fixes lint errors in generated code. Supports Python, ReactJS, and Vue.",
    zh: "自动修复生成代码中的代码风格错误。支持Python、ReactJS和Vue。"
  },
  enableActiveContext: {
    en: "Enable Memory System",
    zh: "启用记忆系统"
  },
  enableActiveContextDescription: {
    en: "Memory system will become more familiar with your system in each iteration.",
    zh: "记忆系统会在每次迭代中都会对你的系统更加熟悉"
  },
  enableTaskHistory: {
    en: "Enable Task History",
    zh: "启用任务历史"
  },
  enableTaskHistoryDescription: {
    en: "When using /chat, /coding commands, include task history in the context.",
    zh: "使用/chat、/coding等指令时，将任务历史信息纳入上下文。"
  },
  includeProjectStructure: {
    en: "Include Project Structure",
    zh: "包含项目结构"
  },
  includeProjectStructureDescription: {
    en: "Include project directory structure in context. Set to false for large projects.",
    zh: "在上下文中包含项目目录结构。如果项目很大，请设置为false。"
  },
  enableRag: {
    en: "Enable RAG",
    zh: "启用 RAG"
  },
  enableRagDescription: {
    en: "Prefix messages with /rag when enabled and not in write mode.",
    zh: "启用后，在非写入模式下，消息将自动添加 /rag 前缀。"
  },
  // FileGroupSelect相关
  fileGroupSelectPlaceholder: {
    en: "Select file groups or search for files",
    zh: "选择文件组或搜索文件"
  },
  searchResults: {
    en: "Search Results",
    zh: "搜索结果"
  },
  fileType: {
    en: "File",
    zh: "文件"
  },
  openedFiles: {
    en: "Opened Files",
    zh: "已打开文件"
  },
  fileStatusActive: {
    en: "Active",
    zh: "当前活动"
  },
  fileStatusOpened: {
    en: "Opened",
    zh: "已打开"
  },
  mentionedFiles: {
    en: "Mentioned Files",
    zh: "提到的文件"
  },
  mentionedFileStatus: {
    en: "Mentioned",
    zh: "被提到"
  },
  fileCount: {
    en: "{count} files",
    zh: "{count} 个文件"
  },
  moreFiles: {
    en: "+{count} more...",
    zh: "还有 {count} 个..."
  },
  updatedMentionFiles: {
    en: "Updated mention files: {count}",
    zh: "更新提到的文件: {count} 个"
  },
  // 控制台日志和错误消息
  editorTabsChanged: {
    en: "FileGroupSelect: Received editor tabs changed event",
    zh: "FileGroupSelect: 收到编辑器选项卡变更事件"
  },
  errorRemovingFocus: {
    en: "Error removing focus on ESC:",
    zh: "ESC键移除焦点时出错:"
  },
  errorFocusingInput: {
    en: "Error focusing input after ESC:",
    zh: "ESC键后聚焦输入框时出错:"
  },
  errorFetchingCompletions: {
    en: "Error fetching file completions:",
    zh: "获取文件补全时出错:"
  },
  errorUpdatingSelection: {
    en: "Error updating selection:",
    zh: "更新选择时出错:"
  },
  clearContext: {
    en: "Clear all selections",
    zh: "清除所有选中内容"
  },
  refreshFromHere: {
    en: "Refresh from here",
    zh: "从此处刷新"
  },
  clearFailed: {
    en: "Failed to clear selections",
    zh: "清除选中内容失败"
  },
  focusInput: {
    en: "Focused on file selection input",
    zh: "已聚焦到文件选择输入框"
  },
  analyzingCode: {
    en: "Analyzing Code",
    zh: "正在分析代码"
  },
  lintResults: {
    en: "Lint Results",
    zh: "代码检查结果"
  },
  // Index build related messages
  indexingFiles: {
    en: "Preparing to build index files... files to be updated: {{file_number}},increment:{{file_increment}}",
    zh: "准备构建索引文件...待构建文件数 {{file_number}},增量占比：{{file_increment}} "
  },
  updatedFiles: {
    en: "Updated Files",
    zh: "更新的文件"
  },
  removedFiles: {
    en: "Removed Files",
    zh: "删除的文件"
  },
  indexProgress: {
    en: "Progress",
    zh: "进度"
  },
  // Compiler Configuration
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
  yes: {
    en: "Yes",
    zh: "是"
  },
  no: {
    en: "No",
    zh: "否"
  },
  nameRequired: {
    en: "Please enter a name",
    zh: "请输入名称"
  },
  typeRequired: {
    en: "Please select a type",
    zh: "请选择类型"
  },
  workingDirRequired: {
    en: "Please enter a working directory",
    zh: "请输入工作目录"
  },
  compilerCommandRequired: {
    en: "Please enter a command",
    zh: "请输入命令"
  },
  arguments: {
    en: "Arguments (space separated)",
    zh: "参数 (空格分隔)"
  },
  extractRegex: {
    en: "Error Extraction Regex",
    zh: "错误提取正则表达式"
  },
  extractRegexTooltip: {
    en: "Regular expression to extract error information from compiler output",
    zh: "从编译器输出中提取错误信息的正则表达式"
  },
  enterFileExtensions: {
    en: "Enter file extensions (e.g. .py,.js)",
    zh: "输入文件后缀名 (例如 .py,.js)"
  },
  triggersLabel: {
    en: "Source file extensions that trigger compilation",
    zh: "触发编译的源码后缀名列表"
  },
  compilerUpdateSuccess: {
    en: "Compiler updated successfully",
    zh: "编译器更新成功"
  },
  compilerCreateSuccess: {
    en: "Compiler created successfully",
    zh: "编译器创建成功"
  },
  compilerDeleteSuccess: {
    en: "Compiler deleted successfully",
    zh: "编译器删除成功"
  },
  noCompilers: {
    en: "No compilers configured",
    zh: "未配置编译器"
  },
  initializeDefault: {
    en: "Initialize Default",
    zh: "初始化默认设置"
  },
  // RAG Configuration
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
  ragAddSuccess: {
    en: "RAG added successfully",
    zh: "知识库添加成功"
  },
  ragUpdateSuccess: {
    en: "RAG updated successfully",
    zh: "知识库更新成功"
  },
  ragDeleteSuccess: {
    en: "RAG deleted successfully",
    zh: "知识库删除成功"
  },
  confirmDeleteRag: {
    en: "Are you sure you want to delete this RAG?",
    zh: "确定要删除此知识库吗？"
  },
  noRags: {
    en: "No RAGs configured",
    zh: "未配置知识库"
  },
  indexFilterModel: {
    en: "Index Filter Model",
    zh: "索引过滤模型"
  },
  indexFilterModelDescription: {
    en: "Used for filtering index content",
    zh: "用于过滤索引内容"
  },
  enableAutoFixCompile: {
    en: "Auto Fix Compile",
    zh: "自动修复编译错误"
  },
  enableAutoFixCompileDescription: {
    en: "Automatically fixes compilation errors in generated code",
    zh: "自动修复生成代码中的编译错误"
  },
  // Compiler Configuration Placeholders
  workingDirPlaceholder: {
    en: "Enter relative path for working directory",
    zh: "请输入相对路径的工作目录"
  },
  compilerTypePlaceholder: {
    en: "Enter build tool type (e.g. maven, vite)",
    zh: "请输入构建工具类型 (例如 maven, vite)"
  },
  enterArguments: {
    en: "Enter arguments, separated by spaces",
    zh: "输入参数，用空格分隔"
  },
  advancedSettings_enableAutoFixMerge: {
    en: "Enable Auto Fix Merge",
    zh: "启用自动修复合并"
  },
  advancedSettings_enableAutoFixMergeDescription: {
    en: "Automatically fixes merge failure in generated code",
    zh: "自动修复无法合并代码的情况"
  },
  // BasicSettings component
  basicSettings: {
    en: "Basic Settings",
    zh: "基本设置"
  },
  indexMaxInputLength: {
    en: "Index Max Input Length",
    zh: "索引最大输入长度"
  },
  indexMaxInputLengthDescription: {
    en: "Maximum token length for index filter model input",
    zh: "索引过滤模型输入的最大令牌长度"
  },
  autoMergeMethod: {
    en: "Auto Merge Method",
    zh: "自动合并方法"
  },
  autoMergeMethodDescription: {
    en: "Format of generated code and corresponding merge method",
    zh: "生成代码的格式以及对应的合并方式"
  },
  wholeFile: {
    en: "Whole File",
    zh: "整个文件"
  },
  editBlock: {
    en: "Edit Block",
    zh: "编辑块"
  },
  diff: {
    en: "Diff",
    zh: "差异"
  },
  strictDiff: {
    en: "Strict Diff",
    zh: "严格差异"
  },
  generateTimesSameModel: {
    en: "Generate Times per Model",
    zh: "单个模型生成次数"
  },
  generateTimesSameModelDescription: {
    en: "Number of candidate code generations per model",
    zh: "单个模型生成多少份候选代码"
  },
  rankTimesSameModel: {
    en: "Rank Times per Model",
    zh: "单个投票模型投票次数"
  },
  rankTimesSameModelDescription: {
    en: "Number of voting rounds per ranking model",
    zh: "单个投票模型进行几次投票"
  },
  agenticFilterCommandChoose: {
    en: "{{command}}",
    zh: "{{command}}"
  },
  agenticFilterCommandResult: {
    en: "Read the result of {{command}}...",
    zh: "阅读 {{command}} 的执行结果..."
  },
  // Basic Settings
  enableAgenticFilter: {
    en: "Enable Agentic Filter",
    zh: "开启Agent模式过滤"
  },
  enableAgenticFilterDescription: {
    en: "Enable agentic filter for more accurate file selection",
    zh: "启用Agent模式过滤以进行更准确的文件选择"
  },
  enable: {
    en: "Enable",
    zh: "启用"
  },
  disable: {
    en: "Disable",
    zh: "禁用"
  },  
  unmergedBlocks: {
    en: "Unmerged File Path Found",
    zh: "发现未合并的文件"
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
export const getMessage = (key: keyof typeof messages, params: { [key: string]: any } = {}): string => {
  const message = messages[key]?.[currentLanguage] || messages[key]?.en || String(key);
  return Object.entries(params).reduce(
    (text, [key, value]) => String(text).replace(`{{${key}}}`, value),
    String(message)
  );
};
