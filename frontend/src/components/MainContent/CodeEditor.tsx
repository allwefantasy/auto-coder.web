import React from 'react';

const CodeEditor: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Code Editor Header */}
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-md font-medium transition-all duration-200 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900">
            Code
          </button>
          <button className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-md font-medium transition-all duration-200 hover:bg-gray-700 hover:text-white focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900">
            Preview
          </button>
        </div>
      </div>

      {/* Code Editor Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* File Tree */}
          <div className="w-48 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-2">
              <div className="text-gray-400 hover:text-white cursor-pointer">
                <span className="text-sm">📁 src</span>
                <div className="pl-4">
                  <div className="text-sm">📄 index.tsx</div>
                  <div className="text-sm">📄 App.tsx</div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 bg-gray-900 overflow-y-auto">
            <pre className="p-4">
              <code className="text-gray-300 font-mono">
                // Your code will appear here                
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;