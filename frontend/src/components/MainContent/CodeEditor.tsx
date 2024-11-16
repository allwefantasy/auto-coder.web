import React, { useEffect, useState } from 'react';
import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import Editor from '@monaco-editor/react';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';

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
              defaultLanguage="typescript"
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