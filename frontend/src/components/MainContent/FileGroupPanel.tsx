import React, { useState, useEffect } from 'react';
import { Tree, Input, Button, Modal, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import Editor from '@monaco-editor/react';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface FileGroup {
  name: string;
  description: string;
  files: string[];
}

const FileGroupPanel: React.FC = () => {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<FileGroup | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

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
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              {fileGroups.map((group) => (
                <div
                  key={group.name}
                  className={`p-3 rounded-lg ${
                    selectedGroup?.name === group.name
                      ? 'bg-blue-600'
                      : 'bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => setSelectedGroup(group)}
                    >
                      <h3 className="text-white font-medium">{group.name}</h3>
                      <p className="text-gray-400 text-sm mt-1">{group.description}</p>
                    </div>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteGroup(group.name)}
                    />
                  </div>
                  {group.files.length > 0 && (
                    <div 
                      className="mt-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        const element = e.currentTarget.nextElementSibling;
                        if (element) {
                          element.classList.toggle('hidden');
                        }
                      }}
                    >
                      {group.files.length} files {'>'}
                    </div>
                  )}
                  <div className="mt-2 space-y-1 hidden">
                    {group.files.map((file) => (
                      <div
                        key={file}
                        className="flex justify-between items-center text-sm text-gray-300 py-1 px-2 rounded hover:bg-gray-700"
                      >
                        <span
                          className="cursor-pointer flex-1"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(file);
                        }}
                        >
                          {file}
                        </span>
                        <DeleteOutlined
                          className="text-red-400 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(group.name, file);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Tree */}
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-2">
              <div className="mb-4">
                <Button
                  type="primary"
                  onClick={handleAddFiles}
                  disabled={!selectedGroup || checkedKeys.length === 0}
                  block
                >
                  Add Selected Files
                </Button>
              </div>
              <Tree
                checkable
                treeData={treeData}
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

          {/* File Preview */}
          <div className="flex-1 bg-gray-900">
            <Editor
              height="100%"
              defaultLanguage={getLanguageByFileName(selectedFile || '')}
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