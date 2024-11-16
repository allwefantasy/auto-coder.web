import React, { useState, useEffect } from 'react';
import { AutoComplete, Card, Select, Switch, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

interface FileGroup {
  id: string;
  name: string;
  files: string[];
}

interface ConfigState {
  human_as_model: boolean;
  skip_build_index: boolean;
}

const ChatPanel: React.FC = () => {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [config, setConfig] = useState<ConfigState>({
    human_as_model: false,
    skip_build_index: true
  });
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

  // Initial fetch
  useEffect(() => {
    fetchFileGroups();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fetch file groups on every input change
    fetchFileGroups();
  };

  return (
    <div className="flex flex-col h-full">      
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
        {/* Configuration Section */}
        <div className="mb-4 p-3 rounded bg-gray-900">
          <div className="flex justify-between items-center mb-3">
            <div className="text-white text-sm">Settings</div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Human As Model</span>
              <Switch
                size="small"
                checked={config.human_as_model}
                onChange={async (checked) => {
                  const response = await fetch('/api/conf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ human_as_model: checked })
                  });
                  if (response.ok) {
                    setConfig(prev => ({ ...prev, human_as_model: checked }));
                    message.success('Configuration updated');
                  } else {
                    message.error('Failed to update configuration');
                  }
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Skip Build Index</span>
              <Switch
                size="small"
                checked={config.skip_build_index}
                onChange={async (checked) => {
                  const response = await fetch('/api/conf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ skip_build_index: checked })
                  });
                  if (response.ok) {
                    setConfig(prev => ({ ...prev, skip_build_index: checked }));
                    message.success('Configuration updated');
                  } else {
                    message.error('Failed to update configuration');
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="mb-4">          
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
            onChange={handleInputChange}
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