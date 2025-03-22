import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import Split from 'react-split';
import ChatPanel from '../Sidebar/ChatPanel';
import CodeEditor from '../MainContent/CodeEditor';
import FileGroupPanel from '../MainContent/FileGroupPanel';
import SettingsPanel from '../MainContent/SettingsPanel';
import HistoryPanel from '../MainContent/HistoryPanel';
import TerminalManager from '../Terminal/TerminalManager';
import OutputPanel from '../Terminal/OutputPanel';
import PreviewPanel from '../MainContent/PreviewPanel';
import TodoPanel from '../MainContent/TodoPanel';
import { getMessage } from '../Sidebar/lang';

interface ExpertModePageProps {
  projectName: string;
  activePanel: 'todo' | 'code' | 'filegroup' | 'preview' | 'clipboard' | 'history' | 'settings';
  setActivePanel: (panel: 'todo' | 'code' | 'filegroup' | 'preview' | 'clipboard' | 'history' | 'settings') => void;
  clipboardContent: string;
  setClipboardContent: (content: string) => void;
  previewFiles: { path: string, content: string }[];
  setPreviewFiles: (files: { path: string, content: string }[]) => void;
  requestId: string;
  setRequestId: (id: string) => void;
  selectedFile: string | null;
  onSwitchToAutoMode: () => void;
}

const ExpertModePage: React.FC<ExpertModePageProps> = ({
  projectName,
  activePanel,
  setActivePanel,
  clipboardContent,
  setClipboardContent,
  previewFiles,
  setPreviewFiles,
  requestId,
  setRequestId,
  selectedFile,
  onSwitchToAutoMode
}) => {
  const [activeToolPanel, setActiveToolPanel] = useState<string>('terminal');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.tools-dropdown-container') && showToolsDropdown) {
        setShowToolsDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolsDropdown]);

  const toggleToolsDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowToolsDropdown(!showToolsDropdown);
  };

  return (
    <Split 
      className="flex-1 flex"
      sizes={[25, 75]}
      minSize={[180, 400]}
      gutterSize={3}
      snapOffset={20}
    >
      {/* Left Sidebar - Chat */}
      <div className="border-r border-gray-700 flex flex-col">
        <ChatPanel
          setPreviewFiles={setPreviewFiles}
          setActivePanel={setActivePanel}
          setClipboardContent={setClipboardContent}
          clipboardContent={clipboardContent}
          setRequestId={setRequestId}
          projectName={projectName}
        />
      </div>

      {/* Right Content Area */}
      <div className="flex flex-col">
        <Split 
          direction="vertical"
          sizes={[75, 25]}
          minSize={[180, 80]}
          gutterSize={3}
          snapOffset={20}
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
              <div className="relative tools-dropdown-container">
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                    ${['preview', 'clipboard', 'settings'].includes(activePanel)
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                      : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                    } flex items-center space-x-2`}
                  onClick={toggleToolsDropdown}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span>Tools</span>
                </button>
                {showToolsDropdown && (
                  <div 
                    className="absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                  >
                    <div className="py-1">
                      <button
                        className={`w-full px-4 py-2 text-sm flex items-center space-x-2 ${
                          activePanel === 'preview'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                        onClick={() => {
                          setActivePanel('preview');
                          setShowToolsDropdown(false);
                        }}
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
                        onClick={() => {
                          setActivePanel('clipboard');
                          setShowToolsDropdown(false);
                        }}
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
                        onClick={() => {
                          setActivePanel('settings');
                          setShowToolsDropdown(false);
                        }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{getMessage('settings')}</span>
                      </button>
                    </div>
                  </div>
                )}
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
  );
};

export default ExpertModePage;
