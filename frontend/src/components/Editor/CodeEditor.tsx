import React, { useEffect, useState } from 'react';
import { message, Tabs, Dropdown, Menu } from 'antd';
import type { DataNode } from 'antd/es/tree';
import Split from 'react-split';
import { getLanguageByFileName } from '../../utils/fileUtils';
import FileTree from './components/FileTree';
import MonacoEditor from './components/MonacoEditor';
import { FileMetadata } from '../../types/file_meta';
import eventBus, { EVENTS } from '../../services/eventBus';
import { getMessage } from '../Sidebar/lang'; // Import getMessage for i18n
import axios from 'axios';
import { queryToString } from '@/utils/formatUtils'
import './CodeEditor.css';

interface CodeEditorProps {
  selectedFiles?: FileMetadata[];
}

interface FileTab {
  key: string;
  label: string;
  content: string;
}

interface EditorTab {
  path: string;
  label: string;
  isActive: boolean;
}

interface EditorTabsConfig {
  tabs: EditorTab[];
  activeTabPath: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ selectedFiles: initialFiles }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>(initialFiles || []);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileTabs, setFileTabs] = useState<FileTab[]>([]);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (fileTabs.length > 0) {
      const openedFiles = fileTabs.map(tab => ({
        path: tab.key,
        isSelected: tab.key === activeFile,
        label: tab.label
      }));
      eventBus.publish(EVENTS.EDITOR.TABS_CHANGED, openedFiles);

      // 保存标签页状态到后端
      saveTabsToBackend();
    }
  }, [fileTabs, activeFile]);

  useEffect(() => {
    // 加载保存的标签页状态
    loadTabsFromBackend().then(savedTabs => {
      if (initialFiles && initialFiles.length > 0) {
        // 如果有初始文件，优先处理它们
        setSelectedFiles(initialFiles);
        initialFiles.forEach(file => {
          loadFileContent(file.path);
        });
        if (initialFiles.length > 0) {
          setActiveFile(initialFiles[0].path);
        }
      } else if (savedTabs && savedTabs.tabs.length > 0) {
        // 否则，加载保存的标签页
        savedTabs.tabs.forEach(tab => {
          loadFileContent(tab.path);
        });
        if (savedTabs.activeTabPath) {
          setActiveFile(savedTabs.activeTabPath);
        } else if (savedTabs.tabs.length > 0) {
          setActiveFile(savedTabs.tabs[0].path);
        }
      }
    });
  }, [initialFiles]);

  useEffect(() => {
    fetchFileTree();
  }, []);

  // 加载保存的标签页状态
  const loadTabsFromBackend = async (): Promise<EditorTabsConfig | null> => {
    try {
      const response = await axios.get<EditorTabsConfig>('/api/editor/tabs');
      return response.data;
    } catch (error) {
      console.error('加载编辑器标签页配置失败:', error);
      return null;
    }
  };

  // 保存标签页状态到后端
  const saveTabsToBackend = async () => {
    try {
      const tabs: EditorTab[] = fileTabs.map(tab => ({
        path: tab.key,
        label: tab.label,
        isActive: tab.key === activeFile
      }));

      await axios.put('/api/editor/tabs', tabs);
    } catch (error) {
      console.error('保存编辑器标签页失败:', error);
    }
  };

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

        const newTab = {
          key: filePath,
          label: filePath.split('/').pop() || filePath,
          content: data.content
        };

        // 添加新标签到后端
        try {
          axios.post('/api/editor/tabs', {
            path: filePath,
            label: newTab.label,
            isActive: activeFile === null // 如果没有活跃标签，则将新标签设为活跃
          });
        } catch (error) {
          console.error('添加标签页失败:', error);
        }

        return [...prev, newTab];
      });
    } catch (error) {
      console.error('Error fetching file content:', error);
      message.error(getMessage('codeEditor.loadFailed', { filePath }));
    }
  };

  const fetchFileTree = async (path = '') => {
    try {
      const response = await fetch(`/api/files${queryToString({ lazy: true, path })}`);
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
      if (!path) {
        setTreeData(transformedTree);
        return
      }
   
      const pathList = path.split('\\')
      let i = 0
      const findCurPathData = (list: DataNode[]) => {
        if (!list || !list.length) return
        for (let k = 0; k < list.length; k++) {
          const item = list[k]
          const { children, title, isLeaf } = item
          if (isLeaf) continue
          const _pathName = pathList[i]
          if (title !== _pathName) continue

          if (pathList[++i]) {
            return findCurPathData(children!)
          }
          return item
        }
      }
      // 找到对应目录并更新数据
      const _data = findCurPathData(treeData)
      if (!_data) return
      _data.children = data.tree.map(transformNode)
      setTreeData([...treeData]);
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

      message.success(getMessage('codeEditor.saveSuccess'));
    } catch (error) {
      console.error('Error saving file:', error);
      message.error(getMessage('codeEditor.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = async (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    if (!key) return

    const { isLeaf, key: filePath ,children} = info.node
    if (isLeaf) {
      const newFile: FileMetadata = { path: key, isSelected: true };
      if (!selectedFiles.some(f => f.path === key)) {
        setSelectedFiles(prev => [...prev, newFile]);
      }
      setActiveFile(key);
      loadFileContent(key);
      return
    }

    await fetchFileTree(filePath)
  };

  const handleTabChange = async (key: string) => {
    setActiveFile(key);

    // 更新后端活跃标签
    try {
      await axios.put('/api/editor/active-tab', { path: key });
    } catch (error) {
      console.error('更新活跃标签失败:', error);
    }
  };

  const handleTabEdit = async (targetKey: any, action: 'add' | 'remove') => {
    if (action === 'remove') {
      setFileTabs(prev => prev.filter(tab => tab.key !== targetKey));
      setSelectedFiles(prev => prev.filter(file => file.path !== targetKey));

      if (activeFile === targetKey) {
        // 如果关闭的是当前活跃标签，切换到第一个标签
        const remainingTabs = fileTabs.filter(tab => tab.key !== targetKey);
        if (remainingTabs.length > 0) {
          setActiveFile(remainingTabs[0].key);
        } else {
          setActiveFile(null);
        }
      }

      // 从后端删除标签
      try {
        await axios.delete(`/api/editor/tabs/${targetKey}`);
      } catch (error) {
        console.error('删除标签页失败:', error);
      }
    }
  };

  const handleCopyPath = (filePath: string) => {
    navigator.clipboard.writeText(filePath)
      .then(() => {
        message.success(getMessage('codeEditor.copyPathSuccess'));
      })
      .catch(err => {
        console.error('Failed to copy file path: ', err);
        message.error(getMessage('codeEditor.copyPathFailed'));
      });
  };

  const handleCloseOtherTabs = async (filePathToKeep: string) => {
    setFileTabs(prev => prev.filter(tab => tab.key === filePathToKeep));
    setSelectedFiles(prev => prev.filter(file => file.path === filePathToKeep));
    // The active file should already be the one clicked, but ensure it stays active
    if (activeFile !== filePathToKeep) {
      setActiveFile(filePathToKeep);
    }

    // 更新后端标签状态
    try {
      const tabs: EditorTab[] = [{
        path: filePathToKeep,
        label: filePathToKeep.split('/').pop() || filePathToKeep,
        isActive: true
      }];

      await axios.put('/api/editor/tabs', tabs);
    } catch (error) {
      console.error('更新标签页失败:', error);
    }
  };

  const handleRefreshTab = async (filePath: string) => {
    // 重新加载文件内容
    await loadFileContent(filePath);
    const fileName = filePath.split('/').pop() || filePath;
    message.success(getMessage('codeEditor.refreshSuccess', { fileName }));
  };

  const renderContextMenu = (filePath: string, label: string) => (
    <Menu>
      <Menu.Item key="refresh" onClick={() => handleRefreshTab(filePath)}>
        {getMessage('codeEditor.refresh')}
      </Menu.Item>
      <Menu.Item key="copyPath" onClick={() => handleCopyPath(filePath)}>
        {getMessage('codeEditor.copyPath')}
      </Menu.Item>
      <Menu.Item key="closeOthers" onClick={() => handleCloseOtherTabs(filePath)}>
        {getMessage('codeEditor.closeOtherTabs')}
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        <div className="code-editor-header-content">
          <div className="file-info">
            <span className="file-path">
              {activeFile || getMessage('codeEditor.noFileSelected')}
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
              {getMessage('codeEditor.save')}
            </button>
          )}
        </div>
      </div>

      <Split
        className="code-editor-content"
        sizes={[20, 80]}
        minSize={[300,300]}
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
                    <Dropdown overlay={renderContextMenu(tab.key, tab.label)} trigger={['contextMenu']} overlayClassName="vscode-dark-dropdown">
                      <span style={{
                        color: fileMeta?.modifiedBy === 'expert_chat_box' ? '#ff4d4f' : 'inherit',
                        display: 'inline-block' // Necessary for Dropdown trigger
                      }}>
                        {tab.label}
                      </span>
                    </Dropdown>
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
