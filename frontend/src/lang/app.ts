interface Message {
  en: string;
  zh: string;
}

export const appMessages: { [key: string]: Message } = {
  // 应用主要信息
  appTitle: {
    en: "Auto-Coder",
    zh: "Auto-Coder"
  },
  currentProject: {
    en: "Current Project:",
    zh: "当前项目:"
  },
  noProjectSelected: {
    en: "No Project Selected",
    zh: "未选择项目"
  },
  projectName: {
    en: "Current Project",
    zh: "当前项目"
  },
  loadingProject: {
    en: "Loading project...",
    zh: "加载项目中..."
  },
  
  // 主要面板
  devHistory: {
    en: "Change History",
    zh: "变更历史"
  },
  fileGroups: {
    en: "File Groups",
    zh: "文件分组"
  },
  clipboard: {
    en: "Clipboard",
    zh: "剪贴板"
  },
  settings: {
    en: "Settings",
    zh: "设置"
  },
  settingsAndGroups: {
    en: "Settings & Groups",
    zh: "设置与分组"
  },
  
  // 初始化相关
  initializeProject: {
    en: "Initialize Project",
    zh: "初始化项目"
  },
  projectNeedsInitialization: {
    en: "This project needs to be initialized",
    zh: "该项目需要初始化"
  },
  initializationExplanation: {
    en: "Initialize the project to set up necessary files and configurations",
    zh: "初始化项目以设置必要的文件和配置"
  },
  initializeNow: {
    en: "Initialize Now",
    zh: "立即初始化"
  },
  configureProjectType: {
    en: "Configure Project Type",
    zh: "配置项目类型"
  },
  configureProjectTypeTitle: {
    en: "Configure Project Type",
    zh: "配置项目类型"
  },
  projectTypeExplanation: {
    en: "Project type defines file extensions AI should focus on",
    zh: "项目类型定义了AI应关注的文件扩展名"
  },
  projectTypePlaceholder: {
    en: "e.g. js,ts,jsx,tsx",
    zh: "例如：js,ts,jsx,tsx"
  },
  saveConfiguration: {
    en: "Save Configuration",
    zh: "保存配置"
  },
  failedToInitialize: {
    en: "Failed to initialize project",
    zh: "项目初始化失败"
  },
  projectConfigurationComplete: {
    en: "Project configuration complete",
    zh: "项目配置完成"
  },
  failedToConfigureProjectType: {
    en: "Failed to configure project type",
    zh: "配置项目类型失败"
  },
  
  // 语言设置
  languageSettings: {
    en: "Language",
    zh: "语言设置"
  },
  
  // 通用状态
  noActiveTask: {
    en: "No active task",
    zh: "没有活动任务"
  },
  
  // 错误处理
  errorTitle: {
    en: "Error",
    zh: "错误"
  },
  unknownError: {
    en: "Unknown error occurred",
    zh: "发生未知错误"
  },
};