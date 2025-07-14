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
    zh: "紧凑文件夹"
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
};