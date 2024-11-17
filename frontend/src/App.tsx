import React, { useState, useEffect } from 'react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import FileGroupPanel from './components/MainContent/FileGroupPanel';
import Terminal from './components/Terminal/Terminal';
import './App.css';

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'code' | 'filegroup' | 'preview'>('code');
  const [projectName, setProjectName] = useState<string>('');
  const [previewFiles, setPreviewFiles] = useState<{ path: string, content: string }[]>([]);

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
        <div className="bg-gray-800 p-2 border-b border-gray-700">
          <h2 className="text-gray-300 text-sm font-semibold truncate">
            auto-coder.chat | {projectName || 'Not Set'}
          </h2>
        </div>
        <ChatPanel />
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
          </div>
        </div>

        {/* Upper Section - Dynamic Content */}
        <div className="flex-1">
          {activePanel === 'code' ? (
            <CodeEditor />
          ) : activePanel === 'filegroup' ? (
            <FileGroupPanel />
          ) : (
            <PreviewPanel files={previewFiles} />
          )}
        </div>

        {/* Lower Section - Terminal */}
        <div className="h-1/4 border-t border-gray-700">
          <Terminal />
        </div>
      </div>
    </div>
  );
};

export default App;
