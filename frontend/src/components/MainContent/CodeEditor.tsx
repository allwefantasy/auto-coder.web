import React, { useEffect, useState } from 'react';
import { Tree, Dropdown, Modal, message, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import Editor from '@monaco-editor/react';
import { FolderOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface CodeEditorProps {
  selectedFile?: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ selectedFile: initialFile }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFile || null);

  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      // 加载文件内容
      const loadFile = async () => {
        try {
          const response = await fetch(`/api/file/${initialFile}`);
          if (!response.ok) {
            throw new Error('Failed to fetch file content');
          }
          const data = await response.json();
          setCode(data.content);
        } catch (error) {
          console.error('Error fetching file content:', error);
          setCode('// Error loading file content');
        }
      };
      loadFile();
    }
  }, [initialFile]);
  const [code, setCode] = useState<string>('// Select a file to edit');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [filteredTreeData, setFilteredTreeData] = useState<DataNode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const handleSave = async () => {
    if (!selectedFile || saving) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/file/${selectedFile}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: code })
      });

      if (!response.ok) {
        throw new Error('Failed to save file');
      }

      message.success('File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
      message.error('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchFileTree = async () => {
      try {
        const response = await fetch('/api/files');
        if (!response.ok) {
          throw new Error('Failed to fetch file tree');
        }
        const data = await response.json();
        
        // Transform the tree data to include icons
        const transformNode = (node: any): DataNode => {
          const isLeaf = node.isLeaf;
          return {
            title: node.title,
            key: node.key,
            icon: isLeaf ? <FileOutlined /> : <FolderOutlined />,
            children: node.children ? node.children.map(transformNode) : undefined,
            isLeaf,
          };
        };
        
        const transformedTree = data.tree.map(transformNode);
        setTreeData(transformedTree);
        setFilteredTreeData(transformedTree);
      } catch (error) {
        console.error('Error fetching file tree:', error);
      }
    };

    fetchFileTree();
  }, []);

  const handleSelect = async (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    if (key && info.node.isLeaf) {
      setSelectedFile(key);
      try {
        const response = await fetch(`/api/file/${key}`);
        if (!response.ok) {
          throw new Error('Failed to fetch file content');
        }
        const data = await response.json();
        setCode(data.content);
      } catch (error) {
        console.error('Error fetching file content:', error);
        setCode('// Error loading file content');
      }
    }
  };

  const [contextMenuNode, setContextMenuNode] = useState<DataNode | null>(null);

  const handleDelete = async (node: DataNode) => {
    try {
      const response = await fetch(`/api/files/${node.key}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      message.success(`Successfully deleted ${node.title}`);
      
      // Refresh the file tree
      const response2 = await fetch('/api/files');
      if (response2.ok) {
        const data = await response2.json();
        const transformNode = (node: any): DataNode => {
          const isLeaf = node.isLeaf;
          return {
            title: node.title,
            key: node.key,
            icon: isLeaf ? <FileOutlined /> : <FolderOutlined />,
            children: node.children ? node.children.map(transformNode) : undefined,
            isLeaf,
          };
        };
        setTreeData(data.tree.map(transformNode));
      }
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

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (isRefreshing) return;
                setIsRefreshing(true);
                try {
                  const response = await fetch('/api/files');
                  if (!response.ok) {
                    throw new Error('Failed to fetch file tree');
                  }
                  const data = await response.json();
                  const transformNode = (node: any): DataNode => {
                    const isLeaf = node.isLeaf;
                    return {
                      title: node.title,
                      key: node.key,
                      icon: isLeaf ? <FileOutlined /> : <FolderOutlined />,
                      children: node.children ? node.children.map(transformNode) : undefined,
                      isLeaf,
                    };
                  };
                  setTreeData(data.tree.map(transformNode));
                  setFilteredTreeData(data.tree.map(transformNode));
                  message.success('Refreshed file tree successfully');
                } catch (error) {
                  message.error('Failed to refresh file tree');
                  console.error('Error fetching file tree:', error);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              className="text-gray-400 hover:text-white transition-colors"
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
            <span className="text-white text-sm">
              {selectedFile || 'No file selected'}
            </span>
          </div>
          {selectedFile && (
            <button
              onClick={handleSave}
              disabled={!code}
              className="px-3 py-1.5 bg-blue-600 text-sm text-white rounded-md
                hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto p-2">
            <div className="mb-4">
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
            <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
              <Tree
                showIcon
                defaultExpandAll
                onSelect={handleSelect}
                onRightClick={handleRightClick}
                treeData={filteredTreeData}
                className="bg-gray-900 text-gray-300"
              />
            </Dropdown>
          </div>          
          <div className="flex-1 bg-gray-900">            
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              language={getLanguageByFileName(selectedFile || '')}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
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
    </div>
  );
};

export default CodeEditor;