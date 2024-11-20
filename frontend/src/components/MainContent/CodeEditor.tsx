import React, { useEffect, useState } from 'react';
import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import Editor from '@monaco-editor/react';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import { getLanguageByFileName } from '../../utils/fileUtils';

const CodeEditor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [code, setCode] = useState<string>('// Select a file to edit');
  const [treeData, setTreeData] = useState<DataNode[]>([]);

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
        
        setTreeData(data.tree.map(transformNode));
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

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center">
          <span className="text-white text-sm">
            {selectedFile || 'No file selected'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto p-2">
            <Tree
              showIcon
              defaultExpandAll
              onSelect={handleSelect}
              treeData={treeData}
              className="bg-gray-900 text-gray-300"
            />
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
import React, { useEffect, useState } from 'react';
import { Tree, Dropdown, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import { CodeOutlined, FolderOutlined } from '@ant-design/icons';
import { getLanguageByFileName } from '../../utils/fileUtils';
import { Editor } from '@monaco-editor/react';

interface FileTreeItem {
  title: string;
  key: string;
  children?: FileTreeItem[];
  isLeaf: boolean;
  hasChildren: boolean;
}

interface CodeEditorProps {
  onFileSelect: (filePath: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ onFileSelect }) => {
  const [treeData, setTreeData] = useState<FileTreeItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [rightClickedNode, setRightClickedNode] = useState<FileTreeItem | null>(null);

  useEffect(() => {
    fetchTreeData();
  }, []);

  const fetchTreeData = async (path?: string) => {
    try {
      const response = await fetch(`/api/files${path ? `?path=${encodeURIComponent(path)}` : ''}`);
      const data = await response.json();
      if (path) {
        // Update specific node's children
        updateTreeNode(data.tree, path);
      } else {
        setTreeData(data.tree);
      }
    } catch (error) {
      message.error('Failed to load file tree');
    }
  };

  const updateTreeNode = (newChildren: FileTreeItem[], path: string) => {
    const updateNode = (nodes: FileTreeItem[]): FileTreeItem[] => {
      return nodes.map(node => {
        if (node.key === path) {
          return { ...node, children: newChildren };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(prev => updateNode(prev));
  };

  const handleDelete = async () => {
    if (!rightClickedNode) return;

    Modal.confirm({
      title: 'Delete Confirmation',
      content: `Are you sure you want to delete ${rightClickedNode.title}?`,
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          const response = await fetch(`/api/files/${encodeURIComponent(rightClickedNode.key)}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete');
          }

          message.success('Successfully deleted');
          // Refresh the parent directory
          const parentPath = rightClickedNode.key.split('/').slice(0, -1).join('/');
          if (parentPath) {
            await fetchTreeData(parentPath);
          } else {
            await fetchTreeData();
          }
        } catch (error) {
          message.error('Failed to delete');
        }
      },
    });
  };

  const getContextMenuItems = (): MenuProps['items'] => {
    if (!rightClickedNode) return [];

    return [
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        onClick: handleDelete,
      },
    ];
  };

  const onLoadData = async (node: any) => {
    if (node.children || node.isLeaf) return;
    await fetchTreeData(node.key);
  };

  const onSelect = (selectedKeys: string[], info: any) => {
    setSelectedKeys(selectedKeys);
    if (info.node.isLeaf) {
      onFileSelect(info.node.key);
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <Dropdown
        menu={{ items: getContextMenuItems() }}
        trigger={['contextMenu']}
        open={!!rightClickedNode}
        onOpenChange={(open) => {
          if (!open) setRightClickedNode(null);
        }}
      >
        <div>
          <Tree
            treeData={treeData}
            selectedKeys={selectedKeys}
            loadData={onLoadData}
            onSelect={onSelect}
            onRightClick={({ node }) => {
              setRightClickedNode(node);
            }}
            icon={({ isLeaf }) =>
              isLeaf ? <CodeOutlined /> : <FolderOutlined />
            }
          />
        </div>
      </Dropdown>
    </div>
  );
};

export default CodeEditor;