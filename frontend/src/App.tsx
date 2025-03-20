import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Modal, Input, List, Switch } from 'antd';
import AutoModePage from './components/AutoMode';
import { ExpertModePage } from './components/ExpertMode';
import { getMessage, initLanguage } from './components/Sidebar/lang';
import './App.css';


const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'todo' | 'code' | 'filegroup' | 'preview' | 'clipboard' | 'history' | 'settings'>('todo');
  const [activeToolPanel, setActiveToolPanel] = useState<string>('terminal');
  const [clipboardContent, setClipboardContent] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [previewFiles, setPreviewFiles] = useState<{ path: string, content: string }[]>([]);
  const [requestId, setRequestId] = useState<string>('');
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string, path: string, display: string}>>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null); // State for selected file
  const [isExpertMode, setIsExpertMode] = useState(false); // Toggle between expert and auto mode, default to auto mode
  const searchInputRef = useRef<any>(null);

  const handleFileSearch = useCallback(async (term: string) => {
    if (!term) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/completions/files?name=${encodeURIComponent(term)}`);
      const data = await response.json();
      setSearchResults(data.completions);
    } catch (error) {
      console.error('Error fetching file completions:', error);
    }
  }, []);

  const openFileInEditor = useCallback((path: string) => {
    setSelectedFile(path);
    setIsFileSearchOpen(false);
    setSearchTerm('');
    setActivePanel('code');
  }, []);

  // Add global hotkey
  useHotkeys(
    ['meta+p', 'ctrl+p'],
    (event) => {
      event.preventDefault();
      setIsFileSearchOpen(true);
    },
    { 
      enableOnFormTags: true,
      preventDefault: true
    }
  );

  useEffect(() => {
    // 初始化语言设置
    initLanguage().then(() => {
      // 其他初始化逻辑
      fetch('/api/project-path')
        .then(response => response.json())
        .then(data => {
          const path = data.project_path;
          const name = path ? path.split('/').pop() : '';
          setProjectName(name);
        })
        .catch(error => console.error('Error fetching project path:', error));
    });
  }, []);

  useEffect(() => {
    if (isFileSearchOpen && searchInputRef.current) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFileSearchOpen]);

  // Toggle between expert and auto modes
  const toggleMode = () => {
    setIsExpertMode(!isExpertMode);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Mode Toggle */}
      <div className="bg-gray-800 p-2 border-b border-gray-700 flex justify-end items-center space-x-2">
        <span className="text-gray-400 text-sm">{getMessage('autoMode')}</span>
        <Switch 
          checked={isExpertMode} 
          onChange={toggleMode} 
          size="small"
          className="bg-gray-600"
        />
        <span className="text-gray-400 text-sm">{getMessage('expertMode')}</span>
      </div>

      {/* Auto Mode Interface */}
      {!isExpertMode && (
        <AutoModePage 
          projectName={projectName} 
          onSwitchToExpertMode={() => setIsExpertMode(true)} 
        />
      )}

      {/* Expert Mode Interface */}
      {isExpertMode && (
        <ExpertModePage
          projectName={projectName}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          clipboardContent={clipboardContent}
          setClipboardContent={setClipboardContent}
          previewFiles={previewFiles}
          setPreviewFiles={setPreviewFiles}
          requestId={requestId}
          setRequestId={setRequestId}
          selectedFile={selectedFile}
          onSwitchToAutoMode={() => setIsExpertMode(false)}
        />
      )}
      {/* File Search Modal */}
      <Modal
        title={getMessage('searchFiles')}
        open={isFileSearchOpen}
        onCancel={() => {
          setIsFileSearchOpen(false);
          setSearchTerm('');
          setSearchResults([]);
        }}
        footer={null}
        width={600}
        className="dark-theme-modal"
        styles={{
          content: {
            backgroundColor: '#1f2937',
            padding: '20px',
          },
          header: {
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          },
          body: {
            backgroundColor: '#1f2937',
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          },
        }}
      >
        <div className="my-4">
          <Input
            ref={searchInputRef}
            autoFocus
            placeholder={getMessage('searchFilesPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleFileSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsFileSearchOpen(false);
                setSearchTerm('');
                setSearchResults([]);
              }
            }}
            className="dark-theme-input bg-gray-800 text-gray-200 border-gray-700"
            style={{
              backgroundColor: '#1f2937',
              borderColor: '#374151',
              color: '#e5e7eb',
            }}
          />
        </div>
        <List
          dataSource={searchResults}
          className="dark-theme-list max-h-96 overflow-y-auto"
          renderItem={(item) => (
            <List.Item
              className="cursor-pointer hover:bg-gray-700 text-gray-200 border-gray-700"
              onClick={() => openFileInEditor(item.path)}
            >
              <div className="flex flex-col">
                <span className="text-white">{item.display}</span>
                <span className="text-gray-400 text-sm">{item.path}</span>
              </div>
            </List.Item>
          )}          
        />
      </Modal>
      </div>

      
  );
};

export default App;
