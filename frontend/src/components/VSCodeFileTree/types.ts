import { ReactNode } from 'react';
import type { DataNode } from 'antd/es/tree';

export interface VSCodeFileTreeNode extends DataNode {
  key: string;
  isLeaf?: boolean;
  children?: VSCodeFileTreeNode[];
  icon?: ReactNode;
  path?: string;
  type?: 'file' | 'folder';
  extension?: string;
  size?: number;
  modifiedTime?: Date;
  isReadOnly?: boolean;
  isHidden?: boolean;
  customData?: any;
}

export interface FileIconConfig {
  [key: string]: ReactNode | string;
}

export interface VSCodeFileTreeProps {
  treeData: VSCodeFileTreeNode[];
  expandedKeys?: string[];
  selectedKeys?: string[];
  onSelect?: (selectedKeys: string[], info: any) => void;
  onExpand?: (expandedKeys: string[], info: any) => void;
  onRefresh?: () => Promise<void>;
  onCreateFile?: (parentPath: string, fileName: string) => Promise<void>;
  onCreateFolder?: (parentPath: string, folderName: string) => Promise<void>;
  onDelete?: (node: VSCodeFileTreeNode) => Promise<void>;
  onRename?: (node: VSCodeFileTreeNode, newName: string) => Promise<void>;
  onCopy?: (node: VSCodeFileTreeNode) => Promise<void>;
  onCut?: (node: VSCodeFileTreeNode) => Promise<void>;
  onPaste?: (targetNode: VSCodeFileTreeNode) => Promise<void>;
  projectName?: string;
  showSearch?: boolean;
  showHeader?: boolean;
  allowContextMenu?: boolean;
  customIcons?: FileIconConfig;
  height?: number | string;
  className?: string;
  loading?: boolean;
  readOnly?: boolean;
}

export interface FileTreeContextMenuProps {
  node: VSCodeFileTreeNode | null;
  visible: boolean;
  onClose: () => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDelete?: (node: VSCodeFileTreeNode) => void;
  onRename?: (node: VSCodeFileTreeNode) => void;
  onCopy?: (node: VSCodeFileTreeNode) => void;
  onCut?: (node: VSCodeFileTreeNode) => void;
  onPaste?: (node: VSCodeFileTreeNode) => void;
  onShowInfo?: (node: VSCodeFileTreeNode) => void;
  readOnly?: boolean;
  clipboardNode?: VSCodeFileTreeNode | null;
}

export interface FileTreeHeaderProps {
  title?: string;
  onRefresh?: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  loading?: boolean;
  readOnly?: boolean;
}

export interface FileTreeSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface FileTreeNodeProps {
  node: VSCodeFileTreeNode;
  customIcons?: FileIconConfig;
  showFullPath?: boolean;
}
import React from 'react';

export interface VSCodeFileTreeNode {
  key: string;
  title: React.ReactNode;
  isLeaf?: boolean;
  children?: VSCodeFileTreeNode[];
  icon?: React.ReactNode;
  path?: string;
  type?: 'file' | 'folder';
  extension?: string;
  isReadOnly?: boolean;
  customData?: any;
}

export interface VSCodeFileTreeProps {
  treeData: VSCodeFileTreeNode[];
  onSelect?: (selectedKeys: string[], info: any) => void;
  onExpand?: (expandedKeys: string[], info: any) => void;
  onRightClick?: (info: any) => void;
  expandedKeys?: string[];
  selectedKeys?: string[];
  searchValue?: string;
  showSearch?: boolean;
  showFullPath?: boolean;
  customIcons?: { [key: string]: React.ReactNode };
  height?: number;
  loading?: boolean;
  className?: string;
  [key: string]: any; // 允许传递其他 Tree 组件的 props
}

export interface FileTreeNodeProps {
  node: VSCodeFileTreeNode;
  customIcons?: { [key: string]: React.ReactNode };
  showFullPath?: boolean;
}

export interface FileTreeSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface FileTreeHeaderProps {
  title?: string;
  showSearch?: boolean;
  searchProps?: FileTreeSearchProps;
  actions?: React.ReactNode[];
  className?: string;
}

export interface FileTreeContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  node?: VSCodeFileTreeNode;
  onClose: () => void;
  menuItems?: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    onClick?: (node: VSCodeFileTreeNode) => void;
    disabled?: boolean;
  }>;
}