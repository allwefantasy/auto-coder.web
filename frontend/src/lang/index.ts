import { providerManagementMessages } from "./providerManagement";
import { modelManagementMessages } from "./modelManagement";
import { settingsPanelMessages } from "./settingsPanel";
import { chatPanelLang as chatPanelMessages } from "./chatPanel"; // Corrected path
import { chatPanelsMessages } from "./chatPanels"; // 添加ChatPanels.lang导入
import { historyPanelMessages } from "./historyPanel";
import { codeEditorMessages } from "./codeEditor"; // Import code editor messages
import { libSelectorMessages } from "./libSelector"; // Import LibSelector messages
import { basicSettingsMessages } from "./basicSettings"; // Import BasicSettings messages
import { mainContentMessages } from "./mainContent";
import { autoModeMessages } from "./autoMode";
import { commonMessages } from "./common";
import { sidebarMessages } from "./sidebar";
import { editorMessages } from "./editor";
import { editorComponentMessages } from "./editorComponent";
import { fileTreeMessages } from "./fileTree";
import { terminalMessages } from "./terminal";
import { terminalManagerMessages } from "./terminalManager";
import { appMessages } from "./app";
import { componentsMessages } from "./components";
import { messagesConfig } from "./messages";
import { dotNotationMessages } from "./dotNotationMessages";
import { commitListLang } from "./commitList";

