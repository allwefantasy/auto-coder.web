import React, { useState, useEffect } from 'react';
import { Tree, Input, Button, Modal, message, Table, Switch, Checkbox, Empty } from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined, CheckOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import Editor from '@monaco-editor/react';
import { getLanguageByFileName } from '../../utils/fileUtils';
import { getMessage } from '../../lang';
import FileDirectorySelector from './FileDirectorySelector';
import FileGroupDetail from './FileGroupDetail';
import './FileGroupPanel.css'; // 假设会创建这个文件

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
  const [isAutoGroupModalVisible, setIsAutoGroupModalVisible] = useState(false);
  const [isAutoGroupLoading, setIsAutoGroupLoading] = useState(false);
  const [fileSizeLimit, setFileSizeLimit] = useState<number>(100);
  const [groupNumLimit, setGroupNumLimit] = useState<number>(10);
  const [skipDiff, setSkipDiff] = useState<boolean>(false);
  const [groupResults, setGroupResults] = useState<Array<{name: string; description: string; selected: boolean}>>([]);
  const [isGroupResultsModalVisible, setIsGroupResultsModalVisible] = useState(false);
  const [isExternalFileModalVisible, setIsExternalFileModalVisible] = useState(false);
  const [externalFilePath, setExternalFilePath] = useState('');

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

      message.success(getMessage('fileGroup.createSuccess'));
      setIsModalVisible(false);
      setNewGroupName('');
      setNewGroupDesc('');
      fetchFileGroups();
    } catch (error) {
      message.error(getMessage('fileGroup.createFailed'));
    }
  };

  // Delete group
  const handleDeleteGroup = async (name: string) => {
    try {
      const response = await fetch(`/api/file-groups/${name}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete group');

      message.success(getMessage('fileGroup.deleteSuccess'));
      fetchFileGroups();
      if (selectedGroup?.name === name) setSelectedGroup(null);
    } catch (error) {
      message.error(getMessage('fileGroup.deleteFailed'));
    }
  };

  // Add files to group
  const handleAddFiles = async () => {
    if (!selectedGroup || checkedKeys.length === 0) return;

    try {
      const response = await fetch(`/api/file-groups/${selectedGroup.name}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: checkedKeys }),
      });
      if (!response.ok) throw new Error('Failed to add files');

      message.success(getMessage('fileGroup.addFilesSuccess'));
      fetchFileGroups();
      setCheckedKeys([]);
      if (response.ok) {
        fetchFileGroups(); // Refresh all groups data
        if (selectedGroup) {
          const updatedGroups = await (await fetch('/api/file-groups')).json();
          const updatedGroup = updatedGroups.groups.find((g:FileGroup) => g.name === selectedGroup.name);
          if (updatedGroup) {
            setSelectedGroup(updatedGroup);
          }
        }
      }
    } catch (error) {
      message.error(getMessage('fileGroup.addFilesFailed'));
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

      message.success(getMessage('fileGroup.removeSuccess'));
      fetchFileGroups(); // Refresh all groups data
      if (selectedGroup) {
        const updatedGroups = await (await fetch('/api/file-groups')).json();
        const updatedGroup = updatedGroups.groups.find((g:FileGroup) => g.name === selectedGroup.name);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
        }
      }
    } catch (error) {
      message.error(getMessage('fileGroup.removeFailed'));
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
      message.error(getMessage('fileGroup.loadFailed'));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-white text-lg font-semibold">{getMessage('fileGroup.title')}</h2>
            <div className="flex gap-2">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
                className="bg-blue-600 hover:bg-blue-700 border-none"
              />
              {/* <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setIsAutoGroupModalVisible(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-none shadow-md hover:shadow-lg transition-all duration-300"
              >
                Auto Group
              </Button> */}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* File Groups List */}
          <div className="w-60 bg-gray-900 border-r border-gray-700 overflow-y-auto p-4">
            <Table
              dataSource={fileGroups}
              rowKey="name"
              rowClassName={(record) =>
                record.name === selectedGroup?.name ? 'bg-blue-600' : 'bg-transparent'
              }
              onRow={(record) => ({
                onClick: () => setSelectedGroup(record),
                className: 'cursor-pointer hover:bg-gray-800'
              })}
              className="dark-mode-table"
              size="small"
              pagination={false}
              columns={[
                {
                  title: getMessage('common.group'),
                  dataIndex: 'name',
                  key: 'name',
                  render: (name, record) => (
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{name}</span>
                      <span className="text-gray-500 text-xs">{record.files.length}</span>
                    </div>
                  )
                },
                {
                  title: getMessage('common.action'),
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
              locale={{
                emptyText: (
                  <div className="py-4">
                    <Empty 
                      description={<span className="text-gray-400">{getMessage('fileGroup.noGroups')}</span>}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      className="custom-empty-state"
                    />
                  </div>
                )
              }}
            />
          </div>

          {/* Group Details Panel */}
          <div className="w-80 bg-gray-900 border-r border-gray-700 overflow-y-auto p-4">
            <FileGroupDetail 
              selectedGroup={selectedGroup}
              onFileSelect={handleFileSelect}
              onRemoveFile={handleRemoveFile}
              onUpdateDescription={async (groupName, description) => {
                try {
                  const response = await fetch(`/api/file-groups/${groupName}/files`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description }),
                  });
                  
                  if (!response.ok) throw new Error('Failed to update description');
                  
                  if (selectedGroup) {
                    selectedGroup.description = description;
                  }
                  
                  return Promise.resolve();
                } catch (error) {
                  return Promise.reject(error);
                }
              }}
              onAddExternalFile={() => setIsExternalFileModalVisible(true)}
            />
          </div>

          {/* 使用新的 FileDirectorySelector 组件替换原来的 File Tree 部分 */}
          <div className="min-w-[16rem] max-w-[16rem] bg-gray-900 border-r border-gray-700 overflow-hidden">
            <div className="h-full w-full overflow-x-auto overflow-y-auto">
              <FileDirectorySelector
                treeData={treeData}
                checkedKeys={checkedKeys}
                onCheckedKeysChange={setCheckedKeys}
                onFileSelect={handleFileSelect}
                onAddFiles={handleAddFiles}
                selectedGroup={selectedGroup}
                onRefreshTree={fetchFileTree}
              />
            </div>
          </div>

          {/* File Preview */}
          <div className="flex-1 bg-gray-900">
            {selectedFile ? (
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
            ) : (
              <div className="h-full flex items-center justify-center">
                <Empty 
                  description={
                    <span className="text-gray-400">{getMessage('fileGroup.selectFile')}</span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className="custom-empty-state"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* External File Modal */}
      <Modal
        title={getMessage('fileGroup.addExternalFile')}
        open={isExternalFileModalVisible}
        className="dark-theme-modal"
        styles={{
          content: {
            backgroundColor: '#1f2937',
            padding: '20px',
          },
          header: {
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          },
          body: {
            backgroundColor: '#1f2937',
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          },
        }}
        onOk={async () => {
          if (!selectedGroup || !externalFilePath.trim()) return;

          const pathTrimmed = externalFilePath.trim();

          // 判断是否为http/https链接
          const isHttpUrl = pathTrimmed.startsWith('http://') || pathTrimmed.startsWith('https://');

          try {
            let filesToAdd: string[] = [];

            if (isHttpUrl) {
              // 直接添加这个URL
              filesToAdd = [pathTrimmed];
            } else {
              // 调用 /api/list-files 获取文件列表
              const encodedPath = encodeURIComponent(pathTrimmed);
              const response = await fetch(`/api/list-files?dir_path=${encodedPath}`);
              if (!response.ok) throw new Error('Failed to list files');
              const data = await response.json();

              if (Array.isArray(data)) {
                filesToAdd = data.map((item: { path: string }) => item.path);
              } else {
                message.error(getMessage('fileGroup.unexpectedResponse'));
                return;
              }
            }

            // 调用添加接口
            await fetch(`/api/file-groups/${selectedGroup.name}/files`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ files: filesToAdd }),
            });

            message.success(getMessage('fileGroup.externalFileSuccess'));
            setIsExternalFileModalVisible(false);
            setExternalFilePath('');
            fetchFileGroups();

            // Refresh selected group data
            const updatedGroups = await (await fetch('/api/file-groups')).json();
            const updatedGroup = updatedGroups.groups.find((g: FileGroup) => g.name === selectedGroup.name);
            if (updatedGroup) {
              setSelectedGroup(updatedGroup);
            }
          } catch (error) {
            console.error(error);
            message.error(getMessage('fileGroup.externalFileFailed'));
          }
        }}
        onCancel={() => {
          setIsExternalFileModalVisible(false);
          setExternalFilePath('');
        }}
        okButtonProps={{ disabled: !externalFilePath.trim() }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">{getMessage('fileGroup.externalFilePath')}</label>
            <Input
              value={externalFilePath}
              onChange={(e) => setExternalFilePath(e.target.value)}
              placeholder={getMessage('fileGroup.externalFilePathPlaceholder')}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </div>
        </div>
      </Modal>

      {/* New Group Modal */}
      <Modal
        title={getMessage('fileGroup.createNewGroup')}
        open={isModalVisible}
        onOk={handleCreateGroup}
        onCancel={() => setIsModalVisible(false)}
        okButtonProps={{ disabled: !newGroupName.trim() }}
        className="dark-theme-modal"
        styles={{
          content: {
            backgroundColor: '#1f2937',
            padding: '20px',
          },
          header: {
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          },
          body: {
            backgroundColor: '#1f2937',
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          },
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">{getMessage('fileGroup.groupName')}</label>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={getMessage('fileGroup.groupNamePlaceholder')}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">{getMessage('fileGroup.description')}</label>
            <Input.TextArea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder={getMessage('fileGroup.descriptionPlaceholder')}
              rows={4}
              className="bg-gray-800 border-gray-700 text-gray-200"
            />
          </div>
        </div>
      </Modal>

      {/* Auto Group Modal */}
      <Modal
        title="Auto Create Groups"
        open={isAutoGroupModalVisible}
        onOk={async () => {
          setIsAutoGroupLoading(true);
            try {
              const response = await fetch('/api/file-groups/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  file_size_limit: fileSizeLimit,
                  group_num_limit: groupNumLimit,
                  skip_diff: skipDiff 
                }),
              });

              if (!response.ok) throw new Error('Failed to auto create groups');
              
              const data = await response.json();
              if (data.groups && Array.isArray(data.groups)) {
                setGroupResults(data.groups.map((group: any) => ({
                  ...group,
                  selected: true
                })));
                setIsGroupResultsModalVisible(true);
              }

              await fetchFileGroups();
              setIsAutoGroupModalVisible(false);
          } catch (error) {
            message.error('Failed to create groups automatically');
          } finally {
            setIsAutoGroupLoading(false);
          }
        }}
        onCancel={() => {
          if (!isAutoGroupLoading) {
            setIsAutoGroupModalVisible(false);
          }
        }}
        confirmLoading={isAutoGroupLoading}
        okButtonProps={{ loading: isAutoGroupLoading }}
        cancelButtonProps={{ disabled: isAutoGroupLoading }}
        className="dark-theme-modal"
        styles={{
          content: {
            backgroundColor: '#1f2937',
            padding: '20px',
          },
          header: {
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          },
          body: {
            backgroundColor: '#1f2937',
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          },
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Number of Latest Files to Process
            </label>
            <Input
              type="number"
              value={fileSizeLimit}
              onChange={(e) => setFileSizeLimit(parseInt(e.target.value) || 100)}
              placeholder="Default: 100"
              className="dark-theme-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Maximum Number of Groups
            </label>
            <Input
              type="number"
              value={groupNumLimit}
              onChange={(e) => setGroupNumLimit(parseInt(e.target.value) || 10)}
              placeholder="Default: 10"
              className="dark-theme-input"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={skipDiff}
              onChange={setSkipDiff}
              className="bg-gray-600"
            />
            <span className="text-gray-200">Skip Git Diff Information</span>
          </div>
        </div>
      </Modal>

      {/* Group Results Selection Modal */}
      <Modal
        title="Select Groups to Create"
        open={isGroupResultsModalVisible}
        onOk={async () => {
            try {
              const selectedGroups = groupResults.filter(group => group.selected);
              
              for (const group of selectedGroups) {
                await fetch('/api/file-groups', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    name: group.name,
                    description: group.description
                  }),
                });
              }

              await fetchFileGroups();
              message.success('Selected groups created successfully');
              setIsGroupResultsModalVisible(false);
          } catch (error) {
            message.error('Failed to create selected groups');
          }
        }}
        onCancel={() => {
          setIsGroupResultsModalVisible(false);
          setGroupResults([]);
        }}
        width={800}
        className="dark-theme-modal"
        styles={{
          content: {
            backgroundColor: '#1f2937',
            padding: '20px',
          },
          header: {
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          },
          body: {
            backgroundColor: '#1f2937',
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          },
        }}
      >
        <div className="space-y-4">
          {groupResults.map((group, index) => (
            <div key={index} className="p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={group.selected}
                  onChange={(e) => {
                    const newResults = [...groupResults];
                    newResults[index].selected = e.target.checked;
                    setGroupResults(newResults);
                  }}
                />
                <div className="flex-1">
                  <h3 className="text-white font-medium text-lg">{group.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{group.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default FileGroupPanel;