import React, { useState } from 'react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import FileGroupPanel from './components/MainContent/FileGroupPanel';
import Terminal from './components/Terminal/Terminal';
import './App.css';

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'code' | 'filegroup'>('code');
  const [projectPath, setProjectPath] = useState<string>('');
  const [isPathConfirmed, setIsPathConfirmed] = useState(false);

  const handlePathConfirm = async () => {
    if (projectPath.trim()) {
      try {
        const response = await fetch('/api/project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: projectPath.trim() }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to set project path');
        }
        
        setIsPathConfirmed(true);
      } catch (error) {
        console.error('Error setting project path:', error);
        alert('Failed to set project path. Please try again.');
      }
    }
  };

  if (!isPathConfirmed) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="w-[600px] p-8 bg-gray-800 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Welcome to Auto-Coder</h1>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="projectPath" className="text-gray-300">Project Path:</label>
              <input
                id="projectPath"
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="Enter your project path..."
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handlePathConfirm}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Left Sidebar - Chat */}
      <div className="w-96 border-r border-gray-700">
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