interface Message {
  en: string;
  zh: string;
}
export const messages: { [key: string]: Message } = {
  ...providerManagementMessages,
  ...modelManagementMessages,
  ...settingsPanelMessages,
  ...chatPanelMessages,
  ...chatPanelsMessages,
  ...historyPanelMessages,
  ...codeEditorMessages,
  ...libSelectorMessages,
  ...basicSettingsMessages,
  ...mainContentMessages,
  ...autoModeMessages,
  ...commonMessages,
  ...sidebarMessages,
  ...editorMessages,
  ...editorComponentMessages,
  ...fileTreeMessages,
  ...terminalMessages,
  ...terminalManagerMessages,
  ...appMessages,
  ...componentsMessages,
  ...messagesConfig,
  ...dotNotationMessages,
  ...commitListLang,

  // 补充缺失的消息
  noProjectSelected: {
    en: "No Project Selected",
    zh: "未选择项目"
  },
  clearCurrentChat: {
    en: "Clear current chat",
    zh: "清空当前对话"
  },
  saveCurrentChat: {
    en: "Save current chat",
    zh: "保存当前对话"
  },
  settings: {
    en: "Settings",
    zh: "设置"
  },
  exportChatAsImage: {
    en: "Export chat as image",
    zh: "导出对话为图片"
  },
  startNewConversation: {
    en: "Start a new conversation",
    zh: "开始一个新的对话"
  },
  askAnything: {
    en: "Feel free to ask anything below, I'll do my best to help you.",
    zh: "有任何问题都可以在下方输入，我会尽力帮助您。"
  },
  confirmClear: {
    en: "Confirm Clear",
    zh: "确认清空"
  },
  confirmClearContent: {
    en: "Are you sure you want to clear all messages in the current chat? This action cannot be undone.",
    zh: "确定要清空当前对话中的所有消息吗？此操作不可撤销。"
  },
  clearButton: {
    en: "Clear",
    zh: "清空"
  },
  chatCleared: {
    en: "Chat cleared",
    zh: "对话已清空"
  },
  selectOrCreateChat: {
    en: "Please select or create a chat first",
    zh: "请先选择或创建一个对话"
  },
  noMessagesToSave: {
    en: "No messages to save",
    zh: "没有消息可保存"
  },
  chatSaved: {
    en: "Chat saved",
    zh: "对话已保存"
  },
  exportImageFailed: {
    en: "Failed to export image",
    zh: "导出图片失败"
  },
  messageAreaNotFound: {
    en: "Message area not found",
    zh: "未找到消息列表区域"
  },
  createNewChat: {
    en: "Create New Chat",
    zh: "创建新对话"
  },
  chatName: {
    en: "Chat Name",
    zh: "对话名称"
  },
  enterChatName: {
    en: "Please enter a name for the new chat",
    zh: "请输入新对话的名称"
  },
  createButton: {
    en: "Create",
    zh: "创建"
  },
  newChatCreated: {
    en: "New chat created successfully",
    zh: "新聊天创建成功"
  },
  createNewChatFailed: {
    en: "Failed to create new chat",
    zh: "创建新聊天失败"
  },
  pleaseEnterMessage: {
    en: "Please enter a message",
    zh: "请输入消息"
  },
  taskCompletedWithErrors: {
    en: "Task completed with errors",
    zh: "任务完成但有错误"
  },
  taskCompletedSuccessfully: {
    en: "Task completed successfully",
    zh: "任务完成成功"
  },
  fetchChangedFilesFailed: {
    en: "Failed to fetch changed files",
    zh: "获取变更文件失败"
  },
  failedToSendMessage: {
    en: "Failed to send message",
    zh: "发送消息失败"
  },
  generationStopped: {
    en: "Generation stopped",
    zh: "生成已停止"
  },
  failedToStopGeneration: {
    en: "Failed to stop generation",
    zh: "停止生成失败"
  },
  scrollToBottom: {
    en: "Scroll to bottom",
    zh: "滚动到底部"
  },
  getChatListsFailed: {
    en: "Failed to get chat lists",
    zh: "获取聊天列表失败"
  },
  loadChatListFailed: {
    en: "Failed to load chat list",
    zh: "加载聊天列表失败"
  },
  deleteChatListFailed: {
    en: "Failed to delete chat list",
    zh: "删除聊天列表失败"
  },
  chatListDeletedSuccessfully: {
    en: "Chat list deleted successfully",
    zh: "聊天列表已成功删除"
  },
  chatRenamedTo: {
    en: "Chat renamed to {{name}}",
    zh: "聊天已重命名为 {{name}}"
  },
  configurationUpdatedSuccessfully: {
    en: "Configuration updated successfully",
    zh: "配置更新成功"
  },
  processingError: {
    en: "Processing error occurred",
    zh: "处理过程中发生错误"
  },
  contextPruneModel: {
    en: "Context Prune Model",
    zh: "上下文剪枝模型",
  },
  contextPruneModelDescription: {
    en: "The model used for pruning code context",
    zh: "用于剪枝代码上下文的模型",
  },
  conversationPruneModel: {
    en: "Conversation Prune Model",
    zh: "对话剪枝模型",
  },
  conversationPruneModelDescription: {
    en: "The model used for pruning conversation history",
    zh: "用于剪枝对话历史的模型",
  },
  clickToFilterHistory: {
    en: "Click to filter history by this commit",
    zh: "点击按此提交过滤历史记录",
  },
  clearFilter: {
    en: "Clear Filter",
    zh: "清除过滤",
  },
  filteringByCommit: {
    en: "Filtering by commit",
    zh: "按提交过滤",
  },
  noFilteredResults: {
    en: "No matching history records found",
    zh: "没有匹配的历史记录",
  },
  modelApiKeyConfigured: {
    en: "API Key",
    zh: "API Key",
  },
  ragToggle: {
    en: "RAG",
    zh: "RAG检索增强",
  },
  ragUrlInput: {
    en: "RAG URL",
    zh: "RAG 服务地址",
  },
  ragUrlPlaceholder: {
    en: "Enter RAG URL",
    zh: "请输入RAG服务地址",
  },
  ragTypeInput: {
    en: "RAG Type",
    zh: "RAG 类型",
  },
  ragTypePlaceholder: {
    en: "Enter RAG Type",
    zh: "请输入RAG类型",
  },
  ragTokenInput: {
    en: "RAG Token",
    zh: "RAG 访问令牌",
  },
  ragTokenPlaceholder: {
    en: "Enter RAG Token",
    zh: "请输入RAG访问令牌",
  },
  indexToggle: {
    en: "Index",
    zh: "索引",
  },
  enableBuildIndexToggle: {
    en: "Enable Build Index",
    zh: "开启构建索引",
  },
  enableFilterIndexToggle: {
    en: "Enable Filter Index",
    zh: "开启过滤索引",
  },
  enableFilterIndexTooltip: {
    en: "Enable filtering index for better context-aware file selection",
    zh: "开启过滤索引以获得更好的上下文感知文件选择",
  },
  enableFilterIndexDescription: {
    en: "When enabled, system will automatically filter files based on context. You can still manually add files using /add_files command.",
    zh: "启用后，系统会自动根据上下文过滤文件。你仍然可以使用/add_files指令手动添加文件。",
  },
  indexFilterLevelInput: {
    en: "Index Filter Level",
    zh: "索引过滤级别",
  },
  indexFilterWorkersInput: {
    en: "Index Filter Workers",
    zh: "索引过滤工作线程数",
  },
  indexFilterWorkersPlaceholder: {
    en: "Default: 100",
    zh: "默认值：100",
  },
  indexFilterFileNumInput: {
    en: "Index Filter File Number",
    zh: "索引过滤文件数量",
  },
  indexFilterFileNumPlaceholder: {
    en: "Default: 10",
    zh: "默认值：10",
  },
  indexBuildWorkersInput: {
    en: "Index Build Workers",
    zh: "索引构建工作线程数",
  },
  indexBuildWorkersPlaceholder: {
    en: "Default: 100",
    zh: "默认值：100",
  },
  settingsUpdateSuccess: {
    en: "Configuration updated successfully",
    zh: "配置更新成功",
  },
  settingsUpdateError: {
    en: "Failed to update configuration",
    zh: "配置更新失败",
  },
  copyInstructions: {
    en: "Please copy the text on the right side, then paste the result back to the right side. Reply 'confirm' when done.",
    zh: "请复制右侧的文本,然后将结果复制黏贴会右侧。黏贴完请回复 '确认'",
  },
  noQueryFound: {
    en: "No query found in the last action",
    zh: "在上一次操作中未找到查询内容",
  },
  revertConfirmation: {
    en: "Are you sure you want to revert the last operation?\n\nLast modification request: {{query}}\n\nPlease reply 'confirm' to proceed with the revert.",
    zh: "你确定要撤回上一次的操作吗？\n\n上一次修改需求为：{{query}}\n\n请回复 '确认' 进行撤回操作。",
  },
  getLastActionError: {
    en: "Failed to get last action information. Please try again.",
    zh: "获取上一次操作信息失败，请重试。",
  },
  revertSuccess: {
    en: "Successfully reverted the last chat action.",
    zh: "成功撤回上一次的操作。",
  },
  revertFailure: {
    en: "Failed to revert: {{message}}",
    zh: "撤回失败：{{message}}",
  },
  revertError: {
    en: "Failed to revert changes. Please try again.",
    zh: "撤回更改失败，请重试。",
  },
  revertCancelled: {
    en: "Revert cancelled.",
    zh: "已取消撤回操作。",
  },
  codeModificationComplete: {
    en: "Code modification complete. Please check the preview panel on the right. If you're not satisfied, click the undo button on the left of the send button.",
    zh: "代码修改完成。请查看右侧修改预览面板。如果不满意，在发送按钮左侧点击撤销最近修改",
  },
  codeModificationFailed: {
    en: "Code modification failed: {{content}}",
    zh: "代码修改失败：{{content}}",
  },
  cancelResponseEvent: {
    en: "Cancel response event",
    zh: "取消响应事件",
  },
  tokens: {
    en: "Tokens",
    zh: "令牌数",
  },
  cache: {
    en: "Cache",
    zh: "缓存",
  },
  contextWindow: {
    en: "Context Window",
    zh: "上下文窗口",
  },
  apiCost: {
    en: "API Cost",
    zh: "API成本",
  },
  showMessages: {
    en: "Show Messages",
    zh: "显示消息",
  },
  viewChange: {
    en: "History Changes",
    zh: "历史变化",
  },
  viewChangeComingSoon: {
    en: "View this change feature coming soon",
    zh: "查看此次变更功能即将上线",
  },
  viewChanges: {
    en: "View Changes",
    zh: "查看变更",
  },
  modelPerformanceStats: {
    en: "Model Consumption Statistics",
    zh: "模型消费统计",
  },
  totalTime: {
    en: "Total Time",
    zh: "总时间",
  },
  firstTokenTime: {
    en: "First Token Time",
    zh: "首个令牌时间",
  },
  inputTokens: {
    en: "Input Tokens",
    zh: "输入令牌数",
  },
  outputTokens: {
    en: "Output Tokens",
    zh: "输出令牌数",
  },
  inputCost: {
    en: "Input Cost",
    zh: "输入成本",
  },
  outputCost: {
    en: "Output Cost",
    zh: "输出成本",
  },
  tokenSpeed: {
    en: "Speed",
    zh: "速度",
  },
  taskTitlePlaceholder: {
    en: "Task Title",
    zh: "需求标题",
  },
  priorityPlaceholder: {
    en: "Priority",
    zh: "优先级",
  },
  humanAsModel: {
    en: "Human As Model",
    zh: "人工模型",
  },
  humanAsModelTooltip: {
    en: "Enable to let human act as the model",
    zh: "启用人工模型",
  },
  skipBuildIndex: {
    en: "Skip Build Index",
    zh: "跳过构建索引",
  },
  enableBuildIndexTooltip: {
    en: "Enable building index for better code understanding",
    zh: "开启构建索引以便更好地理解代码",
  },
  enableBuildIndexDescription: {
    en: "Enable indexing allows the system to automatically build and update indexes for better code understanding",
    zh: "开启索引允许系统自动构建和更新索引，以便更好地理解代码",
  },
  projectTypeDescription: {
    en: "The file extensions list that auto-coder.web will focus on. Files with extensions not in the list will be ignored",
    zh: "让 auto-coder.web 关注的后后缀名里列表，不在名单里的，auto-coder.web 不会关注",
  },
  projectType: {
    en: "Project Type",
    zh: "项目类型",
  },
  projectTypeTooltip: {
    en: "Filter files by extensions (e.g. .py,.ts)",
    zh: "按文件扩展名过滤（例如 .py,.ts）",
  },
  customConfig: {
    en: "Custom Configuration",
    zh: "自定义配置",
  },
  addConfig: {
    en: "Add Config",
    zh: "添加配置",
  },
  clearEvents: {
    en: "Clear Events",
    zh: "清除事件",
  },
  clearEventsTooltip: {
    en: "Clear event queue to resolve any stuck operations",
    zh: "清除事件队列以解决卡住的操作",
  },
  // 其他缺失的消息...
  humanAsModelInstructions: {
    en: "Please copy the instruction and complete it manually, then paste the result here.",
    zh: "请复制指令并手动完成，然后将结果粘贴到这里。",
  },

  // 索引相关消息
  indexingFiles: {
    en: "Preparing to build index files... files to be updated: {{file_number}},increment:{{file_increment}}",
    zh: "准备构建索引文件...待构建文件数 {{file_number}},增量占比：{{file_increment}} ",
  },
  updatedFiles: {
    en: "Updated Files",
    zh: "更新的文件",
  },
  removedFiles: {
    en: "Removed Files",
    zh: "删除的文件",
  },
  indexProgress: {
    en: "Progress",
    zh: "进度",
  },
  buildIndex: {
    en: "Build Index",
    zh: "构建索引",
  },
  buildingIndex: {
    en: "Building Index...",
    zh: "构建索引中...",
  },
  indexBuildSuccess: {
    en: "Index built successfully",
    zh: "索引构建成功",
  },
  indexBuildFailed: {
    en: "Index build failed",
    zh: "索引构建失败",
  },

  // RAG/MCP冲突警告
  ragMcpConflictTitle: {
    en: "Conflicting Settings",
    zh: "冲突的设置",
  },
  ragMcpConflictContent: {
    en: "RAG Provider and MCPs Provider cannot be enabled simultaneously. Please disable one of them first.",
    zh: "RAG Provider 和 MCPs Provider 不能同时启用。请先禁用其中一个。",
  },

  // 其他缺失的消息...
  maxOutputTokens: {
    en: "Max Output Tokens",
    zh: "最大输出长度",
  },
  indexMaxInputLength: {
    en: "Index Max Input Length",
    zh: "索引最大输入长度",
  },
  indexMaxInputLengthDescription: {
    en: "Maximum token length for index filter model input",
    zh: "索引过滤模型输入的最大令牌长度",
  },
  autoMergeMethod: {
    en: "Auto Merge Method",
    zh: "自动合并方法",
  },
  autoMergeMethodDescription: {
    en: "Format of generated code and corresponding merge method",
    zh: "生成代码的格式以及对应的合并方式",
  },
  wholeFile: {
    en: "Whole File",
    zh: "整个文件",
  },
  editBlock: {
    en: "Edit Block",
    zh: "编辑块",
  },
  diff: {
    en: "Diff",
    zh: "差异",
  },
  strictDiff: {
    en: "Strict Diff",
    zh: "严格差异",
  },
  generateTimesSameModel: {
    en: "Generate Times per Model",
    zh: "单个模型生成次数",
  },
  generateTimesSameModelDescription: {
    en: "Number of candidate code generations per model",
    zh: "单个模型生成多少份候选代码",
  },
  rankTimesSameModel: {
    en: "Rank Times per Model",
    zh: "单个投票模型投票次数",
  },
  rankTimesSameModelDescription: {
    en: "Number of voting rounds per ranking model",
    zh: "单个投票模型进行几次投票",
  },
  enableAgenticFilter: {
    en: "Enable Agentic Filter",
    zh: "开启Agent模式过滤",
  },
  enableAgenticFilterDescription: {
    en: "Enable agentic filter for more accurate file selection",
    zh: "启用Agent模式过滤以进行更准确的文件选择",
  },
  enableAgenticEdit: {
    en: "Enable Agentic Edit",
    zh: "开启Agentic编辑",
  },
  enableAgenticEditDescription: {
    en: "Agent will combine multiple non-intelligent tools to complete programming. If disabled, when you enable Agent, you will use /coding, /chat, etc. intelligent tools to complete programming.",
    zh: "Agent将组合多个非智能工具来完成编程,如果关闭，当你开启Agent时，将采用 /coding, /chat 等智能工具来完成编程",
  },
  enableAutoFixLint: {
    en: "Auto Fix Lint",
    zh: "自动修复代码风格",
  },
  enableAutoFixLintDescription: {
    en: "Automatically fixes lint errors in generated code. Supports Python, ReactJS, and Vue.",
    zh: "自动修复生成代码中的代码风格错误。支持Python、ReactJS和Vue。",
  },
  enableAutoFixCompile: {
    en: "Auto Fix Compile",
    zh: "自动修复编译错误",
  },
  enableAutoFixCompileDescription: {
    en: "Automatically fixes compilation errors in generated code",
    zh: "自动修复生成代码中的编译错误",
  },
  enableActiveContext: {
    en: "Enable Memory System",
    zh: "启用记忆系统",
  },
  enableActiveContextDescription: {
    en: "Memory system will become more familiar with your system in each iteration.",
    zh: "记忆系统会在每次迭代中都会对你的系统更加熟悉",
  },
  enableActiveContextInGenerate: {
    en: "Enable Memory in Generation",
    zh: "在代码生成时使用记忆系统",
  },
  enableActiveContextInGenerateDescription: {
    en: "Use memory system during code generation for more contextually aware results.",
    zh: "在代码生成过程中使用记忆系统，使生成结果更符合上下文",
  },
  enableTaskHistory: {
    en: "Enable Task History",
    zh: "启用任务历史",
  },
  enableTaskHistoryDescription: {
    en: "When using /chat, /coding commands, include task history in the context.",
    zh: "使用/chat、/coding等指令时，将任务历史信息纳入上下文。",
  },
  includeProjectStructure: {
    en: "Include Project Structure",
    zh: "包含项目结构",
  },
  includeProjectStructureDescription: {
    en: "Include project directory structure in context. Set to false for large projects.",
    zh: "在上下文中包含项目目录结构。如果项目很大，请设置为false。",
  },
  enableRag: {
    en: "Enable RAG",
    zh: "启用 RAG",
  },
  enableRagDescription: {
    en: "Prefix messages with /rag when enabled and not in write mode.",
    zh: "启用后，在非写入模式下，消息将自动添加 /rag 前缀。",
  },
  contextPrune: {
    en: "Enable Large File Pruning",
    zh: "开启超大文件剪枝",
  },
  contextPruneTooltip: {
    en: "When enabled, for oversized files exceeding the threshold, only the beginning and end portions of the content will be retained in the context.",
    zh: "开启后，对于超过阈值的超大文件，在上下文中仅保留首尾部分内容。",
  },
  contextPruneSafeZoneTokens: {
    en: "Large File Pruning Threshold",
    zh: "超大文件剪枝阈值",
  },
  contextPruneSafeZoneTokensTooltip: {
    en: "Unit: tokens. When the file size exceeds this threshold, the pruning strategy will be triggered.",
    zh: "单位：tokens。当文件大小超过此阈值时，会触发剪枝策略。",
  },
  conversationPruneSafeZoneTokens: {
    en: "Conversation Prune Safe Zone Tokens",
    zh: "会话剪枝Token数安全区",
  },
  conversationPruneSafeZoneTokensDescription: {
    en: "Reserved token count during context pruning to avoid losing important information.",
    zh: "会话剪枝时预留的安全Token数，避免丢失重要信息。默认51200",
  },
  agenticFilterCommandChoose: {
    en: "{{command}}",
    zh: "{{command}}",
  },
  agenticFilterCommandResult: {
    en: "Read the result of {{command}}...",
    zh: "阅读 {{command}} 执行结果...",
  },
  advancedSettings_enableAutoFixMerge: {
    en: "Enable Auto Fix Merge",
    zh: "启用自动修复合并",
  },
  advancedSettings_enableAutoFixMergeDescription: {
    en: "Automatically fixes merge failure in generated code",
    zh: "自动修复无法合并代码的情况",
  },
};

