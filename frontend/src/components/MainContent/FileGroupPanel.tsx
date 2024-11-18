import React, { useState, useEffect } from 'react';
import { Tree, Input, Button, Modal, message, Table } from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined, CheckOutlined } from '@ant-design/icons';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import Editor from '@monaco-editor/react';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface FileGroup {
  name: string;
  description: string;
  files: string[];
}

// CSS styles for the custom input in dark mode
const darkModeInputStyles = `
.custom-input {
  background-color: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

.custom-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.custom-input:hover {
  border-color: #4b5563;
}
`;

const FileGroupPanel: React.FC = () => {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<FileGroup | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [filteredTreeData, setFilteredTreeData] = useState<DataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Helper function to get all file paths from tree data
  const getAllFilePaths = (nodes: DataNode[]): string[] => {
    const paths: string[] = [];

    const traverse = (node: DataNode) => {
      if (node.isLeaf) {
        paths.push(node.key as string);
      } else if (node.children) {
        node.children.forEach(traverse);
      }
    };

    nodes.forEach(traverse);
    return paths;
  };

  // Fetch file groups
  const fetchFileGroups = async () => {
    try {
      const response = await fetch('/api/file-groups');
      if (!response.ok) throw new Error('Failed to fetch file groups');
      const data = await response.json();
      setFileGroups(data.groups);
    } catch (error) {
      message.error('Failed to load file groups');
    }
  };

  // Fetch file tree
  const fetchFileTree = async () => {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Failed to fetch file tree');
      const data = await response.json();
      setTreeData(data.tree);
      setFilteredTreeData(data.tree);
    } catch (error) {
      message.error('Failed to load file tree');
    }
  };

  useEffect(() => {
    fetchFileGroups();
    fetchFileTree();
  }, []);

  // Create new group
  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/file-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
      });
      if (!response.ok) throw new Error('Failed to create group');
      
      message.success('Group created successfully');
      setIsModalVisible(false);
      setNewGroupName('');
      setNewGroupDesc('');
      fetchFileGroups();
    } catch (error) {
      message.error('Failed to create group');
    }
  };

  // Delete group
  const handleDeleteGroup = async (name: string) => {
    try {
      const response = await fetch(`/api/file-groups/${name}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete group');
      
      message.success('Group deleted successfully');
      fetchFileGroups();
      if (selectedGroup?.name === name) setSelectedGroup(null);
    } catch (error) {
      message.error('Failed to delete group');
    }
  };

  // Add files to group
  const handleAddFiles = async () => {
    if (!selectedGroup || checkedKeys.length === 0) return;
    
    try {      
      if (checkedKeys.length === 0) {
        message.info('No files selected (directories are ignored)');
        return;
      }

      const response = await fetch(`/api/file-groups/${selectedGroup.name}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: checkedKeys }),
      });
      if (!response.ok) throw new Error('Failed to add files');
      
      message.success('Files added successfully');
      fetchFileGroups();
      setCheckedKeys([]);
    } catch (error) {
      message.error('Failed to add files');
    }
  };

  // Remove file from group
  const handleRemoveFile = async (groupName: string, filePath: string) => {
    try {
      const response = await fetch(`/api/file-groups/${groupName}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [filePath] }),
      });
      if (!response.ok) throw new Error('Failed to remove file');
      
      message.success('File removed successfully');
      fetchFileGroups();
    } catch (error) {
      message.error('Failed to remove file');
    }
  };

  // Fetch file content
  const handleFileSelect = async (path: string) => {
    try {
      const response = await fetch(`/api/file/${path}`);
      if (!response.ok) throw new Error('Failed to fetch file content');
      const data = await response.json();
      setSelectedFile(path);
      setFileContent(data.content);
    } catch (error) {
      message.error('Failed to load file content');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-lg font-semibold">File Groups</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            New Group
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* File Groups List */}
          <div className="w-80 bg-gray-900 border-r border-gray-700 overflow-y-auto p-4">
            <Table
              dataSource={fileGroups}
              rowKey="name"
              rowClassName={(record) => 
                record.name === selectedGroup?.name ? 'bg-blue-600' : 'bg-gray-800'
              }
              onRow={(record) => ({
                onClick: () => setSelectedGroup(record),
                className: 'cursor-pointer hover:bg-gray-700'
              })}
              className="dark-mode-table"
              size="small"
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    dataSource={record.files.map(file => ({ path: file }))}
                    rowKey="path"
                    showHeader={false}
                    columns={[
                      {
                        title: 'Path',
                        dataIndex: 'path',
                        key: 'path',
                        render: (path) => (
                          <span 
                            className="text-gray-300 cursor-pointer"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleFileSelect(path);
                            }}
                          >
                            {path}
                          </span>
                        )
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        width: 60,
                        render: (_, { path }) => (
                          <DeleteOutlined
                            className="text-red-400 cursor-pointer hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(record.name, path);
                            }}
                          />
                        )
                      }
                    ]}
                    pagination={false}
                    size="small"
                    className="nested-table dark-mode-table"
                  />
                )
              }}
              columns={[
                {
                  title: 'Group',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name, record) => {
                    const [isEditing, setIsEditing] = useState(false);
                    const [description, setDescription] = useState(record.description);

                    const handleDescriptionUpdate = async () => {
                      try {
                        const response = await fetch(`/api/file-groups/${name}/description`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ description }),
                        });
                        
                        if (!response.ok) throw new Error('Failed to update description');
                        
                        setIsEditing(false);
                        message.success('Description updated successfully');
                      } catch (error) {
                        message.error('Failed to update description');
                      }
                    };

                    return (
                      <div>
                        <div className="text-white font-medium">{name}</div>
                        <div className="text-gray-400 text-sm">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onPressEnter={handleDescriptionUpdate}
                                className="custom-input"
                                size="small"
                              />
                              <Button
                                size="small"
                                type="primary"
                                onClick={handleDescriptionUpdate}
                                className="px-2 py-1"
                              >
                                Save
                              </Button>
                              <Button
                                size="small"
                                onClick={() => {
                                  setIsEditing(false);
                                  setDescription(record.description);
                                }}
                                className="px-2 py-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:text-blue-400"
                              onClick={() => setIsEditing(true)}
                              title="Click to edit"
                            >
                              {description || 'Add description...'}
                            </div>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">{record.files.length} files</div>
                      </div>
                    );
                  }
                },
                {
                  title: 'Action',
                  key: 'action',
                  width: 60,
                  render: (_, record) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(record.name);
                      }}
                    />
                  )
                }
              ]}
            />
          </div>

          {/* File Tree */}
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-2">
              <div className="space-y-4">
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

                {selectedGroup && (
                  <div className="flex space-x-2">
                    <Button
                      type="primary"
                      onClick={handleAddFiles}
                      disabled={checkedKeys.length === 0}
                      icon={<PlusOutlined />}
                      block
                    >
                      Add Selected ({checkedKeys.length})
                    </Button>
                    <Button
                      onClick={() => {
                        const allPaths = getAllFilePaths(filteredTreeData);
                        setCheckedKeys(allPaths);
                      }}
                      icon={<CheckOutlined />}
                      title="Select All Filtered Files"
                    />
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Tree
                  checkable
                  treeData={filteredTreeData}
                  checkedKeys={checkedKeys}
                  onCheck={(checked) => setCheckedKeys(checked as React.Key[])}
                  onDoubleClick={(event: any, node: any) => {
                    if (node.isLeaf) {
                      handleFileSelect(node.key as string);
                    }
                  }}
                  className="bg-gray-900 text-gray-300"
                />
              </div>
            </div>
          </div>

          {/* File Preview */}
          <div className="flex-1 bg-gray-900">
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              language={getLanguageByFileName(selectedFile || '')}
              theme="vs-dark"
              value={fileContent}
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* New Group Modal */}
      <Modal
        title="Create New Group"
        open={isModalVisible}
        onOk={handleCreateGroup}
        onCancel={() => setIsModalVisible(false)}
        okButtonProps={{ disabled: !newGroupName.trim() }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Group Name</label>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <Input.TextArea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Enter group description"
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FileGroupPanel;