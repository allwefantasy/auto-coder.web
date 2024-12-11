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
};

// 当前语言设置
let currentLanguage: 'en' | 'zh' = 'zh';

// 设置语言
export const setLanguage = (lang: 'en' | 'zh') => {
  currentLanguage = lang;
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
