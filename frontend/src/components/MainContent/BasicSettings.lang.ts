interface Message {
  en: string;
  zh: string;
}

export const basicSettingsMessages: { [key: string]: Message } = {
  enableAgenticAutoApprove: {
    en: "Auto Approve Shell Commands",
    zh: "自动同意执行Shell命令"
  },
  enableAgenticAutoApproveDescription: {
    en: "Automatically approve shell command execution without manual confirmation. Enable with caution as this allows automatic execution of system commands.",
    zh: "自动同意执行shell命令，无需手动确认。请谨慎启用，因为这允许自动执行系统命令。"
  },
}; 