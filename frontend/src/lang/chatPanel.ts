interface Message {
  en: string;
  zh: string;
}

export const chatPanelMessages: { [key: string]: Message } = {
  showMore: {
    en: "Show More",
    zh: "显示更多"
  },
  newChat: {
    en: "New Chat",
    zh: "新建对话"
  },
  confirmDeleteTitle: {
    en: "Confirm Deletion",
    zh: "确认删除"
  },
  confirmDeleteContent: {
    en: "Are you sure you want to delete the chat \"{{name}}\"? This action cannot be undone.",
    zh: "确定要删除对话 \"{{name}}\" 吗？此操作不可撤销。"
  },
  deleteButton: {
    en: "Delete",
    zh: "删除"
  },
  cancelButton: {
    en: "Cancel",
    zh: "取消"
  },
  chatDeleted: {
    en: "Chat deleted",
    zh: "对话已删除"
  },
  chatNameEmpty: {
    en: "Chat name cannot be empty",
    zh: "对话名称不能为空"
  },
  chatNameExists: {
    en: "Chat with the same name already exists",
    zh: "已存在同名对话"
  },
  chatRenamed: {
    en: "Chat renamed",
    zh: "对话已重命名"
  },
  renameFailed: {
    en: "Rename failed",
    zh: "重命名失败"
  },
  showLess: {
    en: "Show Less",
    zh: "收起"
  },
  ruleModePromptGenerated: {
    en: "Used Rule mode to analyze the current context and generate a prompt.",
    zh: "已使用Rule模式分析当前上下文并生成提示。"
  },
  ruleModePromptError: {
    en: "Failed to get Rule analysis prompt, will use the original text. Error details: {{error}}",
    zh: "获取Rule分析提示失败，将使用原始文本。错误详情：{{error}}"
  },
  // 添加ChatPanel中缺失的多语言配置
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
  }
};