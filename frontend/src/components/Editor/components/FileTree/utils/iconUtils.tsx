import React from 'react';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  FileTextOutlined,
  CodeOutlined,
  Html5Outlined,
  DatabaseOutlined,
  SettingOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileZipOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
} from '@ant-design/icons';

export interface FileIconMapping {
  [key: string]: React.ReactNode;
}

// Default file type icons
export const defaultFileIcons: FileIconMapping = {
  // Programming languages
  'js': <CodeOutlined style={{ color: '#f7df1e' }} />,
  'jsx': <CodeOutlined style={{ color: '#61dafb' }} />,
  'ts': <CodeOutlined style={{ color: '#3178c6' }} />,
  'tsx': <CodeOutlined style={{ color: '#61dafb' }} />,
  'py': <CodeOutlined style={{ color: '#3776ab' }} />,
  'java': <CodeOutlined style={{ color: '#ed8b00' }} />,
  'cpp': <CodeOutlined style={{ color: '#00599c' }} />,
  'c': <CodeOutlined style={{ color: '#a8b9cc' }} />,
  'cs': <CodeOutlined style={{ color: '#239120' }} />,
  'php': <CodeOutlined style={{ color: '#777bb4' }} />,
  'rb': <CodeOutlined style={{ color: '#cc342d' }} />,
  'go': <CodeOutlined style={{ color: '#00add8' }} />,
  'rs': <CodeOutlined style={{ color: '#000000' }} />,
  'swift': <CodeOutlined style={{ color: '#fa7343' }} />,
  'kt': <CodeOutlined style={{ color: '#7f52ff' }} />,
  
  // Web technologies
  'html': <Html5Outlined style={{ color: '#e34c26' }} />,
  'htm': <Html5Outlined style={{ color: '#e34c26' }} />,
  'css': <CodeOutlined style={{ color: '#1572b6' }} />,
  'scss': <CodeOutlined style={{ color: '#cf649a' }} />,
  'sass': <CodeOutlined style={{ color: '#cf649a' }} />,
  'less': <CodeOutlined style={{ color: '#1d365d' }} />,
  
  // Data formats
  'json': <CodeOutlined style={{ color: '#ffd700' }} />,
  'xml': <CodeOutlined style={{ color: '#ff6600' }} />,
  'yaml': <CodeOutlined style={{ color: '#cb171e' }} />,
  'yml': <CodeOutlined style={{ color: '#cb171e' }} />,
  'sql': <DatabaseOutlined style={{ color: '#336791' }} />,
  
  // Documentation
  'md': <FileTextOutlined style={{ color: '#083fa1' }} />,
  'txt': <FileTextOutlined style={{ color: '#666' }} />,
  'pdf': <FilePdfOutlined style={{ color: '#ff0000' }} />,
  'doc': <FileWordOutlined style={{ color: '#2b579a' }} />,
  'docx': <FileWordOutlined style={{ color: '#2b579a' }} />,
  'xls': <FileExcelOutlined style={{ color: '#217346' }} />,
  'xlsx': <FileExcelOutlined style={{ color: '#217346' }} />,
  'ppt': <FilePptOutlined style={{ color: '#d24726' }} />,
  'pptx': <FilePptOutlined style={{ color: '#d24726' }} />,
  
  // Images
  'png': <PictureOutlined style={{ color: '#ff69b4' }} />,
  'jpg': <PictureOutlined style={{ color: '#ff69b4' }} />,
  'jpeg': <PictureOutlined style={{ color: '#ff69b4' }} />,
  'gif': <PictureOutlined style={{ color: '#ff69b4' }} />,
  'svg': <PictureOutlined style={{ color: '#ff9500' }} />,
  'webp': <PictureOutlined style={{ color: '#ff69b4' }} />,
  'ico': <PictureOutlined style={{ color: '#ff69b4' }} />,
  
  // Videos
  'mp4': <VideoCameraOutlined style={{ color: '#ff6b6b' }} />,
  'avi': <VideoCameraOutlined style={{ color: '#ff6b6b' }} />,
  'mov': <VideoCameraOutlined style={{ color: '#ff6b6b' }} />,
  'wmv': <VideoCameraOutlined style={{ color: '#ff6b6b' }} />,
  'flv': <VideoCameraOutlined style={{ color: '#ff6b6b' }} />,
  
  // Audio
  'mp3': <AudioOutlined style={{ color: '#4ecdc4' }} />,
  'wav': <AudioOutlined style={{ color: '#4ecdc4' }} />,
  'flac': <AudioOutlined style={{ color: '#4ecdc4' }} />,
  'aac': <AudioOutlined style={{ color: '#4ecdc4' }} />,
  
  // Archives
  'zip': <FileZipOutlined style={{ color: '#ffd700' }} />,
  'rar': <FileZipOutlined style={{ color: '#ffd700' }} />,
  '7z': <FileZipOutlined style={{ color: '#ffd700' }} />,
  'tar': <FileZipOutlined style={{ color: '#ffd700' }} />,
  'gz': <FileZipOutlined style={{ color: '#ffd700' }} />,
  
  // Configuration
  'config': <SettingOutlined style={{ color: '#666' }} />,
  'conf': <SettingOutlined style={{ color: '#666' }} />,
  'ini': <SettingOutlined style={{ color: '#666' }} />,
  'env': <SettingOutlined style={{ color: '#666' }} />,
  'properties': <SettingOutlined style={{ color: '#666' }} />,
};

