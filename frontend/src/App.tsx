import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import FileGroupPanel from './components/MainContent/FileGroupPanel';
import Terminal from './components/Terminal/Terminal';
import PreviewPanel from './components/MainContent/PreviewPanel';
import './App.css';

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'code' | 'filegroup' | 'preview' | 'clipboard'>('code');
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
  }, []);

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
      <div className="flex-1 flex flex-col">
        {/* Panel Switch Buttons */}
        <div className="bg-gray-800 p-2 border-b border-gray-700">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${
                activePanel === 'code'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setActivePanel('code')}
            >
              Code Editor
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${
                activePanel === 'filegroup'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setActivePanel('filegroup')}
            >
              File Groups
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${
                activePanel === 'preview'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setActivePanel('preview')}
            >
              Preview Changes
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${
                activePanel === 'clipboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => {
                setActivePanel('clipboard');                
              }}
            >
              Clipboard
            </button>
          </div>
        </div>

        {/* Upper Section - Dynamic Content */}
        <div className="flex-1">
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
        </div>

        {/* Lower Section - Terminal */}
        <div className="h-1/4 border-t border-gray-700">
          <Terminal requestId={requestId} />
        </div>
      </div>
    </div>
  );
};

export default App;
