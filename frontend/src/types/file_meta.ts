export interface FileMetadata {
  path: string;
  language?: string;
  isReadOnly?: boolean;
  isPreview?: boolean;
  content?: string;
  new_content?: string;
  isSelected?: boolean;
} 