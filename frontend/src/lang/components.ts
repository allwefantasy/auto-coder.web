interface Message {
  en: string;
  zh: string;
}

export const componentsMessages: { [key: string]: Message } = {
  // 通用组件消息
  loading: {
    en: "Loading...",
    zh: "加载中..."
  },
  error: {
    en: "Error",
    zh: "错误"
  },
  success: {
    en: "Success",
    zh: "成功"
  },
  warning: {
    en: "Warning",
    zh: "警告"
  },
  info: {
    en: "Information",
    zh: "信息"
  },
  confirm: {
    en: "Confirm",
    zh: "确认"
  },
  cancel: {
    en: "Cancel",
    zh: "取消"
  },
  ok: {
    en: "OK",
    zh: "确定"
  },
  yes: {
    en: "Yes",
    zh: "是"
  },
  no: {
    en: "No",
    zh: "否"
  },
  save: {
    en: "Save",
    zh: "保存"
  },
  edit: {
    en: "Edit",
    zh: "编辑"
  },
  delete: {
    en: "Delete",
    zh: "删除"
  },
  add: {
    en: "Add",
    zh: "添加"
  },
  remove: {
    en: "Remove",
    zh: "移除"
  },
  close: {
    en: "Close",
    zh: "关闭"
  },
  open: {
    en: "Open",
    zh: "打开"
  },
  refresh: {
    en: "Refresh",
    zh: "刷新"
  },
  reset: {
    en: "Reset",
    zh: "重置"
  },
  clear: {
    en: "Clear",
    zh: "清除"
  },
  search: {
    en: "Search",
    zh: "搜索"
  },
  filter: {
    en: "Filter",
    zh: "过滤"
  },
  sort: {
    en: "Sort",
    zh: "排序"
  },
  upload: {
    en: "Upload",
    zh: "上传"
  },
  download: {
    en: "Download",
    zh: "下载"
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
  next: {
    en: "Next",
    zh: "下一个"
  },
  previous: {
    en: "Previous",
    zh: "上一个"
  },
  back: {
    en: "Back",
    zh: "返回"
  },
  forward: {
    en: "Forward",
    zh: "前进"
  },
  home: {
    en: "Home",
    zh: "首页"
  },
  settings: {
    en: "Settings",
    zh: "设置"
  },
  help: {
    en: "Help",
    zh: "帮助"
  },
  about: {
    en: "About",
    zh: "关于"
  },
  version: {
    en: "Version",
    zh: "版本"
  },
  update: {
    en: "Update",
    zh: "更新"
  },
  upgrade: {
    en: "Upgrade",
    zh: "升级"
  },
  
  // 表单组件
  required: {
    en: "Required",
    zh: "必填"
  },
  optional: {
    en: "Optional",
    zh: "可选"
  },
  placeholder: {
    en: "Please enter...",
    zh: "请输入..."
  },
  selectPlaceholder: {
    en: "Please select...",
    zh: "请选择..."
  },
  noData: {
    en: "No data",
    zh: "暂无数据"
  },
  noResults: {
    en: "No results found",
    zh: "未找到结果"
  },
  
  // 分页组件
  page: {
    en: "Page",
    zh: "页"
  },
  total: {
    en: "Total",
    zh: "共"
  },
  items: {
    en: "items",
    zh: "条"
  },
  goToPage: {
    en: "Go to page",
    zh: "跳转到"
  },
  
  // 时间相关
  today: {
    en: "Today",
    zh: "今天"
  },
  yesterday: {
    en: "Yesterday",
    zh: "昨天"
  },
  tomorrow: {
    en: "Tomorrow",
    zh: "明天"
  },
  thisWeek: {
    en: "This week",
    zh: "本周"
  },
  thisMonth: {
    en: "This month",
    zh: "本月"
  },
  thisYear: {
    en: "This year",
    zh: "今年"
  },
  
  // 状态相关
  enabled: {
    en: "Enabled",
    zh: "已启用"
  },
  disabled: {
    en: "Disabled",
    zh: "已禁用"
  },
  active: {
    en: "Active",
    zh: "激活"
  },
  inactive: {
    en: "Inactive",
    zh: "未激活"
  },
  online: {
    en: "Online",
    zh: "在线"
  },
  offline: {
    en: "Offline",
    zh: "离线"
  },
  connected: {
    en: "Connected",
    zh: "已连接"
  },
  disconnected: {
    en: "Disconnected",
    zh: "已断开"
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
  fileName: {
    en: "File name",
    zh: "文件名"
  },
  fileSize: {
    en: "File size",
    zh: "文件大小"
  },
  fileType: {
    en: "File type",
    zh: "文件类型"
  },
  createFile: {
    en: "Create file",
    zh: "创建文件"
  },
  createFolder: {
    en: "Create folder",
    zh: "创建文件夹"
  },
  renameFile: {
    en: "Rename file",
    zh: "重命名文件"
  },
  moveFile: {
    en: "Move file",
    zh: "移动文件"
  },
  copyFile: {
    en: "Copy file",
    zh: "复制文件"
  },
  deleteFile: {
    en: "Delete file",
    zh: "删除文件"
  },
  
  // 网络状态
  connectionError: {
    en: "Connection error",
    zh: "连接错误"
  },
  networkError: {
    en: "Network error",
    zh: "网络错误"
  },
  serverError: {
    en: "Server error",
    zh: "服务器错误"
  },
  timeout: {
    en: "Request timeout",
    zh: "请求超时"
  },
  retry: {
    en: "Retry",
    zh: "重试"
  },
  
  // 权限相关
  permission: {
    en: "Permission",
    zh: "权限"
  },
  accessDenied: {
    en: "Access denied",
    zh: "访问被拒绝"
  },
  unauthorized: {
    en: "Unauthorized",
    zh: "未授权"
  },
  forbidden: {
    en: "Forbidden",
    zh: "禁止访问"
  },
  
  // 操作结果
  operationSuccess: {
    en: "Operation completed successfully",
    zh: "操作成功完成"
  },
  operationFailed: {
    en: "Operation failed",
    zh: "操作失败"
  },
  operationCancelled: {
    en: "Operation cancelled",
    zh: "操作已取消"
  },
  
  // 验证消息
  invalidInput: {
    en: "Invalid input",
    zh: "输入无效"
  },
  invalidFormat: {
    en: "Invalid format",
    zh: "格式无效"
  },
  invalidEmail: {
    en: "Invalid email address",
    zh: "邮箱地址无效"
  },
  invalidUrl: {
    en: "Invalid URL",
    zh: "URL无效"
  },
  passwordTooShort: {
    en: "Password too short",
    zh: "密码过短"
  },
  passwordMismatch: {
    en: "Passwords do not match",
    zh: "密码不匹配"
  },
  
  // 模态框和对话框
  modal: {
    en: "Modal",
    zh: "模态框"
  },
  dialog: {
    en: "Dialog",
    zh: "对话框"
  },
  tooltip: {
    en: "Tooltip",
    zh: "提示"
  },
  popover: {
    en: "Popover",
    zh: "弹出框"
  },
  dropdown: {
    en: "Dropdown",
    zh: "下拉菜单"
  },
  
  // 导航相关
  menu: {
    en: "Menu",
    zh: "菜单"
  },
  navigation: {
    en: "Navigation",
    zh: "导航"
  },
  breadcrumb: {
    en: "Breadcrumb",
    zh: "面包屑"
  },
  tab: {
    en: "Tab",
    zh: "标签页"
  },
  
  // 数据展示
  table: {
    en: "Table",
    zh: "表格"
  },
  list: {
    en: "List",
    zh: "列表"
  },
  grid: {
    en: "Grid",
    zh: "网格"
  },
  card: {
    en: "Card",
    zh: "卡片"
  },
  
  // 输入组件
  input: {
    en: "Input",
    zh: "输入框"
  },
  textarea: {
    en: "Textarea",
    zh: "文本域"
  },
  select: {
    en: "Select",
    zh: "选择器"
  },
  checkbox: {
    en: "Checkbox",
    zh: "复选框"
  },
  radio: {
    en: "Radio",
    zh: "单选框"
  },
  switch: {
    en: "Switch",
    zh: "开关"
  },
  slider: {
    en: "Slider",
    zh: "滑块"
  },
  
  // 反馈组件
  alert: {
    en: "Alert",
    zh: "警告"
  },
  notification: {
    en: "Notification",
    zh: "通知"
  },
  message: {
    en: "Message",
    zh: "消息"
  },
  toast: {
    en: "Toast",
    zh: "提示"
  },
  
  // 布局组件
  layout: {
    en: "Layout",
    zh: "布局"
  },
  container: {
    en: "Container",
    zh: "容器"
  },
  header: {
    en: "Header",
    zh: "头部"
  },
  footer: {
    en: "Footer",
    zh: "底部"
  },
  sidebar: {
    en: "Sidebar",
    zh: "侧边栏"
  },
  content: {
    en: "Content",
    zh: "内容"
  },
  
  // 进度和加载
  progress: {
    en: "Progress",
    zh: "进度"
  },
  progressBar: {
    en: "Progress Bar",
    zh: "进度条"
  },
  spinner: {
    en: "Spinner",
    zh: "加载器"
  },
  skeleton: {
    en: "Skeleton",
    zh: "骨架屏"
  },
  
  // 其他常用组件
  badge: {
    en: "Badge",
    zh: "徽章"
  },
  tag: {
    en: "Tag",
    zh: "标签"
  },
  avatar: {
    en: "Avatar",
    zh: "头像"
  },
  icon: {
    en: "Icon",
    zh: "图标"
  },
  image: {
    en: "Image",
    zh: "图片"
  },
  video: {
    en: "Video",
    zh: "视频"
  },
  audio: {
    en: "Audio",
    zh: "音频"
  },
  
  // FileGroupDetail 相关消息
  'fileGroupDetail.selectGroup': {
    en: "Select a group to view details",
    zh: "选择一个分组查看详情"
  },
  'fileGroupDetail.editDescription': {
    en: "Edit Description",
    zh: "编辑描述"
  },
  'fileGroupDetail.saveDescription': {
    en: "Save Description",
    zh: "保存描述"
  },
  'fileGroupDetail.noDescription': {
    en: "No description",
    zh: "暂无描述"
  },
  'fileGroupDetail.files': {
    en: "Files",
    zh: "文件"
  },
  'fileGroupDetail.addExternalFile': {
    en: "Add External File",
    zh: "添加外部文件"
  },
  'fileGroupDetail.noFiles': {
    en: "No files added yet",
    zh: "暂未添加文件"
  },
  'fileGroupDetail.noFilesInGroup': {
    en: "No files in this group",
    zh: "此分组中没有文件"
  },
  'fileGroupDetail.descriptionUpdated': {
    en: "Description updated successfully",
    zh: "描述更新成功"
  },
  'fileGroupDetail.descriptionUpdateFailed': {
    en: "Failed to update description",
    zh: "描述更新失败"
  }
};
