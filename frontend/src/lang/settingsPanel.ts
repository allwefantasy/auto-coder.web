interface Message {
  en: string;
  zh: string;
}

export const settingsPanelMessages: { [key: string]: Message } = {
  refreshToApplyLanguage: {
    en: "Please refresh the page to apply the new language.",
    zh: "请刷新页面以应用新语言。"
  }
};