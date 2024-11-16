import React, { useState } from 'react';
import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import Editor from '@monaco-editor/react';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';

const treeData: DataNode[] = [
  {
    title: 'src',
    key: 'src',
    icon: <FolderOutlined />,
    children: [
      {
        title: 'index.tsx',
        key: 'src/index.tsx',
        icon: <FileOutlined />,
      },
      {
        title: 'App.tsx',
        key: 'src/App.tsx',
        icon: <FileOutlined />,
      },
    ],
  },
];

const CodeEditor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [code, setCode] = useState<string>('// Select a file to edit');

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    if (key && !key.endsWith('/')) {
      setSelectedFile(key);
      // Here you would typically load the file content
      setCode(`// Content of ${key}`);
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