import React, { useState, useEffect, useRef } from "react";
import {
  Tree,
  Dropdown,
  Modal,
  message,
  Input,
  Tooltip,
  Empty,
  Form,
  Switch,
} from "antd";
import {
  SearchOutlined,
  FolderOutlined,
  FileOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  CopyOutlined,
  ScissorOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import type { MenuProps } from "antd";
import { getMessage } from "../../../../lang";
import "./FileTree.css";
import FileTreeNode from "./components/FileTreeNode";
import { sortTreeNodes, compactFolders } from './utils/treeUtils'

interface FileTreeProps {
  treeData: DataNode[];
  expandedKeys?: string[];
  onSelect: (selectedKeys: React.Key[], info: any) => void;
  onRefresh: () => Promise<void>;
  onExpand: (selectedKeys: React.Key[], info: any) => void;
  projectName?: string;
}

const { DirectoryTree } = Tree;

const FileTree: React.FC<FileTreeProps> = ({
  treeData,
  expandedKeys,
  onSelect,
  onExpand,
  onRefresh,
  projectName,
}) => {
  const [filteredTreeData, setFilteredTreeData] =
    useState<DataNode[]>(treeData);
  const [contextMenuNode, setContextMenuNode] = useState<DataNode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [isCompactFolders, setCompactFolders] = useState(true)
  const [isNewFileModalVisible, setIsNewFileModalVisible] =
    useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>("");
  const [newFileParentPath, setNewFileParentPath] = useState<string>("");
  const [isNewDirModalVisible, setIsNewDirModalVisible] =
    useState<boolean>(false);
  const [newDirName, setNewDirName] = useState<string>("");
  const [newDirParentPath, setNewDirParentPath] = useState<string>("");

  useEffect(() => {
    setFilteredTreeData(treeData);
    if (searchValue) {
      handleSearch(searchValue);
    }
  }, [treeData]);

  const handleDelete = async (node: DataNode) => {
    try {
      const response = await fetch(`/api/files/${node.key}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      message.success(getMessage('deleteSuccess', { name: node.title }));
      onRefresh();
    } catch (error) {
      message.error(getMessage('deleteFailed'));
      console.error("Error:", error);
    }
  };

  const handleRightClick = ({
    event,
    node,
  }: {
    event: React.MouseEvent;
    node: DataNode;
  }) => {
    event.preventDefault();
    setContextMenuNode(node);
  };

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) return;

    // Determine the path for the new file
    const fullPath = newFileParentPath
      ? `${newFileParentPath}/${newFileName}`.replace(/\/\//g, "/")
      : newFileName;

    try {
      const response = await fetch(`/api/file/${fullPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create file");
      }

      message.success(getMessage('createSuccess', { name: newFileName }));
      setIsNewFileModalVisible(false);
      setNewFileName("");
      onRefresh();
    } catch (error) {
      console.error("Error creating file:", error);
      message.error(
        error instanceof Error ? error.message : getMessage('createFailed', { type: getMessage('newFile') })
      );
    }
  };

  const handleCreateNewDirectory = async () => {
    if (!newDirName.trim()) return;

    // Determine the path for the new directory
    const fullPath = newDirParentPath
      ? `${newDirParentPath}/${newDirName}`.replace(/\/\//g, "/")
      : newDirName;

    try {
      const response = await fetch(`/api/directory/${fullPath}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create directory");
      }

      message.success(getMessage('createDirSuccess', { name: newDirName }));
      setIsNewDirModalVisible(false);
      setNewDirName("");
      onRefresh();
    } catch (error) {
      console.error("Error creating directory:", error);
      message.error(
        error instanceof Error ? error.message : getMessage('createDirFailed')
      );
    }
  };

  // Helper function to get file extension
  const getFileExtension = (filename: string): string => {
    const parts = filename.toString().split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };

  // Helper function to check if node is a directory
  const isDirectory = (node: DataNode): boolean => {
    return !node.isLeaf;
  };

  const handleSearch = (value: string) => {
    const searchText = value.toLowerCase();
    setSearchValue(value);

    if (!searchText) {
      setFilteredTreeData(treeData);
      setIsSearchActive(false);
      return;
    }

    setIsSearchActive(true);

    // Helper function to get all leaf nodes (files) from tree
    const getAllFiles = (nodes: DataNode[]): DataNode[] => {
      return nodes.reduce((acc: DataNode[], node) => {
        if (node.isLeaf) {
          acc.push(node);
        } else if (node.children) {
          acc.push(...getAllFiles(node.children));
        }
        return acc;
      }, []);
    };

    // Get all files that match the search value
    const allFiles = getAllFiles(treeData);
    const matchingFiles = allFiles.filter((file) => {
      const fullPath = file.key.toString().toLowerCase();
      return fullPath.includes(searchText);
    });

    // Create a flat tree structure for matching files
    const flattenedTree = matchingFiles.map((file) => ({
      ...file,
      title: (
        <div className="file-node">
          <span
            className={`file-icon file file-${getFileExtension(
              file.key.toString()
            )}`}
          >
            <FileOutlined />
          </span>
          <span className="file-name">{file.title?.toString()}</span>
          <div className="path-breadcrumb">{file.key.toString()}</div>
        </div>
      ),
    }));

    setFilteredTreeData(flattenedTree as DataNode[]);
  };

  const getMenuItems = (): MenuProps["items"] => {
    const items: MenuProps["items"] = [];

    // Only show "New File" and "New Directory" options for directories
    if (contextMenuNode && isDirectory(contextMenuNode)) {
      items.push({
        key: "new-file",
        icon: <FileAddOutlined />,
        label: getMessage('newFile'),
        onClick: () => {
          setNewFileParentPath(contextMenuNode.key.toString());
          setIsNewFileModalVisible(true);
        },
      });

      items.push({
        key: "new-directory",
        icon: <FolderAddOutlined />,
        label: getMessage('newDirectory'),
        onClick: () => {
          setNewDirParentPath(contextMenuNode.key.toString());
          setIsNewDirModalVisible(true);
        },
      });
    }

    items.push(
      {
        key: "info",
        icon: <InfoCircleOutlined />,
        label: getMessage('fileInfo'),
        onClick: () => {
          if (contextMenuNode) {
            message.info(getMessage('pathInfo', { path: contextMenuNode.key }));
          }
        },
      },
      {
        key: "copy",
        icon: <CopyOutlined />,
        label: getMessage('copyPath'),
        onClick: () => {
          if (contextMenuNode) {
            navigator.clipboard.writeText(contextMenuNode.key.toString());
            message.success(getMessage('pathCopied'));
          }
        },
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        icon: <DeleteOutlined />,
        label: getMessage('delete'),
        danger: true,
        onClick: () => {
          if (contextMenuNode) {
            const nodeKey = contextMenuNode.key.toString();
            const nodeName = nodeKey.split("/").pop() || nodeKey; // Extract name from path
            Modal.confirm({
              title: getMessage('deleteConfirmation'),
              content: getMessage('deleteConfirmText', { name: nodeName }),
              okText: getMessage('yes'),
              okType: "danger",
              cancelText: getMessage('no'),
              onOk() {
                handleDelete(contextMenuNode);
              },
            });
          }
        },
      }
    );

    return items;
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      message.success(getMessage('refreshSuccess'));
    } catch (error) {
      message.error(getMessage('refreshFailed'));
      console.error("Error refreshing file tree:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  function addCustomTitles(nodes: DataNode[]): DataNode[] {
    return nodes.map(node => ({
      ...node,
      title: (
        <FileTreeNode
          node={node}
          customIcons
          showFullPath={!!searchValue}
        />
      ),
      children: node.children ? addCustomTitles(node.children) : undefined,
    }));
  };

  // Handle tree selection
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    selectNode.current = info
    onSelect?.(selectedKeys, info);
  }

  // Handle tree expansion
  const handleExpand = (selectedKeys: React.Key[], info: any) => {
    onExpand?.(selectedKeys, info);
  }



  // Processed tree data with custom rendering
  const processedTreeData = React.useMemo(() => {

    let processed = [...filteredTreeData];

    // Sort nodes
    processed = sortTreeNodes(processed);
    processed = isCompactFolders ? compactFolders(processed) : processed
    return isSearchActive
      ? processed
      : addCustomTitles(processed);
  }, [filteredTreeData, isSearchActive]);

  return (
    <div className="file-tree-container">
      <Modal
        title={
          newFileParentPath
            ? getMessage('createFileIn', { path: newFileParentPath })
            : getMessage('createFileInRoot')
        }
        open={isNewFileModalVisible}
        onOk={handleCreateNewFile}
        onCancel={() => {
          setIsNewFileModalVisible(false);
          setNewFileName("");
          setNewFileParentPath("");
        }}
        okButtonProps={{ disabled: !newFileName.trim() }}
        className="vscode-dark-modal"
      >
        <Form layout="vertical">
          <Form.Item
            label={getMessage('fileName')}
            required
            help={getMessage('fileNameHelp')}
          >
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={getMessage('fileNamePlaceholder')}
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          newDirParentPath
            ? getMessage('createDirIn', { path: newDirParentPath })
            : getMessage('createDirInRoot')
        }
        open={isNewDirModalVisible}
        onOk={handleCreateNewDirectory}
        onCancel={() => {
          setIsNewDirModalVisible(false);
          setNewDirName("");
          setNewDirParentPath("");
        }}
        okButtonProps={{ disabled: !newDirName.trim() }}
        className="vscode-dark-modal"
      >
        <Form layout="vertical">
          <Form.Item
            label={getMessage('directoryName')}
            required
            help={getMessage('directoryNameHelp')}
          >
            <Input
              value={newDirName}
              onChange={(e) => setNewDirName(e.target.value)}
              placeholder={getMessage('directoryNamePlaceholder')}
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      <div className="file-tree-header">
        <div title={projectName || getMessage('projectFiles')} className="file-tree-header-title truncate flex-1">
          {projectName || getMessage('projectFiles')}
        </div>
        <div className="file-tree-actions ml-2 shrink-0">
          <Tooltip title={getMessage('toCompactFolders')}>
            <Switch size="small" checked={isCompactFolders} onChange={setCompactFolders} />
          </Tooltip>
          <Tooltip title={getMessage('newFile')}>
            <button
              onClick={() => {
                setNewFileParentPath("");
                setIsNewFileModalVisible(true);
              }}
              className="action-button"
              aria-label={getMessage('createNewFile')}
            >
              <FileAddOutlined />
            </button>
          </Tooltip>
          <Tooltip title={getMessage('newDirectory')}>
            <button
              onClick={() => {
                setNewDirParentPath("");
                setIsNewDirModalVisible(true);
              }}
              className="action-button"
              aria-label={getMessage('createNewDirectory')}
            >
              <FolderAddOutlined />
            </button>
          </Tooltip>
          <Tooltip title={getMessage('refresh')}>
            <button
              onClick={handleRefresh}
              className="action-button"
              aria-label={getMessage('refreshFileTree')}
            >
              {isRefreshing ? (
                <svg
                  className="w-4 h-4 animate-spin"
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
        </div>
      </div>

      <div className="file-tree-search">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder={getMessage('searchFiles')}
          className="custom-input"
          allowClear
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="file-tree-content">
        {treeData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FolderOutlined />
            </div>
            <div className="empty-state-text">{getMessage('noFiles')}</div>
          </div>
        ) : processedTreeData.length === 0 && isSearchActive ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <SearchOutlined />
            </div>
            <div className="empty-state-text">{getMessage('noMatching')}</div>
          </div>
        ) : (
          <Dropdown
            menu={{ items: getMenuItems() }}
            trigger={["contextMenu"]}
            overlayClassName="vscode-dark-dropdown"
          >
            <div className="file-tree">
              <Tree
                showIcon={false}
                autoExpandParent
                // showLine
                // defaultExpandAll
                onSelect={handleSelect}
                onExpand={handleExpand}
                onRightClick={handleRightClick}
                treeData={processedTreeData}
                height={999999}
              />
            </div>
          </Dropdown>
        )}
      </div>
    </div>
  );
};

export default FileTree;
