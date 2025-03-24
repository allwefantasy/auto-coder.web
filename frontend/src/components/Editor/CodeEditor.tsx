import React, { useEffect, useState } from 'react';
import { message, Tabs } from 'antd';
import type { DataNode } from 'antd/es/tree';
import Split from 'react-split';
import { getLanguageByFileName } from '../../utils/fileUtils';
import FileTree from './components/FileTree';
import MonacoEditor from './components/MonacoEditor';
import { FileMetadata } from '../../types/file_meta';
import './CodeEditor.css';

interface CodeEditorProps {
  selectedFiles?: FileMetadata[];
}

interface FileTab {
  key: string;
  label: string;
  content: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ selectedFiles: initialFiles }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>(initialFiles || []);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileTabs, setFileTabs] = useState<FileTab[]>([]);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (initialFiles) {
      setSelectedFiles(initialFiles);
      initialFiles.forEach(file => {
        loadFileContent(file.path);
      });
      if (initialFiles.length > 0) {
        setActiveFile(initialFiles[0].path);
      }
    }
  }, [initialFiles]);

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
      
      setFileTabs(prev => {
        const existingTab = prev.find(tab => tab.key === filePath);
        if (existingTab) {
          return prev.map(tab => 
            tab.key === filePath ? { ...tab, content: data.content } : tab
          );
        }
        return [...prev, {
          key: filePath,
          label: filePath.split('/').pop() || filePath,
          content: data.content
        }];
      });
    } catch (error) {
      console.error('Error fetching file content:', error);
      message.error(`Failed to load ${filePath}`);
    }
  };

  const fetchFileTree = async () => {
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
    if (!activeFile || saving) return;
    
    try {
      setSaving(true);
      const currentTab = fileTabs.find(tab => tab.key === activeFile);
      if (!currentTab) return;

      const response = await fetch(`/api/file/${activeFile}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: currentTab.content })
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
      const newFile: FileMetadata = { path: key, isSelected: true };
      if (!selectedFiles.some(f => f.path === key)) {
        setSelectedFiles(prev => [...prev, newFile]);
      }
      setActiveFile(key);
      loadFileContent(key);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveFile(key);
  };

  const handleTabEdit = (targetKey: any, action: 'add' | 'remove') => {
    if (typeof targetKey !== 'string') return;
    
    if (action === 'remove') {
      setFileTabs(prev => prev.filter(tab => tab.key !== targetKey));
      setSelectedFiles(prev => prev.filter(file => file.path !== targetKey));
      if (activeFile === targetKey && fileTabs.length > 0) {
        setActiveFile(fileTabs[0].key);
      }
    }
  };

  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        <div className="code-editor-header-content">
          <div className="file-info">
            <span className="file-path">
              {activeFile || 'No file selected'}
            </span>
          </div>
          {activeFile && (
            <button
              onClick={handleSave}
              disabled={!activeFile}
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
          <Tabs
            type="editable-card"
            onChange={handleTabChange}
            onEdit={handleTabEdit}
            activeKey={activeFile || undefined}
          >
            {fileTabs.map(tab => {
              const fileMeta = selectedFiles.find(f => f.path === tab.key);
              return (
                <Tabs.TabPane
                  key={tab.key}
                  tab={
                    <span style={{ 
                      color: fileMeta?.modifiedBy === 'expert_chat_box' ? '#ff4d4f' : 'inherit'
                    }}>
                      {tab.label}
                    </span>
                  }
                  closable={true}
                >
                  <MonacoEditor
                    code={tab.content}
                    language={getLanguageByFileName(tab.key)}
                    onChange={(value) => {
                      setFileTabs(prev => 
                        prev.map(t => 
                          t.key === tab.key ? { ...t, content: value || '' } : t
                        )
                      );
                    }}
                  />
                </Tabs.TabPane>
              );
            })}
          </Tabs>
        </div>
      </Split>
    </div>
  );
};

export default CodeEditor;
