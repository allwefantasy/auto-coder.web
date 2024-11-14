import React from 'react';
import ChatPanel from './components/Sidebar/ChatPanel';
import CodePreview from './components/MainContent/CodePreview';
import Terminal from './components/Terminal/Terminal';

const App: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700">
          <ChatPanel />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <CodePreview />
        </div>
      </div>
      
      {/* Terminal */}
      <Terminal />
    </div>
  );
};

export default App;
