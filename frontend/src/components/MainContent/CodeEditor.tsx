import React, { useEffect, useState } from 'react';
import { Tree, Dropdown, Modal, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import Editor from '@monaco-editor/react';
import { FolderOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons';
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
        <div className="flex items-center">
          <span className="text-white text-sm">
            {selectedFile || 'No file selected'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto p-2">
            <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
              <Tree
                showIcon
                defaultExpandAll
                onSelect={handleSelect}
                onRightClick={handleRightClick}
                treeData={treeData}
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