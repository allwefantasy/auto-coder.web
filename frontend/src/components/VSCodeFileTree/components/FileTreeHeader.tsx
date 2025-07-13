import React from 'react';
import { Tooltip } from 'antd';
import {
  ReloadOutlined,
  FileAddOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import { FileTreeHeaderProps } from '../types';

const FileTreeHeader: React.FC<FileTreeHeaderProps> = ({
  title = 'Explorer',
  onRefresh,
  onCreateFile,
  onCreateFolder,
  loading = false,
  readOnly = false,
}) => {
  return (
    <div className="vscode-file-tree-header">
      <div className="vscode-file-tree-title">
        {title}
      </div>
      <div className="vscode-file-tree-actions">
        {!readOnly && onCreateFile && (
          <Tooltip title="New File">
            <button
              onClick={onCreateFile}
              className="vscode-action-button"
              aria-label="Create new file"
            >
              <FileAddOutlined />
            </button>
          </Tooltip>
        )}
        {!readOnly && onCreateFolder && (
          <Tooltip title="New Folder">
            <button
              onClick={onCreateFolder}
              className="vscode-action-button"
              aria-label="Create new folder"
            >
              <FolderAddOutlined />
            </button>
          </Tooltip>
        )}
        {onRefresh && (
          <Tooltip title="Refresh Explorer">
            <button
              onClick={onRefresh}
              className="vscode-action-button"
              aria-label="Refresh file tree"
              disabled={loading}
            >
              {loading ? (
                <svg
                  className="vscode-loading-spinner"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <ReloadOutlined />
              )}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default FileTreeHeader;