interface Message {
  en: string;
  zh: string;
}

export const fileTreeMessages: { [key: string]: Message } = {
  // 文件树操作
  projectFiles: {
    en: "Project Files",
    zh: "项目文件"
  },
  toCompactFolders: {
    en: "To Compact Folders",
    zh: "折叠目录"
  },
  newFile: {
    en: "New File",
    zh: "新建文件"
  },
  newDirectory: {
    en: "New Directory",
    zh: "新建目录"
  },
  createNewFile: {
    en: "Create new file",
    zh: "创建新文件"
  },
  createNewDirectory: {
    en: "Create new directory",
    zh: "创建新目录"
  },
  refreshFileTree: {
    en: "Refresh file tree",
    zh: "刷新文件树"
  },
  searchFiles: {
    en: "Search files...",
    zh: "搜索文件..."
  },
  expandAll: {
    en: "Expand All",
    zh: "展开全部"
  },
  collapseAll: {
    en: "Collapse All",
    zh: "收起全部"
  },
  
  // 删除相关
  deleteSuccess: {
    en: "Successfully deleted {{name}}",
    zh: "成功删除 {{name}}"
  },
  deleteFailed: {
    en: "Failed to delete file",
    zh: "删除文件失败"
  },
  deleteConfirmation: {
    en: "Confirm Delete",
    zh: "确认删除"
  },
  deleteConfirmText: {
    en: "Are you sure you want to delete {{name}}?",
    zh: "确定要删除 {{name}} 吗？"
  },
  yes: {
    en: "Yes",
    zh: "是"
  },
  no: {
    en: "No",
    zh: "否"
  },
  delete: {
    en: "Delete",
    zh: "删除"
  },
  
  // 创建相关
  createSuccess: {
    en: "Successfully created {{name}}",
    zh: "成功创建 {{name}}"
  },
  createFailed: {
    en: "Failed to create {{type}}",
    zh: "创建{{type}}失败"
  },
  createDirSuccess: {
    en: "Successfully created directory {{name}}",
    zh: "成功创建目录 {{name}}"
  },
  createDirFailed: {
    en: "Failed to create directory",
    zh: "创建目录失败"
  },
  createFileIn: {
    en: "Create file in {{path}}",
    zh: "在 {{path}} 中创建文件"
  },
  createFileInRoot: {
    en: "Create file in root",
    zh: "在根目录创建文件"
  },
  createDirIn: {
    en: "Create directory in {{path}}",
    zh: "在 {{path}} 中创建目录"
  },
  createDirInRoot: {
    en: "Create directory in root",
    zh: "在根目录创建目录"
  },
  fileName: {
    en: "File Name",
    zh: "文件名"
  },
  fileNameHelp: {
    en: "Enter the name for the new file",
    zh: "输入新文件的名称"
  },
  fileNamePlaceholder: {
    en: "e.g. index.js",
    zh: "例如：index.js"
  },
  directoryName: {
    en: "Directory Name",
    zh: "目录名"
  },
  directoryNameHelp: {
    en: "Enter the name for the new directory",
    zh: "输入新目录的名称"
  },
  directoryNamePlaceholder: {
    en: "e.g. components",
    zh: "例如：components"
  },
  
  // 刷新相关
  refresh: {
    en: "Refresh",
    zh: "刷新"
  },
  refreshSuccess: {
    en: "File tree refreshed successfully",
    zh: "文件树刷新成功"
  },
  refreshFailed: {
    en: "Failed to refresh file tree",
    zh: "刷新文件树失败"
  },
  
  // 文件信息
  fileInfo: {
    en: "File Info",
    zh: "文件信息"
  },
  pathInfo: {
    en: "Path: {{path}}",
    zh: "路径：{{path}}"
  },
  copyPath: {
    en: "Copy Path",
    zh: "复制路径"
  },
  pathCopied: {
    en: "Path copied to clipboard",
    zh: "路径已复制到剪贴板"
  },
  
  // 空状态
  noFiles: {
    en: "No files found",
    zh: "未找到文件"
  },
  noMatching: {
    en: "No matching files",
    zh: "没有匹配的文件"
  },
};