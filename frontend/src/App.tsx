import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import FileGroupPanel from './components/MainContent/FileGroupPanel';
import Terminal from './components/Terminal/Terminal';
import OutputPanel from './components/Terminal/OutputPanel';
import PreviewPanel from './components/MainContent/PreviewPanel';
import Split from 'react-split';
import './App.css';

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'code' | 'filegroup' | 'preview' | 'clipboard'>('code');
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
                className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${activePanel === 'code'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                onClick={() => setActivePanel('code')}
              >
                Code Editor
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${activePanel === 'filegroup'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                onClick={() => setActivePanel('filegroup')}
              >
                File Groups
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${activePanel === 'preview'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                onClick={() => setActivePanel('preview')}
              >
                Preview Changes
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-all duration-200 font-medium ${activePanel === 'clipboard'
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
              <Terminal />
            </div>

          </div>
        </div>
        </Split>
      </div>
   
  );
};

export default App;
