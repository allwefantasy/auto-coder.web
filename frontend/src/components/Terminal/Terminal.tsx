import React from 'react';

const Terminal: React.FC = () => {
  return (
    <div className="h-64 bg-black text-green-500 p-4 font-mono text-sm overflow-y-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex">
          <span className="text-gray-500 mr-2">$</span>
          <span>npm install</span>
        </div>
        <div className="text-gray-400">
          Installing dependencies...
        </div>
      </div>
    </div>
  );
};

export default Terminal;