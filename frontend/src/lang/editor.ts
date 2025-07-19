interface Message {
  en: string;
  zh: string;
}

export const editorMessages: { [key: string]: Message } = {
  // 代码编辑器
  codeViewer: {
    en: "View Code",
    zh: "查看代码"
  },
  
  // 预览
  previewChanges: {
    en: "Preview Changes",
    zh: "预览更改"
  },
  previewChangesStatic: {
    en: "Preview",
    zh: "预览"
  },
  previewChangesEditable: {
    en: "Preview (Editable)",
    zh: "预览(可编辑)"
  },
  
  // 差异视图
  diffView: {
    en: "Diff View",
    zh: "差异视图"
  },
  splitView: {
    en: "Split View",
    zh: "三列视图"
  },
  unifiedView: {
    en: "Unified View",
    zh: "单列视图"
  },
  beforeChange: {
    en: "Before Changes",
    zh: "变更前"
  },
  afterChange: {
    en: "After Changes", 
    zh: "变更后"
  },
  noChangesDetected: {
    en: "No changes detected",
    zh: "没有检测到修改"
  },
  
  // 文件状态
  newFile: {
    en: "New File",
    zh: "新增文件"
  },
  fileDeleted: {
    en: "File Deleted",
    zh: "已删除文件"
  },
  
  // 提交相关
  commitHistory: {
    en: "Commit History",
    zh: "提交历史"
  },
  currentChange: {
    en: "Current Change",
    zh: "当前变化"
  },
  currentChangeTitle: {
    en: "Current Change Details",
    zh: "当前变化详情"
  },
  files: {
    en: "Files",
    zh: "文件列表"
  },
  codeChangesCommitted: {
    en: "Code Changes Committed",
    zh: "代码变更已提交"
  },
  commitId: {
    en: "Commit ID",
    zh: "提交ID"
  },
  modifiedFiles: {
    en: "Modified Files",
    zh: "修改的文件数"
  },
  manualChangesCommited: {
    en: "Commit User Manual Changes",
    zh: "提交用户手动修改的变更"
  },
  cleanDirectoryMessage: {
    en: "Your directory is clean. No additional actions required.",
    zh: "您的目录已经是干净的，无需额外操作。"
  },
  clickToFilterHistory: {
    en: "Click to filter history by this commit",
    zh: "点击按此提交过滤历史记录"
  },
  copyFullCommitId: {
    en: "Copy full commit ID",
    zh: "复制完整提交ID"
  },
  commitIdCopied: {
    en: "Commit ID copied to clipboard",
    zh: "Commit ID已复制到剪贴板"
  },
  failedToCopyCommitId: {
    en: "Failed to copy commit ID",
    zh: "复制提交ID失败"
  },
  
  // 面板控制
  maximizePanel: {
    en: "Maximize Panel",
    zh: "最大化面板"
  },
  restorePanel: {
    en: "Restore Panel",
    zh: "恢复面板"
  },
  expandConfig: {
    en: "Expand",
    zh: "展开"
  },
  collapseConfig: {
    en: "Collapse",
    zh: "折叠"
  },
};