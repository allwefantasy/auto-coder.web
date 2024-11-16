import React, { useState } from 'react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import FileGroupPanel from './components/MainContent/FileGroupPanel';
import Terminal from './components/Terminal/Terminal';
import './App.css';

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'code' | 'filegroup'>('code');

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Left Sidebar - Chat */}
      <div className="w-96 border-r border-gray-700 flex flex-col">
        {/* Project Name Header */}
        <div className="bg-gray-800 p-2 border-b border-gray-700">
          <h2 className="text-gray-300 text-sm font-medium truncate">
            Project: {window.location.pathname.split('/').filter(Boolean).pop() || 'auto-coder.web'}
          </h2>
        </div>
        <div className="flex-1">
          <ChatPanel />
        </div>
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
          </div>
        </div>

        {/* Upper Section - Dynamic Content */}
        <div className="flex-1">
          {activePanel === 'code' ? <CodeEditor /> : <FileGroupPanel />}
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
