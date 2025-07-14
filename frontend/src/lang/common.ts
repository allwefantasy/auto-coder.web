interface Message {
  en: string;
  zh: string;
}

export const commonMessages: { [key: string]: Message } = {
  // 通用操作
  save: {
    en: "Save",
    zh: "保存"
  },
  cancel: {
    en: "Cancel",
    zh: "取消"
  },
  confirm: {
    en: "Confirm",
    zh: "确认"
  },
  close: {
    en: "Close",
    zh: "关闭"
  },
  delete: {
    en: "Delete",
    zh: "删除"
  },
  edit: {
    en: "Edit",
    zh: "编辑"
  },
  add: {
    en: "Add",
    zh: "添加"
  },
  remove: {
    en: "Remove",
    zh: "移除"
  },
  refresh: {
    en: "Refresh",
    zh: "刷新"
  },
  search: {
    en: "Search",
    zh: "搜索"
  },
  loading: {
    en: "Loading...",
    zh: "加载中..."
  },
  submit: {
    en: "Submit",
    zh: "提交"
  },
  send: {
    en: "Send",
    zh: "发送"
  },
  copy: {
    en: "Copy",
    zh: "复制"
  },
  paste: {
    en: "Paste",
    zh: "粘贴"
  },
  cut: {
    en: "Cut",
    zh: "剪切"
  },
  undo: {
    en: "Undo",
    zh: "撤销"
  },
  redo: {
    en: "Redo",
    zh: "重做"
  },
  yes: {
    en: "Yes",
    zh: "是"
  },
  no: {
    en: "No",
    zh: "否"
  },
  ok: {
    en: "OK",
    zh: "确定"
  },
  enable: {
    en: "Enable",
    zh: "启用"
  },
  disable: {
    en: "Disable",
    zh: "禁用"
  },
  
  // 状态相关
  success: {
    en: "Success",
    zh: "成功"
  },
  error: {
    en: "Error",
    zh: "错误"
  },
  warning: {
    en: "Warning",
    zh: "警告"
  },
  info: {
    en: "Info",
    zh: "信息"
  },
  
  // 文件操作
  file: {
    en: "File",
    zh: "文件"
  },
  folder: {
    en: "Folder",
    zh: "文件夹"
  },
  directory: {
    en: "Directory",
    zh: "目录"
  },
  path: {
    en: "Path",
    zh: "路径"
  },
  
  // 时间相关
  date: {
    en: "Date",
    zh: "日期"
  },
  time: {
    en: "Time",
    zh: "时间"
  },
  
  // 数据相关
  name: {
    en: "Name",
    zh: "名称"
  },
  description: {
    en: "Description",
    zh: "描述"
  },
  title: {
    en: "Title",
    zh: "标题"
  },
  content: {
    en: "Content",
    zh: "内容"
  },
  type: {
    en: "Type",
    zh: "类型"
  },
  status: {
    en: "Status",
    zh: "状态"
  },
  size: {
    en: "Size",
    zh: "大小"
  },
  
  // 网络相关
  url: {
    en: "URL",
    zh: "网址"
  },
  apiKey: {
    en: "API Key",
    zh: "API密钥"
  },
  baseUrl: {
    en: "Base URL",
    zh: "基础URL"
  },
  
  // 处理状态
  processing: {
    en: "Processing...",
    zh: "处理中..."
  },
  completed: {
    en: "Completed",
    zh: "已完成"
  },
  failed: {
    en: "Failed",
    zh: "失败"
  },
  pending: {
    en: "Pending",
    zh: "待处理"
  },
  
  // 通用错误消息
  processingError: {
    en: "Sorry, there was an error processing your request. Please try again.",
    zh: "抱歉，处理您的请求时出错，请重试。"
  },
  networkError: {
    en: "Network error, please check your connection",
    zh: "网络错误，请检查您的连接"
  },
  unknownError: {
    en: "Unknown error occurred",
    zh: "发生未知错误"
  },
};