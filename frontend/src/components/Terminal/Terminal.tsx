import React from 'react';

const Terminal: React.FC = () => {
  return (
    <div className="h-full bg-black flex flex-col">
      {/* Terminal Header */}
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center">
          <span className="text-white text-sm font-semibold">Terminal</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-2 font-mono text-sm overflow-y-auto">
        <div className="text-green-500">
          <div className="flex items-start space-x-2">
            <span className="text-gray-500">$</span>
            <span>npm install</span>
          </div>
          <div className="text-gray-400 pl-4">Installing dependencies...</div>
          <div className="flex items-start space-x-2">
            <span className="text-gray-500">$</span>
            <span className="text-green-500 animate-pulse">_</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;