// Default folder icons
export const defaultFolderIcons = {
  closed: <FolderOutlined style={{ color: '#dcb67a' }} />,
  open: <FolderOpenOutlined style={{ color: '#dcb67a' }} />,
};

// Special folder icons for common directory names
export const specialFolderIcons: FileIconMapping = {
  'src': <FolderOutlined style={{ color: '#90cdf4' }} />,
  'public': <FolderOutlined style={{ color: '#68d391' }} />,
  'assets': <FolderOutlined style={{ color: '#f6ad55' }} />,
  'components': <FolderOutlined style={{ color: '#ed8936' }} />,
  'pages': <FolderOutlined style={{ color: '#9f7aea' }} />,
  'utils': <FolderOutlined style={{ color: '#4fd1c7' }} />,
  'hooks': <FolderOutlined style={{ color: '#f56565' }} />,
  'services': <FolderOutlined style={{ color: '#38b2ac' }} />,
  'styles': <FolderOutlined style={{ color: '#ed64a6' }} />,
  'images': <FolderOutlined style={{ color: '#ff69b4' }} />,
  'docs': <FolderOutlined style={{ color: '#4299e1' }} />,
  'test': <FolderOutlined style={{ color: '#48bb78' }} />,
  'tests': <FolderOutlined style={{ color: '#48bb78' }} />,
  '__tests__': <FolderOutlined style={{ color: '#48bb78' }} />,
  'node_modules': <FolderOutlined style={{ color: '#68d391' }} />,
  '.git': <FolderOutlined style={{ color: '#f56565' }} />,
  '.vscode': <FolderOutlined style={{ color: '#007acc' }} />,
  'dist': <FolderOutlined style={{ color: '#fbd38d' }} />,
  'build': <FolderOutlined style={{ color: '#fbd38d' }} />,
};

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get icon for a file based on its extension
 */
export function getFileIcon(
  filename: string,
  customIcons?: FileIconMapping
): React.ReactNode {
  const extension = getFileExtension(filename);
  
  // Check custom icons first
  if (customIcons && customIcons[extension]) {
    return customIcons[extension];
  }
  
  // Check default icons
  if (defaultFileIcons[extension]) {
    return defaultFileIcons[extension];
  }
  
  // Special cases for files without extensions or specific names
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename === 'dockerfile') {
    return <CodeOutlined style={{ color: '#0db7ed' }} />;
  }
  if (lowerFilename === 'makefile') {
    return <CodeOutlined style={{ color: '#427819' }} />;
  }
  if (lowerFilename.startsWith('.git')) {
    return <SettingOutlined style={{ color: '#f56565' }} />;
  }
  if (lowerFilename.startsWith('.env')) {
    return <SettingOutlined style={{ color: '#ffd700' }} />;
  }
  
  // Default file icon
  return <FileOutlined style={{ color: '#9cdcfe' }} />;
}

/**
 * Get icon for a folder based on its name
 */
export function getFolderIcon(
  folderName: string,
  isOpen: boolean = false,
  customIcons?: FileIconMapping
): React.ReactNode {
  const lowerFolderName = folderName.toLowerCase();
 
  // Check custom icons first
  if (customIcons && customIcons[lowerFolderName]) {
    return customIcons[lowerFolderName];
  }
  
  // Check special folder icons
  if (specialFolderIcons[lowerFolderName]) {
    return specialFolderIcons[lowerFolderName];
  }
  
  // Default folder icon
  return isOpen ? defaultFolderIcons.open : defaultFolderIcons.closed;
}

/**
 * Get display name for a file or folder
 */
export function getDisplayName(path: string): string {
  if (!path) return '';
  return path.split('/').pop() || path;
}

/**
 * Check if a path represents a directory
 */
export function isDirectory(node: { isLeaf?: boolean; children?: any[] }): boolean {
  return !node.isLeaf || (node.children && node.children.length > 0);
}