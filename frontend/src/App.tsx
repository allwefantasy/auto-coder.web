import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Modal, Input, List } from 'antd';
import { Editor } from '@monaco-editor/react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import FileGroupPanel from './components/MainContent/FileGroupPanel';
import SettingsPanel from './components/MainContent/SettingsPanel';
import HistoryPanel from './components/MainContent/HistoryPanel';
import TerminalManager from './components/Terminal/TerminalManager';
import OutputPanel from './components/Terminal/OutputPanel';
import PreviewPanel from './components/MainContent/PreviewPanel';
import TodoPanel from './components/MainContent/TodoPanel';
import { getMessage,initLanguage } from './components/Sidebar/lang';
import Split from 'react-split';
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

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Split 
        className="flex-1 flex"
        sizes={[30, 70]}
        minSize={[200, 400]}
        gutterSize={4}
        snapOffset={30}
      >
      {/* Left Sidebar - Chat */}
      <div className="border-r border-gray-700 flex flex-col">

        <div className="bg-gray-800 p-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text font-bold text-sm">auto-coder.web</span>
            </div>
            <span className="text-gray-400">|</span>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">{getMessage('currentProject')}</span>
              <span className="text-gray-200 text-sm font-medium">
                {projectName || getMessage('noProjectSelected')}
              </span>
            </div>
          </div>
        </div>
        <ChatPanel
          setPreviewFiles={setPreviewFiles}
          setActivePanel={setActivePanel}
          setClipboardContent={setClipboardContent}
          clipboardContent={clipboardContent}
          setRequestId={setRequestId}
        />
      </div>

      {/* Right Content Area */}
      <div className="flex flex-col">
        <Split 
          direction="vertical"
          sizes={[75, 25]}
          minSize={[200, 100]}
          gutterSize={4}
          snapOffset={30}
          dragInterval={1}
          cursor="row-resize"
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          onDragEnd={() => {
            // 触发resize事件以更新Terminal大小
            window.dispatchEvent(new Event('resize'));
          }}
        >
        <div className="flex flex-col overflow-hidden">
          {/* Panel Switch Buttons */}
          <div className="bg-gray-800 p-2 border-b border-gray-700">
            <div className="flex space-x-2">
            <button
                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                  ${activePanel === 'todo'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('todo')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>{getMessage('todos')}</span>
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                  ${activePanel === 'history'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('history')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{getMessage('devHistory')}</span>
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                  ${activePanel === 'code'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('code')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>{getMessage('codeViewer')}</span>
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                  ${activePanel === 'filegroup'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('filegroup')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>{getMessage('fileGroups')}</span>
              </button>
              <div className="relative group">
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                    ${['preview', 'clipboard', 'settings'].includes(activePanel)
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                      : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                    } flex items-center space-x-2`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span>Tools</span>
                </button>
                <div className="absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="py-1">
                    <button
                      className={`w-full px-4 py-2 text-sm flex items-center space-x-2 ${
                        activePanel === 'preview'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                      onClick={() => setActivePanel('preview')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>{getMessage('previewChanges')}</span>
                    </button>
                    <button
                      className={`w-full px-4 py-2 text-sm flex items-center space-x-2 ${
                        activePanel === 'clipboard'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                      onClick={() => setActivePanel('clipboard')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{getMessage('clipboard')}</span>
                    </button>
                    <button
                      className={`w-full px-4 py-2 text-sm flex items-center space-x-2 ${
                        activePanel === 'settings'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                      onClick={() => setActivePanel('settings')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{getMessage('settings')}</span>
                    </button>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* Upper Section - Dynamic Content */}
          <div className="flex-1 overflow-hidden">
            <div className={`h-full ${activePanel === 'code' ? 'block' : 'hidden'}`}>
              <CodeEditor selectedFile={selectedFile} />
            </div>
            <div className={`h-full ${activePanel === 'filegroup' ? 'block' : 'hidden'}`}>
              <FileGroupPanel />
            </div>
            <div className={`h-full ${activePanel === 'clipboard' ? 'block' : 'hidden'}`}>
              <div className="h-full p-4">
                <Editor
                  theme="vs-dark"
                  height="100%"
                  value={clipboardContent}
                  onChange={(value) => setClipboardContent(value || '')}
                  defaultLanguage="plaintext"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
            <div className={`h-full ${activePanel === 'preview' ? 'block' : 'hidden'}`}>
              <PreviewPanel files={previewFiles} />
            </div>
            <div className={`h-full ${activePanel === 'history' ? 'block' : 'hidden'}`}>
              <HistoryPanel />
            </div>
            <div className={`h-full ${activePanel === 'settings' ? 'block' : 'hidden'}`}>
              <SettingsPanel />
            </div>
            <div className={`h-full ${activePanel === 'todo' ? 'block' : 'hidden'}`}>
              <TodoPanel />
            </div>
          </div>
        </div>

        {/* Lower Section - Tool Panels */}
        <div className="border-t border-gray-700 flex flex-col overflow-hidden">
          {/* Tool Panel Navigation */}
          <div className="bg-[#1f1f1f] border-b border-gray-700 px-2">
            <div className="flex items-center gap-1">
              {['Output', 'Terminal'].map((tab, index) => (
                <button
                  key={tab}
                  className={`px-3 py-1.5 text-sm rounded-t transition-colors ${activeToolPanel === tab.toLowerCase()
                      ? 'text-white bg-[#2d2d2d]'
                      : 'text-gray-400 hover:text-white'
                    }`}
                  onClick={() => setActiveToolPanel(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tool Panel Content */}
          <div className="flex-1 bg-[#2d2d2d] overflow-auto">

            {/* Output Panel */}
            <div className={`h-full ${activeToolPanel === 'output' ? 'block' : 'hidden'}`}>
              <OutputPanel requestId={requestId} />
            </div>


            {/* Terminal Panel */}
            <div className={`h-full ${activeToolPanel === 'terminal' ? 'block' : 'hidden'}`}>
              <TerminalManager />
            </div>

          </div>
        </div>
        </Split>
      </div>
      </Split>
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
