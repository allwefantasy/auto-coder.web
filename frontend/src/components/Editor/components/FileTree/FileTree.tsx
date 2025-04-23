import React, { useState, useEffect } from 'react';
import { Tree, Dropdown, Modal, message, Input, Tooltip, Empty } from 'antd';
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
  InfoCircleOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import './FileTree.css';

interface FileTreeProps {
  treeData: DataNode[];
  onSelect: (selectedKeys: React.Key[], info: any) => void;
  onRefresh: () => Promise<void>;
  projectName?: string;
}

const FileTree: React.FC<FileTreeProps> = ({ treeData, onSelect, onRefresh, projectName }) => {
  const [filteredTreeData, setFilteredTreeData] = useState<DataNode[]>(treeData);
  const [contextMenuNode, setContextMenuNode] = useState<DataNode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  useEffect(() => {
    setFilteredTreeData(treeData);
    if (searchValue) {
      handleSearch(searchValue);
    }
  }, [treeData]);

  const handleDelete = async (node: DataNode) => {
    try {
      const response = await fetch(`/api/files/${node.key}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      message.success(`Successfully deleted ${node.title}`);
      onRefresh();
    } catch (error) {
      message.error('Failed to delete file/directory');
      console.error('Error:', error);
    }
  };

  const handleRightClick = ({ event, node }: { event: React.MouseEvent; node: DataNode }) => {
    event.preventDefault();
    setContextMenuNode(node);
  };
  
  // Helper function to get file extension
  const getFileExtension = (filename: string): string => {
    const parts = filename.toString().split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
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
    const matchingFiles = allFiles.filter(file => {
      const fullPath = file.key.toString().toLowerCase();
      return fullPath.includes(searchText);
    });

    // Create a flat tree structure for matching files
    const flattenedTree = matchingFiles.map(file => ({
      ...file,
      title: (
        <div className="file-node">
          <span className={`file-icon file file-${getFileExtension(file.key.toString())}`}>
            <FileOutlined />
          </span>
          <span className="file-name">{file.title?.toString()}</span>
          <div className="path-breadcrumb">{file.key.toString()}</div>
        </div>
      ),
    }));

    setFilteredTreeData(flattenedTree as DataNode[]);
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'info',
      icon: <InfoCircleOutlined />,
      label: 'File Info',
      onClick: () => {
        if (contextMenuNode) {
          message.info(`Path: ${contextMenuNode.key}`);
        }
      },
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy Full Path', // Changed label
      onClick: () => {
        if (contextMenuNode) {
          const relativePath = contextMenuNode.key.toString();
          const fullPath = projectName ? `${projectName}/${relativePath}` : relativePath;
          navigator.clipboard.writeText(fullPath);
          message.success('Full path copied to clipboard'); // Changed message
        }
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => {
        if (contextMenuNode) {
          Modal.confirm({
            title: 'Delete Confirmation',
            content: `Are you sure you want to delete ${contextMenuNode.title}?`,
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk() {
              handleDelete(contextMenuNode);
            },
          });
        }
      },
    },
  ];

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      message.success('Refreshed file tree successfully');
    } catch (error) {
      message.error('Failed to refresh file tree');
      console.error('Error refreshing file tree:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Custom title renderer for tree nodes
  const renderTitle = (node: DataNode) => {
    const fileName = node.title?.toString() || '';
    const isDir = !node.isLeaf;
    const ext = getFileExtension(fileName);
    
    return (
      <div className="file-node">
        <span className={`file-icon ${isDir ? 'folder' : `file file-${ext}`}`}>
          {isDir ? <FolderOutlined /> : <FileOutlined />}
        </span>
        <span className="file-name">{fileName}</span>
      </div>
    );
  };

  // Process tree data to add custom titles
  const processTreeData = (data: DataNode[]): DataNode[] => {
    return data.map(node => {
      const processedNode: DataNode = {
        ...node,
        title: renderTitle(node),
      };
      
      if (node.children) {
        processedNode.children = processTreeData(node.children);
      }
      
      return processedNode;
    });
  };

  // Processed tree data with custom rendering
  const processedTreeData = React.useMemo(() => {
    return isSearchActive ? filteredTreeData : processTreeData(filteredTreeData);
  }, [filteredTreeData, isSearchActive]);

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">
        <div className="file-tree-header-title">
          {projectName || 'Project Files'}
        </div>
        <div className="file-tree-actions">
          <Tooltip title="Refresh">
            <button
              onClick={handleRefresh}
              className="action-button"
              aria-label="Refresh file tree"
            >
              {isRefreshing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
          placeholder="Search files..."
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
            <div className="empty-state-text">
              No files found
            </div>
          </div>
        ) : processedTreeData.length === 0 && isSearchActive ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <SearchOutlined />
            </div>
            <div className="empty-state-text">
              No matching files found
            </div>
          </div>
        ) : (
          <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
            <div className="file-tree">
              <Tree
                showIcon={false}
                defaultExpandAll
                onSelect={onSelect}
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
