import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import FileGroupPanel from './components/MainContent/FileGroupPanel';
import SettingsPanel from './components/MainContent/SettingsPanel';
import TerminalManager from './components/Terminal/TerminalManager';
import OutputPanel from './components/Terminal/OutputPanel';
import PreviewPanel from './components/MainContent/PreviewPanel';
import Split from 'react-split';
import './App.css';

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'code' | 'filegroup' | 'preview' | 'clipboard' | 'settings'>('code');
  const [activeToolPanel, setActiveToolPanel] = useState<string>('terminal');
  const [clipboardContent, setClipboardContent] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [previewFiles, setPreviewFiles] = useState<{ path: string, content: string }[]>([]);
  const [requestId, setRequestId] = useState<string>('');

  useEffect(() => {
    fetch('/api/project-path')
      .then(response => response.json())
      .then(data => {
        const path = data.project_path;
        const name = path ? path.split('/').pop() : '';
        setProjectName(name);
      })
      .catch(error => console.error('Error fetching project path:', error));
  }, []); // Renamed useEffect hook to include a name

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Left Sidebar - Chat */}
      <div className="w-96 border-r border-gray-700 flex flex-col">
        <div className="bg-gray-800 p-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-indigo-500 font-bold text-lg">Auto-Coder</span>
            <span className="text-gray-400">|</span>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1"> Current Project:</span>
              <span className="text-gray-200 text-sm font-medium">
                {projectName || 'No Project Selected'}
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
      <Split 
        className="flex-1 flex flex-col"
        direction="vertical"
        sizes={[75, 25]}
        minSize={[200, 100]}
        gutterSize={8}
        snapOffset={30}
        dragInterval={1}
        cursor="row-resize"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex flex-col overflow-hidden">
          {/* Panel Switch Buttons */}
          <div className="bg-gray-800 p-2 border-b border-gray-700">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 
                  ${activePanel === 'code'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('code')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Code Editor</span>
              </button>
              <button
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 
                  ${activePanel === 'filegroup'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('filegroup')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>File Groups</span>
              </button>
              <button
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 
                  ${activePanel === 'preview'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('preview')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Preview Changes</span>
              </button>
              <button
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 
                  ${activePanel === 'clipboard'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('clipboard')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Clipboard</span>
              </button>
              <button
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 
                  ${activePanel === 'settings'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                  } flex items-center space-x-2`}
                onClick={() => setActivePanel('settings')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Upper Section - Dynamic Content */}
          <div className="flex-1 overflow-hidden">
            <div className={`h-full ${activePanel === 'code' ? 'block' : 'hidden'}`}>
              <CodeEditor />
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
            <div className={`h-full ${activePanel === 'settings' ? 'block' : 'hidden'}`}>
              <SettingsPanel />
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
   
  );
};

export default App;
