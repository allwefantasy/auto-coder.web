import React from 'react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodeEditor from './components/MainContent/CodeEditor';
import Terminal from './components/Terminal/Terminal';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="h-screen flex bg-gray-900">
      {/* Left Sidebar - Chat */}
      <div className="w-96 border-r border-gray-700">
        <ChatPanel />
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Upper Section - Code Editor */}
        <div className="flex-1">
          <CodeEditor />
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
