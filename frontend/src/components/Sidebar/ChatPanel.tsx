import React, { useState } from 'react';

interface FileGroup {
  id: string;
  name: string;
  files: string[];
}

const ChatPanel: React.FC = () => {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const addNewGroup = () => {
    if (newGroupName.trim()) {
      const newGroup: FileGroup = {
        id: Date.now().toString(),
        name: newGroupName,
        files: []
      };
      setFileGroups([...fileGroups, newGroup]);
      setNewGroupName('');
      setShowNewGroupInput(false);
    }
  };

  const deleteGroup = (groupId: string) => {
    setFileGroups(fileGroups.filter(group => group.id !== groupId));
  };

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

      {/* File Groups Section */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white text-sm font-medium">File Groups</h3>
          <button
            onClick={() => setShowNewGroupInput(true)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors duration-200 shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>            
          </button>
        </div>

        {showNewGroupInput && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="flex-1 bg-gray-700 text-white px-2 py-1 rounded-md text-sm"
            />
            <button
              onClick={addNewGroup}
              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowNewGroupInput(false);
                setNewGroupName('');
              }}
              className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-2">
          {fileGroups.map(group => (
            <div 
              key={group.id}
              className="flex justify-between items-center bg-gray-700 p-2 rounded"
            >
              <span className="text-sm text-white">{group.name}</span>
              <button
                onClick={() => deleteGroup(group.id)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Delete
              </button>
            </div>
          ))}
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