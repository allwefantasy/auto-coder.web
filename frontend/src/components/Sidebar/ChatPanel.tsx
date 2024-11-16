import React, { useState, useEffect } from 'react';
import { AutoComplete, Card } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

interface FileGroup {
  id: string;
  name: string;
  files: string[];
}

const ChatPanel: React.FC = () => {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [inputValue, setInputValue] = useState('');

  // 模拟一些建议选项
  const suggestions = [
    'Backend Files',
    'Frontend Components',
    'Config Files',
    'Test Files',
    'Documentation'
  ].filter(item => item.toLowerCase().includes(inputValue.toLowerCase()))
    .map(value => ({ value }));

  useEffect(() => {
    fetchFileGroups();
  }, []);

  const fetchFileGroups = async () => {
    try {
      const response = await fetch('/api/filegroups');
      if (!response.ok) {
        throw new Error('Failed to fetch file groups');
      }
      const data = await response.json();
      setFileGroups(data.groups);
    } catch (error) {
      console.error('Error fetching file groups:', error);
    }
  };

  const addNewGroup = async (value: string) => {
    if (value.trim()) {
      try {
        const response = await fetch('/api/filegroups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: value.trim() }),
        });

        if (!response.ok) {
          throw new Error('Failed to create file group');
        }

        // Refresh the file groups list
        await fetchFileGroups();
        setInputValue('');
      } catch (error) {
        console.error('Error creating file group:', error);
        alert('Failed to create file group. Please try again.');
      }
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/filegroups/${groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file group');
      }

      // Refresh the file groups list
      await fetchFileGroups();
    } catch (error) {
      console.error('Error deleting file group:', error);
      alert('Failed to delete file group. Please try again.');
    }
  };

  const handleSearch = (value: string) => {
    setInputValue(value);
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
        <div className="mb-4">
          <h3 className="text-white text-sm font-medium mb-2">File Groups</h3>
          <AutoComplete
            value={inputValue}
            options={suggestions}
            style={{ width: '100%' }}
            onSelect={addNewGroup}
            onSearch={handleSearch}
            placeholder="Type group name..."
            className="custom-autocomplete"
          />
        </div>

        <div className="space-y-2">
          {fileGroups.map(group => (
            <Card 
              key={group.id}
              size="small"
              className="bg-gray-700 border-gray-600"
              extra={
                <DeleteOutlined 
                  onClick={() => deleteGroup(group.id)}
                  className="text-gray-400 hover:text-red-400 cursor-pointer"
                />
              }
            >
              <div className="text-white">{group.name}</div>
              {group.files.length > 0 && (
                <div className="text-gray-400 text-xs mt-1">
                  {group.files.length} files
                </div>
              )}
            </Card>
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