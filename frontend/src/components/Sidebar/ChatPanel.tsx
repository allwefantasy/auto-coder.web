import React, { useState, useEffect } from 'react';
import { AutoComplete, Card, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

interface FileGroup {
  id: string;
  name: string;
  files: string[];
}

const ChatPanel: React.FC = () => {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // 获取文件组
  useEffect(() => {
    const fetchFileGroups = async () => {
      try {
        const response = await fetch('/api/file-groups');
        if (!response.ok) throw new Error('Failed to fetch file groups');
        const data = await response.json();
        setFileGroups(data.groups);
      } catch (error) {
        console.error('Failed to load file groups');
      }
    };
    fetchFileGroups();
  }, []);

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
        <div className="mb-4">
          <h3 className="text-white text-sm font-medium mb-2">File Groups</h3>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select file groups"
            value={selectedGroups}
            onChange={(values) => setSelectedGroups(values)}
            optionLabelProp="label"
            className="custom-select"
          >
            {fileGroups.map(group => (
              <Select.Option 
                key={group.name} 
                value={group.name}
                label={group.name}
              >
                <div className="flex justify-between items-center">
                  <span>{group.name}</span>
                  <span className="text-gray-400 text-xs">
                    {group.files.length} files
                  </span>
                </div>
              </Select.Option>
            ))}
          </Select>
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