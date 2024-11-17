import React from 'react';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Tabs } from 'antd';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface CodeBlock {
  file_path: string;
  new_block: string;
  old_block: string;
}

interface EditorTab {
  key: string;
  blocks: CodeBlock[];
  activeBlock: number;
}

const CodePreview: React.FC = () => {
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    const handleStorageChange = () => {
      const storedBlocks = sessionStorage.getItem('previewBlocks');
      if (storedBlocks) {
        const blocks: CodeBlock[] = JSON.parse(storedBlocks);
        const newTabs = organizeBlocksIntoTabs(blocks);
        setEditorTabs(newTabs);
        if (newTabs.length > 0) {
          setActiveTab(newTabs[0].key);
        }
      }
    };

    // Initial load
    handleStorageChange();

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const organizeBlocksIntoTabs = (blocks: CodeBlock[]): EditorTab[] => {
    const tabsMap = new Map<string, CodeBlock[]>();
    
    blocks.forEach(block => {
      const fileBlocks = tabsMap.get(block.file_path) || [];
      fileBlocks.push(block);
      tabsMap.set(block.file_path, fileBlocks);
    });

    return Array.from(tabsMap.entries()).map(([filePath, blocks]) => ({
      key: filePath,
      blocks: blocks,
      activeBlock: 0
    }));
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleBlockChange = (tabKey: string, blockIndex: number) => {
    setEditorTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.key === tabKey ? { ...tab, activeBlock: blockIndex } : tab
      )
    );
  };

  const getCurrentContent = (tab: EditorTab) => {
    const block = tab.blocks[tab.activeBlock];
    return block.new_block;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        items={editorTabs.map(tab => ({
          key: tab.key,
          label: tab.key.split('/').pop(),
          children: (
            <div className="h-full flex flex-col">
              <div className="flex space-x-2 p-2 bg-gray-800">
                {tab.blocks.map((block, index) => (
                  <button
                    key={index}
                    className={`px-3 py-1 rounded ${
                      tab.activeBlock === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    onClick={() => handleBlockChange(tab.key, index)}
                  >
                    Change {index + 1}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getLanguageByFileName(tab.key)}
                  value={getCurrentContent(tab)}
                  theme="vs-dark"
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
          ),
        }))}
        className="flex-1 bg-gray-900"
      />
    </div>
  );
};

export default CodeEditor;