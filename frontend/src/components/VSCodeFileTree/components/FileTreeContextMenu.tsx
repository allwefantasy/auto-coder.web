import React from 'react';
import { Dropdown, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  FileAddOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  ScissorOutlined,
  FormOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { FileTreeContextMenuProps } from '../types';

const FileTreeContextMenu: React.FC<FileTreeContextMenuProps> = ({
  node,
  visible,
  onClose,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  onCopy,
  onCut,
  onPaste,
  onShowInfo,
  readOnly = false,
  clipboardNode = null,
}) => {
  if (!node) return null;

  const isDirectory = !node.isLeaf;

  const handleMenuClick = (key: string) => {
    switch (key) {
      case 'new-file':
        if (onCreateFile && isDirectory) {
          onCreateFile(node.path || node.key);
        }
        break;
      case 'new-folder':
        if (onCreateFolder && isDirectory) {
          onCreateFolder(node.path || node.key);
        }
        break;
      case 'rename':
        if (onRename) {
          onRename(node);
        }
        break;
      case 'copy':
        if (onCopy) {
          onCopy(node);
        }
        break;
      case 'cut':
        if (onCut) {
          onCut(node);
        }
        break;
      case 'paste':
        if (onPaste && clipboardNode) {
          onPaste(node);
        }
        break;
      case 'delete':
        if (onDelete) {
          const nodeName = node.title as string || node.key.split('/').pop() || node.key;
          Modal.confirm({
            title: 'Delete Confirmation',
            content: `Are you sure you want to delete "${nodeName}"?`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk() {
              onDelete(node);
            },
            className: 'vscode-dark-modal',
          });
        }
        break;
      case 'info':
        if (onShowInfo) {
          onShowInfo(node);
        } else {
          message.info(`Path: ${node.path || node.key}`);
        }
        break;
      case 'copy-path':
        navigator.clipboard.writeText(node.path || node.key);
        message.success('Path copied to clipboard');
        break;
      default:
        break;
    }
    onClose();
  };

  const getMenuItems = (): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    // New file/folder options (only for directories and when not read-only)
    if (isDirectory && !readOnly) {
      items.push(
        {
          key: 'new-file',
          label: 'New File',
          icon: <FileAddOutlined />,
          onClick: () => handleMenuClick('new-file'),
        },
        {
          key: 'new-folder',
          label: 'New Folder',
          icon: <FolderAddOutlined />,
          onClick: () => handleMenuClick('new-folder'),
        },
        {
          type: 'divider',
        }
      );
    }

    // Edit operations (when not read-only)
    if (!readOnly) {
      items.push(
        {
          key: 'rename',
          label: 'Rename',
          icon: <EditOutlined />,
          onClick: () => handleMenuClick('rename'),
        },
        {
          type: 'divider',
        }
      );
    }

    // Copy/Cut/Paste operations
    items.push(
      {
        key: 'copy',
        label: 'Copy',
        icon: <CopyOutlined />,
        onClick: () => handleMenuClick('copy'),
      }
    );

    if (!readOnly) {
      items.push({
        key: 'cut',
        label: 'Cut',
        icon: <ScissorOutlined />,
        onClick: () => handleMenuClick('cut'),
      });

      if (clipboardNode && isDirectory) {
        items.push({
          key: 'paste',
          label: 'Paste',
          icon: <FormOutlined />,
          onClick: () => handleMenuClick('paste'),
        });
      }
    }

    // Info and utility operations
    items.push(
      {
        type: 'divider',
      },
      {
        key: 'copy-path',
        label: 'Copy Path',
        icon: <CopyOutlined />,
        onClick: () => handleMenuClick('copy-path'),
      },
      {
        key: 'info',
        label: 'Properties',
        icon: <InfoCircleOutlined />,
        onClick: () => handleMenuClick('info'),
      }
    );

    // Delete operation (when not read-only)
    if (!readOnly) {
      items.push(
        {
          type: 'divider',
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleMenuClick('delete'),
        }
      );
    }

    return items;
  };

  return (
    <Dropdown
      menu={{ items: getMenuItems() }}
      open={visible}
      onOpenChange={(open) => !open && onClose()}
      trigger={['contextMenu']}
      overlayClassName="vscode-context-menu"
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }} />
    </Dropdown>
  );
};

export default FileTreeContextMenu;