import { FileMetadata } from '../../types/file_meta';

export interface FileGroup {
  id: string;
  name: string;
  files: string[];
  file_count?: number;
}

export interface CodeBlock {
  file_path: string;
  head: string;
  update: string;
  similarity: number;
}

export interface UnmergeCodeBlock {
  file_path: string;
  head: string;
  update: string;
  similarity: number;
}

export interface ConfigKey {
  key: string;
  type: string;
  description: string;
  default: any;
}

export interface ConfigState {
  human_as_model: boolean;
  extra_conf: { [key: string]: string };
  available_keys: ConfigKey[];
}

export interface CodingEvent {
  event_type: string;
  data: string;
}

export const INDEX_EVENT_TYPES = {
  BUILD_START: 'code_index_build_start',
  BUILD_END: 'code_index_build_end',
  FILTER_START: 'code_index_filter_start',
  FILTER_END: 'code_index_filter_end',
  FILTER_FILE_SELECTED: 'code_index_filter_file_selected'
} as const;

export interface EventResponse {
  request_id: string;
  event: CodingEvent;
}

export interface ResponseData {
  result: {
    value: string[] | string;
  };
  status: 'running' | 'completed' | 'failed';
}

export interface PollResult {
  text: string;
  status: 'running' | 'completed' | 'failed';
}

export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  contentType?: string;
  language?: string;
  metadata?: Record<string, any>;
  status?: 'sending' | 'sent' | 'error';
  timestamp: number;
}

export interface ChatPanelProps {
  setPreviewFiles: (files: { path: string, content: string }[]) => void;
  setActivePanel: (panel: string) => void;
  setClipboardContent: (content: string) => void;
  clipboardContent: string;
  setRequestId: (id: string) => void;
  projectName?: string;
  setSelectedFiles: (files: FileMetadata[]) => void;
  panelId?: string;
  isActive?: boolean;
}

export interface CompletionItem {
  name: string;
  path: string;
  display: string;
  location?: string;
}

export interface EnhancedCompletionItem extends CompletionItem {
  mentionType: 'file' | 'symbol';
}

export interface CompletionData {
  completions: Array<CompletionItem>;
}
