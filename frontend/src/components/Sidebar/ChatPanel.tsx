import React from 'react';

const ChatPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h2 className="text-white text-lg font-semibold">auto-coder.chat</h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-300">示例消息</p>
          </div>
          {/* 更多消息可以在这里添加 */}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
          />
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;