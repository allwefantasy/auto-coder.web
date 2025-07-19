interface Message {
  en: string;
  zh: string;
}

export const libSelectorMessages: { [key: string]: Message } = {
  llmFriendlyPackages: {
    en: "LLM Friendly Packages",
    zh: "LLM友好包"
  },
  refreshRepository: {
    en: "Refresh repository",
    zh: "刷新库仓库"
  },
  selectLibraries: {
    en: "Select libraries",
    zh: "选择库"
  },
  searchLibraries: {
    en: "Search libraries...",
    zh: "搜索库..."
  },
  fetchLibrariesFailed: {
    en: "Failed to fetch library list",
    zh: "获取库列表失败"
  },
  repositoryRefreshSuccess: {
    en: "Repository refreshed successfully",
    zh: "仓库刷新成功"
  },
  refreshFailed: {
    en: "Refresh failed: ",
    zh: "刷新失败: "
  },
  repositoryRefreshFailed: {
    en: "Repository refresh failed",
    zh: "仓库刷新失败"
  },
  libraryAdded: {
    en: "Added: ",
    zh: "已添加: "
  },
  addFailed: {
    en: "Add failed: ",
    zh: "添加失败: "
  },
  libraryRemoved: {
    en: "Removed: ",
    zh: "已移除: "
  },
  removeFailed: {
    en: "Remove failed: ",
    zh: "移除失败: "
  }
};