import React, { useState } from 'react';
import { Tree, Dropdown, Modal, message, Input } from 'antd';
import { SearchOutlined, FolderOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import './FileTree.css';

interface FileTreeProps {
  treeData: DataNode[];
  onSelect: (selectedKeys: React.Key[], info: any) => void;
  onRefresh: () => Promise<void>;
}

const FileTree: React.FC<FileTreeProps> = ({ treeData, onSelect, onRefresh }) => {
  const [filteredTreeData, setFilteredTreeData] = useState<DataNode[]>(treeData);
  const [contextMenuNode, setContextMenuNode] = useState<DataNode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  React.useEffect(() => {
    setFilteredTreeData(treeData);
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

  const menuItems: MenuProps['items'] = [
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

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">
        <button
          onClick={handleRefresh}
          className="refresh-button"
        >
          {isRefreshing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="file-tree-search">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Filter files by path..."
          className="custom-input"
          onChange={(e) => {
            const searchValue = e.target.value.toLowerCase();

            if (!searchValue) {
              setFilteredTreeData(treeData);
              return;
            }

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
              return fullPath.includes(searchValue);
            });

            // Create a flat tree structure for matching files
            const flattenedTree = matchingFiles.map(file => ({
              ...file,
              title: file.key, // Show full path as title
            }));

            setFilteredTreeData(flattenedTree as DataNode[]);
          }}
        />
      </div>
      
      <div className="file-tree-content">
        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
          <Tree
            showIcon
            defaultExpandAll
            onSelect={onSelect}
            onRightClick={handleRightClick}
            treeData={filteredTreeData}
            className="bg-gray-900 text-gray-300"
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default FileTree;
