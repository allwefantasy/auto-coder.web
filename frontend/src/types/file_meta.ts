export interface FileMetadata {
  path: string;
  language?: string;
  isReadOnly?: boolean;
  isPreview?: boolean;
  content?: string;
  new_content?: string;
  isSelected?: boolean;
  // expert_chat_box | human
  modifiedBy?: string;
  label?: string;
} 