import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import Split from 'react-split';
import { getLanguageByFileName } from '../../utils/fileUtils';
import FileTree from './components/FileTree';
import MonacoEditor from './components/MonacoEditor';
import './CodeEditor.css';

interface CodeEditorProps {
  selectedFile?: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ selectedFile: initialFile }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFile || null);
  const [code, setCode] = useState<string>('// Select a file to edit');
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      loadFileContent(initialFile);
    }
  }, [initialFile]);

  useEffect(() => {
    fetchFileTree();
  }, []);

  const loadFileContent = async (filePath: string) => {
    try {
      const response = await fetch(`/api/file/${filePath}`);
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
          icon: isLeaf ? 'file' : 'folder',
          children: node.children ? node.children.map(transformNode) : undefined,
          isLeaf,
        };
      };
      
      const transformedTree = data.tree.map(transformNode);
      setTreeData(transformedTree);
    } catch (error) {
      console.error('Error fetching file tree:', error);
    }
  };

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

  const handleSelect = async (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    if (key && info.node.isLeaf) {
      setSelectedFile(key);
      loadFileContent(key);
    }
  };

  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        <div className="code-editor-header-content">
          <div className="file-info">
            <span className="file-path">
              {selectedFile || 'No file selected'}
            </span>
          </div>
          {selectedFile && (
            <button
              onClick={handleSave}
              disabled={!code}
              className="save-button"
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

      <Split 
        className="code-editor-content"
        sizes={[20, 80]} 
        minSize={100}
        expandToMin={false}
        gutterSize={10}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
      >
        <div className="file-tree-panel">
          <FileTree 
            treeData={treeData} 
            onSelect={handleSelect} 
            onRefresh={fetchFileTree}
          />
        </div>
        <div className="editor-panel">
          <MonacoEditor
            code={code}
            language={getLanguageByFileName(selectedFile || '')}
            onChange={(value) => setCode(value || '')}
          />
        </div>
      </Split>
    </div>
  );
};

export default CodeEditor;
