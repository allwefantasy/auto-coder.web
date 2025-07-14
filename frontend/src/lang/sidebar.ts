interface Message {
  en: string;
  zh: string;
}

export const sidebarMessages: { [key: string]: Message } = {
  // 侧边栏主要功能
  searchIn: {
    en: "Search in",
    zh: "搜索"
  },
  yourProject: {
    en: "your project",
    zh: "你的项目"
  },
  searchFiles: {
    en: "Search Files",
    zh: "搜索文件"
  },
  searchFilesPlaceholder: {
    en: "Enter file name to search...",
    zh: "输入文件名进行搜索..."
  },
  searchFilesAndSymbols: {
    en: "Search Files and Symbols",
    zh: "搜索文件和符号"
  },
  searchFilesAndSymbolsPlaceholder: {
    en: "Enter file name or symbol to search...",
    zh: "输入文件名或符号进行搜索..."
  },
  
  // 文件组选择
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
    en: "{{count}} files",
    zh: "{{count}} 个文件"
  },
  moreFiles: {
    en: "+{{count}} more...",
    zh: "还有 {{count}} 个..."
  },
  updatedMentionFiles: {
    en: "Updated mention files: {{count}}",
    zh: "更新提到的文件: {{count}} 个"
  },
  clearContext: {
    en: "Clear all selections",
    zh: "清除所有选中内容"
  },
  clearFailed: {
    en: "Failed to clear selections",
    zh: "清除选中内容失败"
  },
  focusInput: {
    en: "Focused on file selection input",
    zh: "已聚焦到文件选择输入框"
  },
  totalTokens: {
    en: "Total tokens in selected files",
    zh: "已选择文件的总token数"
  },
  
  // 模型选择器
  codeModel: {
    en: "Code Models",
    zh: "代码模型"
  },
  codeModelDescription: {
    en: "Select models for code generation",
    zh: "选择用于代码生成的模型"
  },
  selectCodeModelsPlaceholder: {
    en: "Select code models...",
    zh: "选择代码模型..."
  },
  
  // 输入区域
  expandedEditor: {
    en: "Expanded Editor",
    zh: "扩展编辑器"
  },
  expandEditor: {
    en: "Expand editor for large text input",
    zh: "展开编辑器以输入大段文本"
  },
  sending: {
    en: "Sending...",
    zh: "发送中..."
  },
  undoTooltip: {
    en: "Undo last modification",
    zh: "撤销上次修改"
  },
  
  // Agent按钮
  agentButtonLabel: {
    en: "Agent",
    zh: "Agent"
  },
  agentButtonLabelDesc: {
    en: "(click to toggle)",
    zh: "(点击切换)"
  },
  
  // 停止生成
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
  
  // 错误信息
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
};