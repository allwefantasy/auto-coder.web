interface Message {
  en: string;
  zh: string;
}

export const codeEditorMessages: { [key: string]: Message } = {
  'codeEditor.copyPath': {
    en: 'Copy Path',
    zh: '复制路径',
  },
  'codeEditor.closeOtherTabs': {
    en: 'Close Other Tabs',
    zh: '关闭其他标签页',
  },
  'codeEditor.refresh': {
    en: 'Refresh',
    zh: '刷新',
  },
  'codeEditor.refreshSuccess': {
    en: 'Refreshed {{fileName}}',
    zh: '已刷新 {{fileName}}',
  },
  'codeEditor.save': {
    en: 'Save',
    zh: '保存',
  },
  'codeEditor.saveSuccess': {
    en: 'File saved successfully',
    zh: '文件保存成功',
  },
  'codeEditor.saveFailed': {
    en: 'Failed to save file',
    zh: '保存文件失败',
  },
  'codeEditor.noFileSelected': {
    en: 'No file selected',
    zh: '未选择文件',
  },
  'codeEditor.copyPathSuccess': {
    en: 'File path copied to clipboard',
    zh: '文件路径已复制到剪贴板',
  },
  'codeEditor.copyPathFailed': {
    en: 'Failed to copy file path',
    zh: '复制文件路径失败',
  },
  'codeEditor.loadFailed': {
    en: 'Failed to load {filePath}',
    zh: '加载文件 {filePath} 失败',
  },
};