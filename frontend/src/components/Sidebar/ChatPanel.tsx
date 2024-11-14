import React from 'react';

const ChatPanel: React.FC = () => {
  return (
    <div className="h-full bg-gray-800 text-white p-4 overflow-y-auto">
      <div className="flex flex-col space-y-4">
        <div className="bg-gray-700 rounded-lg p-3">
          <p className="text-sm">Chat messages will appear here...</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <input
          type="text"
          placeholder="Type your message..."
          className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default ChatPanel;