/**
 * 事件总线数据定义文件
 * 定义各种事件传递的数据接口
 */

/**
 * 新建对话事件数据类
 * EditorComponent.tsx 中发布 EVENTS.CHAT.NEW_CHAT 事件时使用
 */
export class NewChatEventData {
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param panelId 面板ID
   */
  constructor(panelId?: string) {
    this.panelId = panelId;
  }
} 

/**
 * 编辑器mentions变更事件数据类
 * EditorComponent.tsx 中发布 EVENTS.EDITOR.MENTIONS_CHANGED 事件时使用
 */
export class EditorMentionsEventData {
  /** mentions数据 */
  mentions: any[];
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param mentions mentions数据
   * @param panelId 面板ID
   */
  constructor(mentions: any[], panelId?: string) {
    this.mentions = mentions;
    this.panelId = panelId;
  }
}

/**
 * UI全屏切换事件数据类
 * EditorComponent.tsx 中发布 EVENTS.UI.TOGGLE_INPUT_FULLSCREEN 事件时使用
 */
export class ToggleInputFullscreenEventData {
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param panelId 面板ID
   */
  constructor(panelId?: string) {
    this.panelId = panelId;
  }
}

/**
 * 文件组选择焦点事件数据类
 * EditorComponent.tsx 中发布 EVENTS.FILE_GROUP_SELECT.FOCUS 事件时使用
 */
export class FileGroupSelectFocusEventData {
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param panelId 面板ID
   */
  constructor(panelId?: string) {
    this.panelId = panelId;
  }
}

/**
 * Step By Step 模式变更事件数据类
 * InputArea.tsx 中发布 EVENTS.AGENTIC.MODE_CHANGED 事件时使用
 */
export class AgenticModeChangedEventData {
  /** 是否启用 */
  enabled: boolean;
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param enabled 是否启用
   * @param panelId 面板ID
   */
  constructor(enabled: boolean, panelId?: string) {
    this.enabled = enabled;
    this.panelId = panelId;
  }
}

/**
 * 模式切换事件数据类
 * EditorComponent.tsx 中发布 EVENTS.UI.TOGGLE_WRITE_MODE 事件时使用
 */
export class ToggleWriteModeEventData {
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param panelId 面板ID
   */
  constructor(panelId?: string) {
    this.panelId = panelId;
  }
} 

/**
 * 热键事件数据类
 * HotkeyManager.ts 中发布热键事件时使用
 */
export class HotkeyEventData {
  /** 面板ID */
  panelId: string;
  
  /**
   * 构造函数
   * @param panelId 面板ID
   */
  constructor(panelId: string) {
    this.panelId = panelId;
  }
} 

/**
 * 文件组选择更新事件数据类
 * FileGroupSelect.tsx 中发布 EVENTS.FILE_GROUP_SELECT.SELECTION_UPDATED 事件时使用
 */
export class FileGroupSelectionUpdatedEventData {
  /** 组名列表 */
  groupNames: string[];
  /** 文件路径列表 */
  filePaths: string[];
  /** 面板ID */
  panelId?: string;
  
  /**
   * 构造函数
   * @param groupNames 组名列表
   * @param filePaths 文件路径列表
   * @param panelId 面板ID
   */
  constructor(groupNames: string[], filePaths: string[], panelId?: string) {
    this.groupNames = groupNames;
    this.filePaths = filePaths;
    this.panelId = panelId;
  }
}