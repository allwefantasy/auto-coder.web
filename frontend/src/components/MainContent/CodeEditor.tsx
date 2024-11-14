import React from 'react';

const CodeEditor: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Code Editor Header */}
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button 
              className="px-2.5 py-1 text-xs font-medium bg-gray-800 text-white border border-gray-600 rounded-l-md hover:bg-gray-700 hover:border-gray-500 focus:z-10 focus:ring-1 focus:ring-blue-400 focus:bg-gray-700"
            >
              Code
            </button>
            <button 
              className="px-2.5 py-1 text-xs font-medium bg-gray-800 text-gray-300 border border-l-0 border-gray-600 rounded-r-md hover:bg-gray-700 hover:text-white hover:border-gray-500 focus:z-10 focus:ring-1 focus:ring-blue-400 focus:bg-gray-700"
            >
              Preview
            </button>
          </div>
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