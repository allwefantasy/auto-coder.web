import React from 'react';
import { FileTreeNodeProps } from '../types';
import { getFileIcon, getFolderIcon, getDisplayName, isDirectory } from '../utils';

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  customIcons,
  showFullPath = false,
}) => {
  console.log('[FileTreeNode] Rendering node:', {
    key: node.key,
    title: node.title,
    isLeaf: node.isLeaf,
    showFullPath,
    hasCustomIcon: !!node.icon,
    customIconType: typeof node.icon,
  });

  const displayName = showFullPath ? node.path || node.key : getDisplayName(node.key);
  const isDir = isDirectory(node);
  
  console.log('[FileTreeNode] Node analysis:', {
    displayName,
    isDir,
    path: node.path,
  });
  
  // 优先使用基于文件类型/扩展名的图标解析，而不是后台返回的字符串
  const computedIcon = isDir 
    ? getFolderIcon(displayName, false, customIcons)
    : getFileIcon(displayName, customIcons);
  
  // 只有当node.icon是ReactNode类型时才使用，否则使用计算出的图标
  const finalIcon = (node.icon && typeof node.icon !== 'string') 
    ? node.icon 
    : computedIcon;

  console.log('[FileTreeNode] Icon selection:', {
    hasNodeIcon: !!node.icon,
    nodeIconType: typeof node.icon,
    usingComputedIcon: !node.icon || typeof node.icon === 'string',
  });

  return (
    <div className="vscode-file-node">
      <span className="vscode-file-icon">
        {finalIcon}
      </span>
      <span className="vscode-file-name" title={node.path || node.key}>
        {displayName}
      </span>
      {showFullPath && node.path && (
        <span className="vscode-file-path">
          {node.path}
        </span>
      )}
      {node.isReadOnly && (
        <span className="vscode-file-readonly-indicator">
          🔒
        </span>
      )}
    </div>
  );
};

export default FileTreeNode;