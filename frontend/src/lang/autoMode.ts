interface Message {
  en: string;
  zh: string;
}

export const autoModeMessages: { [key: string]: Message } = {
  // 自动模式相关
  autoMode: {
    en: "Auto",
    zh: "自动模式"
  },
  expertMode: {
    en: "Expert",
    zh: "专家模式"
  },
  autoModeDescription: {
    en: "Ask anything about your code or what you want to build",
    zh: "询问任何关于你的代码或者你想构建的内容"
  },
  tryExamples: {
    en: "Try examples",
    zh: "尝试示例"
  },
  
  // 消息类型
  thinking: {
    en: "Thinking",
    zh: "思考"
  },
  processingStatus: {
    en: "Thinking...",
    zh: "正在思考..."
  },
  processingComplete: {
    en: "Thinking Complete",
    zh: "思考完成"
  },
  
  // 代码相关
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
    en: "Code Ranking...",
    zh: "代码排序..."
  },
  codeRankingComplete: {
    en: "Code Ranking...",
    zh: "代码排序..."
  },
  rankedCode: {
    en: "Code Ranking...",
    zh: "代码排序..."
  },
  
  // 编译相关
  compileResults: {
    en: "Compile Results",
    zh: "编译检查...."
  },
  analyzingCompile: {
    en: "Analyzing Compile...",
    zh: "正在分析编译..."
  },
  
  // 代码检查
  analyzingCode: {
    en: "Analyzing Code",
    zh: "正在分析代码"
  },
  lintResults: {
    en: "Lint Check....",
    zh: "代码检查...."
  },
  
  // 合并相关
  unmergedBlocks: {
    en: "Merge Check.....",
    zh: "合并检查..."
  },
  
  // RAG搜索
  ragSearchStart: {
    en: "Starting RAG search...",
    zh: "开始RAG搜索..."
  },
  ragSearchComplete: {
    en: "RAG search complete",
    zh: "RAG搜索完成"
  },
  
  // 索引构建
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
    en: "Selected file: {{file}}",
    zh: "已选择文件: {{file}}"
  },
  
  // 完成状态
  completion: {
    en: "Completion",
    zh: "完成"
  },
  jobCompleted: {
    en: "Job Completed",
    zh: "任务完成"
  },
  
  // 命令相关
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
  commandSuggestionTitle: {
    en: "After thinking, we will call the following command:",
    zh: "经过思考，我们会调用以下命令："
  },
  
  // 上下文相关
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
  
  // 用户交互
  user: {
    en: "User",
    zh: "用户"
  },
  summary: {
    en: "Reply",
    zh: "答案"
  },
  
  // Agentic Edit相关
  agenticEditToolResultReplaceInFileTool: {
    en: "auto-coder.web updated the file",
    zh: "auto-coder.web 更新了文件"
  },
  agenticEditToolResultWriteToFileTool: {
    en: "auto-coder.web wrote to the file",
    zh: "auto-coder.web 写入了文件"
  },
  agenticEditToolResultReadFileTool: {
    en: "auto-coder.web read the file",
    zh: "auto-coder.web 读取了文件"
  },
  agenticEditToolResultListFilesTool: {
    en: "auto-coder.web listed the following files in this directory:",
    zh: "auto-coder.web 列出了此目录中的以下文件:"
  },
  agenticEditToolResultSearchFilesTool: {
    en: "auto-coder.web found the following files matching the pattern:",
    zh: "auto-coder.web 找到了与此模式匹配的以下文件:"
  },
  agenticEditReplaceInFileToolTitle: {
    en: "auto-coder.web wants to replace the content of this file",
    zh: "auto-coder.web 想要替换此文件中的内容"
  },
  agenticEditWriteToFileToolTitle: {
    en: "auto-coder.web wants to write to this file",
    zh: "auto-coder.web 想要写入此文件"
  },
  agenticEditReadFileToolTitle: {
    en: "auto-coder.web wants to read this file",
    zh: "auto-coder.web 想要读取此文件"
  },
  agenticEditListFilesToolTitle: {
    en: "auto-coder.web wants to list files in this directory",
    zh: "auto-coder.web 想要列出此目录中的文件"
  },
  agenticEditSearchFilesToolTitle: {
    en: "auto-coder.web wants to search for files matching this pattern",
    zh: "auto-coder.web 想要搜索与此模式匹配的文件"
  },
  
  // 对话框
  askUserDialogTitle: {
    en: "User Input Required",
    zh: "需要用户输入"
  },
  askUserDialogResponseRequired: {
    en: "A response is required to continue",
    zh: "需要回复才能继续"
  },
  askUserDialogPlaceholder: {
    en: "Type your response...",
    zh: "输入您的回复..."
  },
  askUserDialogSend: {
    en: "Send",
    zh: "发送"
  },
  
  // 其他
  markdown: {
    en: "Markdown",
    zh: "Markdown"
  },
  maximize: {
    en: "Maximize",
    zh: "最大化"
  },
  refreshFromHere: {
    en: "Refresh from here",
    zh: "从此处刷新"
  },
  
  // ExpertMode 面板相关
  codeViewer: {
    en: "Code Editor",
    zh: "代码编辑器"
  },
  previewChangesStatic: {
    en: "Preview",
    zh: "预览"
  },
  previewChangesEditable: {
    en: "Editable Preview",
    zh: "可编辑预览"
  },
  more: {
    en: "More",
    zh: "更多"
  },
  todos: {
    en: "Todos",
    zh: "待办事项"
  },
  
  // 工具面板
  output: {
    en: "Output",
    zh: "输出"
  },
  terminal: {
    en: "Terminal",
    zh: "终端"
  },
  
  // 弹窗和对话框
  contentPreview: {
    en: "Content Preview",
    zh: "内容预览"
  },
  loadingHistory: {
    en: "Loading History...",
    zh: "加载历史记录中..."
  },
  
  // Tooltip 提示
  previewChangesStaticTooltip: {
    en: "Preview code changes in read-only mode",
    zh: "以只读模式预览代码变更"
  },
  previewChangesEditableTooltip: {
    en: "Preview and edit code changes",
    zh: "预览并编辑代码变更"
  },
  
  // AutoModePage 中需要的多语言配置
  navigationMenu: {
    en: "Navigation Menu",
    zh: "导航菜单"
  },
  currentChange: {
    en: "Current Changes",
    zh: "当前变化"
  },
  fullScreenWidth: {
    en: "Full screen width",
    zh: "全屏宽度"
  },
  limitedWidth: {
    en: "Limited width",
    zh: "限制宽度"
  },
  close: {
    en: "Close",
    zh: "关闭"
  },
  projectName: {
    en: "Project",
    zh: "项目名称"
  },
  noProjectSelected: {
    en: "No Project Selected",
    zh: "未选择项目"
  },
};