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
  enableAgenticDangerousCommandCheck: {
    en: "Enable Dangerous Command Check(Recommended)",
    zh: "启用危险命令检查(推荐开启)"
  },
  enableAgenticDangerousCommandCheckDescription: {
    en: "When enabled, the system will check for potentially dangerous commands before auto-approval and require manual confirmation for risky operations.",
    zh: "启用后，系统会在自动批准前检查潜在的危险命令，对于风险操作需要手动确认。"
  },
}; 