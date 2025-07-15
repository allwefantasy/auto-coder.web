interface Message {
  en: string;
  zh: string;
}

export const terminalMessages: { [key: string]: Message } = {
  // 终端相关
  terminal: {
    en: "Terminal",
    zh: "终端"
  },
  output: {
    en: "Output",
    zh: "输出"
  },
  clearOutput: {
    en: "Clear Output",
    zh: "清除输出"
  },
  runCommand: {
    en: "Run Command",
    zh: "运行命令"
  },
};