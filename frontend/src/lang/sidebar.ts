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
  searchFileContent: {
    en: "Search file content",
    zh: "搜索文件内容"
  },
  loading: {
    en: "Loading...",
    zh: "加载中..."
  },
  noExactMatchesFound: {
    en: "No exact matches found. Try smart search?",
    zh: "未找到精确匹配。尝试智能搜索？"
  },
  smartSearch: {
    en: "Smart Search",
    zh: "智能搜索"
  },
  noResultsFound: {
    en: "No results found",
    zh: "未找到结果"
  },
  showCode: {
    en: "Show Code",
    zh: "显示代码"
  },
  hideCode: {
    en: "Hide Code",
    zh: "隐藏代码"
  },
  reloadPreview: {
    en: "Reload Preview",
    zh: "重新加载预览"
  },
  enableEditing: {
    en: "Enable Editing",
    zh: "启用编辑"
  },
  disableEditing: {
    en: "Disable Editing",
    zh: "禁用编辑"
  },
  saveEditedHTML: {
    en: "Save Edited HTML",
    zh: "保存编辑的HTML"
  },
  editablePreview: {
    en: "Editable Preview",
    zh: "可编辑预览"
  },
  loadingPreview: {
    en: "Loading preview...",
    zh: "加载预览中..."
  },
  enterUrlToStartPreview: {
    en: "Enter a URL above to start the preview",
    zh: "在上面输入URL开始预览"
  },
  editingEnabled: {
    en: "Editing enabled",
    zh: "编辑已启用"
  },
  editingDisabled: {
    en: "Editing disabled",
    zh: "编辑已禁用"
  },
  noChangesToPreview: {
    en: "No changes to preview",
    zh: "没有要预览的更改"
  },
  enterUrlToPreview: {
    en: "Enter URL to preview",
    zh: "输入要预览的URL"
  },
  enterUrlAboveToPreview: {
    en: "Enter a URL above to preview web content",
    zh: "在上面输入URL以预览网页内容"
  },
  connectedToTerminal: {
    en: "Connected to terminal backend",
    zh: "已连接到终端后端"
  },
  connectionLost: {
    en: "Connection lost. Attempting to reconnect...",
    zh: "连接丢失。正在尝试重新连接..."
  },
  failedToInitTerminalSize: {
    en: "Failed to initialize terminal size",
    zh: "初始化终端大小失败"
  },
  errorWritingToTerminal: {
    en: "Error writing to terminal: ",
    zh: "写入终端时出错："
  },
  websocketError: {
    en: "WebSocket error: ",
    zh: "WebSocket错误："
  },
  connectionClosed: {
    en: "Connection closed. Code: ",
    zh: "连接已关闭。代码："
  },
  reason: {
    en: ", Reason: ",
    zh: "，原因："
  },
  websocketClosedUnexpectedly: {
    en: "WebSocket closed unexpectedly. Reconnecting...",
    zh: "WebSocket意外关闭。正在重新连接..."
  },
  collapse: {
    en: "Collapse",
    zh: "折叠"
  },
  expand: {
    en: "Expand",
    zh: "展开"
  },
  deselect: {
    en: "Deselect",
    zh: "取消选择"
  },
  select: {
    en: "Select",
    zh: "选择"
  },
  selectAllFilesInside: {
    en: "Select All Files Inside",
    zh: "选择内部所有文件"
  },
  previewFile: {
    en: "Preview File",
    zh: "预览文件"
  },
  copyPath: {
    en: "Copy Path",
    zh: "复制路径"
  },
  addTo: {
    en: "Add to",
    zh: "添加到"
  },
  refreshDirectoryTree: {
    en: "Refresh directory tree",
    zh: "刷新目录树"
  },
  addSelected: {
    en: "Add Selected",
    zh: "添加选中项"
  },
  selectAllCurrentVisible: {
    en: "Select all current visible files",
    zh: "全选当前可见文件"
  },
  invertCurrentVisible: {
    en: "Invert current visible files",
    zh: "反选当前可见文件"
  },
  filterByFileType: {
    en: "Filter by File Type",
    zh: "按文件类型筛选"
  },
  pathCopiedToClipboard: {
    en: "Path copied to clipboard",
    zh: "路径已复制到剪贴板"
  },
  failedToCopyPath: {
    en: "Failed to copy path",
    zh: "复制路径失败"
  },
  fileAddedToSelection: {
    en: "File added to selection",
    zh: "文件已添加到选择"
  },
  filesSelected: {
    en: "files selected",
    zh: "个文件已选择"
  },
  filesInverted: {
    en: "files inverted",
    zh: "个文件已反选"
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
  
  // Provider选择器标签
  providerCodeModel: {
    en: "Code Model",
    zh: "代码模型"
  },
  providerRag: {
    en: "RAG",
    zh: "RAG"
  },
  providerMcps: {
    en: "MCPs",
    zh: "MCPs"
  },
  providerLlmFriendlyPackages: {
    en: "LLM Packages",
    zh: "LLM友好包"
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
  
  // InputArea 相关
  settingsAndGroups: {
    en: "Settings & Groups",
    zh: "设置和组"
  },
  settings: {
    en: "Settings",
    zh: "设置"
  },
  openDocumentation: {
    en: "Open Documentation",
    zh: "打开文档"
  },
  exitFullscreen: {
    en: "Exit Fullscreen",
    zh: "退出全屏"
  },
  fullscreenMode: {
    en: "Fullscreen Mode",
    zh: "全屏模式"
  },
  buildingIndex: {
    en: "Building index...",
    zh: "构建索引中..."
  },
  buildIndex: {
    en: "Build index",
    zh: "构建索引"
  },
  indexBuiltSuccessfully: {
    en: "Index built successfully",
    zh: "索引构建成功"
  },
  indexBuildFailed: {
    en: "Index build failed",
    zh: "索引构建失败"
  },
  disableSound: {
    en: "Disable Sound",
    zh: "关闭提示音"
  },
  enableSound: {
    en: "Enable Sound",
    zh: "开启提示音"
  },
  mode: {
    en: "Mode:",
    zh: "模式："
  },
  switchModeTooltip: {
    en: "Switch between Chat and Write mode",
    zh: "在聊天和写入模式之间切换"
  },
  maximizeMinimizeTooltip: {
    en: "to maximize/minimize",
    zh: "最大化/最小化"
  },
  stepByStep: {
    en: "Step By Step",
    zh: "分步执行"
  },
  clickToStop: {
    en: "Click to stop",
    zh: "点击停止"
  },
  toSend: {
    en: "to send",
    zh: "发送"
  },
  send: {
    en: "Send",
    zh: "发送"
  },
  cancelling: {
    en: "Cancelling...",
    zh: "取消中..."
  },
  failedToFetchConfiguration: {
    en: "Failed to fetch configuration",
    zh: "获取配置失败"
  },
  failedToUpdate: {
    en: "Failed to update",
    zh: "更新失败"
  },
  cancelTaskFailed: {
    en: "Failed to cancel task",
    zh: "取消任务失败"
  },
  indexBuildStarted: {
    en: "Index build started",
    zh: "索引构建已开始"
  },
  failedToBuildIndex: {
    en: "Failed to build index",
    zh: "构建索引失败"
  },
  indexBuildCompleted: {
    en: "Index build completed",
    zh: "索引构建完成"
  },
  indexBuildFailedWithError: {
    en: "Index build failed:",
    zh: "索引构建失败："
  },
};