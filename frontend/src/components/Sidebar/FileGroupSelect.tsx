import React from 'react';
import { Select } from 'antd';
import { FileGroup } from './types';

interface FileGroupSelectProps {
  fileGroups: FileGroup[];
  selectedGroups: string[];
  setSelectedGroups: (values: string[]) => void;
  fetchFileGroups: () => void;
}

const FileGroupSelect: React.FC<FileGroupSelectProps> = ({
  fileGroups,
  selectedGroups,
  setSelectedGroups,
  fetchFileGroups
}) => {
  return (
    <div className="px-1">
      <div className="h-[1px] bg-gray-700/50 my-0.5"></div>
      <Select
        mode="multiple"
        style={{ 
          width: '100%', 
          background: '#1f2937', 
          borderColor: '#374151', 
          color: '#e5e7eb' 
        }}
        placeholder="Select file groups to work with"
        value={selectedGroups}
        onFocus={fetchFileGroups}
        onChange={(values) => {
          console.log('Selected groups:', values);
          setSelectedGroups(values);
          fetch('/api/file-groups/switch', {
            method: 'POST',
            body: JSON.stringify({ group_names: values })
          });
        }}
        optionLabelProp="label"
        className="custom-select"
        dropdownClassName="bg-gray-800 border border-gray-700"
      >
        {fileGroups.map(group => (
          <Select.Option
            key={group.name}
            value={group.name}
            label={group.name}
            className="bg-gray-800 hover:bg-gray-700"
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-200">{group.name}</span>
              <span className="text-gray-400 text-xs">
                {group.files.length} files
              </span>
            </div>
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};

export default FileGroupSelect; 