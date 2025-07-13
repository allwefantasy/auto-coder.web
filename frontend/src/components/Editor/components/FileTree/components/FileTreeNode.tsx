import React from "react";
import {
  getFileIcon,
  getFolderIcon,
  getDisplayName,
  isDirectory,
} from "../utils";

const FileTreeNode: React.FC<any> = ({
  node,
  customIcons,
  showFullPath = false,
}) => {
  const displayName = showFullPath
    ? node.path || node.key
    : getDisplayName(node.key);
  const isDir = isDirectory(node);

  // 优先使用基于文件类型/扩展名的图标解析，而不是后台返回的字符串
  const computedIcon = isDir
    ? getFolderIcon(displayName, false, customIcons)
    : getFileIcon(displayName, customIcons);

  // 只有当node.icon是ReactNode类型时才使用，否则使用计算出的图标
  const finalIcon =
    node.icon && typeof node.icon !== "string" ? node.icon : computedIcon;

  return (
    <div className="vscode-file-node">
      <span className="vscode-file-icon mr-1">{finalIcon}</span>
      <span className="vscode-file-name" title={node.path || node.key}>
        {displayName}
      </span>
      {showFullPath && node.path && (
        <span className="vscode-file-path">{node.path}</span>
      )}
      {node.isReadOnly && (
        <span className="vscode-file-readonly-indicator">🔒</span>
      )}
    </div>
  );
};

export default FileTreeNode;
