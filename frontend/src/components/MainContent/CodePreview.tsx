import React from 'react';

const CodeEditor: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Code Editor Header */}
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
            Code
          </button>
          <button className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
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
                Preview
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;