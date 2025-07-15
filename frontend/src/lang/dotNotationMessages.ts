interface Message {
  en: string;
  zh: string;
}

export const dotNotationMessages: { [key: string]: Message } = {
  // ExpandableEditor 相关
  'expandableEditor.loading': {
    en: 'Loading...',
    zh: '加载中...'
  },

  // SimpleEditor 相关
  'simpleEditor.imageUploading': {
    en: 'Uploading Image',
    zh: '图片上传中'
  },
  'simpleEditor.imageUploadFailed': {
    en: 'Upload Failed',
    zh: '上传失败'
  },
  'simpleEditor.loading': {
    en: 'Loading...',
    zh: '加载中...'
  },
  'simpleEditor.refresh': {
    en: 'Refresh',
    zh: '刷新'
  },
  'simpleEditor.messages': {
    en: 'messages',
    zh: '条消息'
  },
  'simpleEditor.recoverable': {
    en: 'Recoverable',
    zh: '可恢复'
  },
  'simpleEditor.loadingHistory': {
    en: 'Loading history...',
    zh: '加载历史中...'
  },
  'simpleEditor.noHistory': {
    en: 'No task history',
    zh: '暂无任务历史'
  },
  'simpleEditor.noLocalHistory': {
    en: 'No command history',
    zh: '暂无命令历史'
  },
  'simpleEditor.expandEditor': {
    en: 'Expand Editor',
    zh: '展开编辑器'
  },
  'simpleEditor.cancelTaskConfirm': {
    en: 'Are you sure you want to cancel this task?',
    zh: '确定要取消这个任务吗？'
  },
  'simpleEditor.cancellingTask': {
    en: 'Cancelling...',
    zh: '取消中...'
  },
  'simpleEditor.cancelTask': {
    en: 'Cancel Task',
    zh: '取消任务'
  },
  'simpleEditor.clearHistoryConfirm': {
    en: 'Are you sure you want to clear command history?',
    zh: '确定要清除命令历史吗？'
  },
  'simpleEditor.clearHistory': {
    en: 'Clear',
    zh: '清除'
  },
  'simpleEditor.history.commands': {
    en: 'Command History',
    zh: '命令历史'
  },
  'simpleEditor.history.tasks': {
    en: 'Task History',
    zh: '任务历史'
  },
  'simpleEditor.history.recent': {
    en: 'Recent Commands',
    zh: '最近命令'
  },
  'simpleEditor.status.completed': {
    en: 'Completed',
    zh: '已完成'
  },
  'simpleEditor.status.error': {
    en: 'Error',
    zh: '错误'
  },

  // MonacoEditor 相关
  'monacoEditor.loading': {
    en: 'Loading Monaco Editor...',
    zh: '加载Monaco编辑器中...'
  },
  'monacoEditor.languageSupportLoaded': {
    en: 'Language support loaded',
    zh: '语言支持已加载'
  },
  'monacoEditor.languageSupportFailed': {
    en: 'Failed to load language support for {{language}}',
    zh: '加载 {{language}} 语言支持失败'
  },
  'monacoEditor.errorLoadingLanguage': {
    en: 'Error loading language support',
    zh: '加载语言支持时出错'
  },

  // CodePreview 相关
  'codePreview.btn.code': {
    en: 'Code',
    zh: '代码'
  },
  'codePreview.btn.preview': {
    en: 'Preview',
    zh: '预览'
  },
  'codePreview.fileTree.src': {
    en: 'src',
    zh: 'src'
  },
  'codePreview.fileTree.indexTsx': {
    en: 'index.tsx',
    zh: 'index.tsx'
  },
  'codePreview.fileTree.appTsx': {
    en: 'App.tsx',
    zh: 'App.tsx'
  },
  'codePreview.placeholder': {
    en: 'Select a file from the tree to view its content',
    zh: '从文件树中选择文件以查看其内容'
  },

  // FileGroup 相关 (补充完整的点分隔格式)
  'fileGroup.title': {
    en: 'File Groups',
    zh: '文件组'
  },
  'fileGroup.createSuccess': {
    en: 'Group created successfully',
    zh: '分组创建成功'
  },
  'fileGroup.createFailed': {
    en: 'Failed to create group',
    zh: '创建分组失败'
  },
  'fileGroup.deleteSuccess': {
    en: 'Group deleted successfully',
    zh: '分组删除成功'
  },
  'fileGroup.deleteFailed': {
    en: 'Failed to delete group',
    zh: '删除分组失败'
  },
  'fileGroup.addFilesSuccess': {
    en: 'Files added successfully',
    zh: '文件添加成功'
  },
  'fileGroup.addFilesFailed': {
    en: 'Failed to add files',
    zh: '添加文件失败'
  },
  'fileGroup.removeSuccess': {
    en: 'File removed successfully',
    zh: '文件移除成功'
  },
  'fileGroup.removeFailed': {
    en: 'Failed to remove file',
    zh: '移除文件失败'
  },
  'fileGroup.loadFailed': {
    en: 'Failed to load file content',
    zh: '加载文件内容失败'
  },
  'fileGroup.noGroups': {
    en: 'No groups available',
    zh: '暂无分组'
  },
  'fileGroup.selectFile': {
    en: 'Select a file to preview',
    zh: '选择文件以预览'
  },
  'fileGroup.createNewGroup': {
    en: 'Create New Group',
    zh: '创建新分组'
  },
  'fileGroup.groupName': {
    en: 'Group Name',
    zh: '分组名称'
  },
  'fileGroup.groupNamePlaceholder': {
    en: 'Enter group name',
    zh: '请输入分组名称'
  },
  'fileGroup.description': {
    en: 'Description',
    zh: '描述'
  },
  'fileGroup.descriptionPlaceholder': {
    en: 'Enter group description',
    zh: '请输入分组描述'
  },
  'fileGroup.addExternalFile': {
    en: 'Add External File',
    zh: '添加外部文件'
  },
  'fileGroup.externalFilePath': {
    en: 'File Path or URL',
    zh: '文件路径或URL'
  },
  'fileGroup.externalFilePathPlaceholder': {
    en: 'Enter file path or HTTP(S) URL',
    zh: '输入文件路径或HTTP(S) URL'
  },
  'fileGroup.externalFileSuccess': {
    en: 'External file added successfully',
    zh: '外部文件添加成功'
  },
  'fileGroup.externalFileFailed': {
    en: 'Failed to add external file',
    zh: '添加外部文件失败'
  },
  'fileGroup.unexpectedResponse': {
    en: 'Unexpected response format',
    zh: '意外的响应格式'
  },

  // 通用动作 (从搜索结果中提取的 common.xxx 格式)
  'common.group': {
    en: 'Group',
    zh: '分组'
  },
  'common.action': {
    en: 'Action',
    zh: '操作'
  },

  // 开发调试相关 (dev.xxx 格式)
  'dev.simpleEditor.loadCommandHistory': {
    en: 'Error loading command history',
    zh: '加载命令历史出错'
  },
  'dev.simpleEditor.loadTaskHistory': {
    en: 'Error loading task history',
    zh: '加载任务历史出错'
  },
  'dev.monacoEditor.attemptingLoad': {
    en: 'Attempting to load language support for',
    zh: '尝试加载语言支持：'
  },
  'dev.monacoEditor.languageSupported': {
    en: 'Language {{language}} is already supported',
    zh: '语言 {{language}} 已经支持'
  },
  'dev.monacoEditor.explicitlySet': {
    en: 'Explicitly set model language to',
    zh: '显式设置模型语言为'
  },
  'dev.monacoEditor.willMount': {
    en: 'Monaco editor will mount',
    zh: 'Monaco编辑器即将挂载'
  },
  'dev.monacoEditor.didMount': {
    en: 'Monaco editor did mount',
    zh: 'Monaco编辑器已挂载'
  }
};
