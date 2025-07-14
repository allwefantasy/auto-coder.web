interface Message {
  en: string;
  zh: string;
}

export const modelManagementMessages: { [key: string]: Message } = {
  modelNameTooltip: {
    en: "Model alias used within auto-coder.",
    zh: "在 auto-coder 中使用的模型别名。"
  },
  modelTypeTooltip: {
    en: "If the desired model is not found, please add it in Provider Management.",
    zh: "如果没有找到想要的模型，请到供应商管理中添加模型。"
  },
  dialogTest: {
    en: 'Dialog Test',
    zh: '对话测试'
  },
  modelDialogTestTitle: {
    en: 'Model Dialog Test',
    zh: '模型对话测试'
  },
  noDialogMessages: {
    en: 'No messages yet',
    zh: '暂无消息'
  },
  dialogInputPlaceholder: {
    en: 'Enter your message...',
    zh: '请输入内容...'
  },
  send: {
    en: 'Send',
    zh: '发送'
  }
};