// 当前语言设置
let currentLanguage: "en" | "zh" = "zh";

// 初始化语言设置
export const initLanguage = async () => {
  try {
    const response = await fetch("/api/settings/language");
    const data = await response.json();
    currentLanguage = data.language || "zh";
  } catch (error) {
    console.error("Failed to load language settings:", error);
    currentLanguage = "zh";
  }
};

// 设置语言
export const setLanguage = async (lang: "en" | "zh") => {
  try {
    await fetch("/api/settings/language", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: lang }),
    });
    currentLanguage = lang;
  } catch (error) {
    console.error("Failed to save language settings:", error);
  }
};

// 获取当前语言
export const getCurrentLanguage = () => {
  return currentLanguage;
};

/**
 * 获取消息文本
 * @param key 消息key
 * @param params 参数替换
 * @param lang 可选，指定语言（'en' 或 'zh'），不指定时使用当前语言
 */
export const getMessage = (
  key: keyof typeof messages,
  params: { [key: string]: any } = {},
  lang?: "en" | "zh"
): string => {
  const useLang = lang || currentLanguage;
  const message = messages[key]?.[useLang] || messages[key]?.en || String(key);

  return Object.entries(params).reduce(
    (text, [key, value]) => String(text).replace(`{{${key}}}`, value),
    String(message)
  );
};
