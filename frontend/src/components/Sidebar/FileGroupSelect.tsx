import React, { useState } from 'react';
import { Select } from 'antd';
import { FileGroup } from './types';

interface FileGroupSelectProps {
  fileGroups: FileGroup[];
  selectedGroups: string[];
  setSelectedGroups: (values: string[]) => void;
  fetchFileGroups: () => void;
}

interface FileCompletion {
  name: string;
  path: string;
  display: string;
  location?: string;
}

const FileGroupSelect: React.FC<FileGroupSelectProps> = ({
  fileGroups,
  selectedGroups,
  setSelectedGroups,
  fetchFileGroups
}) => {
  const [fileCompletions, setFileCompletions] = useState<FileCompletion[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  // Fetch file completions when user types
  const fetchFileCompletions = async (searchValue: string) => {
    if (searchValue.length < 2) {
      setFileCompletions([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/completions/files?name=${encodeURIComponent(searchValue)}`);
      const data = await response.json();
      setFileCompletions(data.completions || []);
    } catch (error) {
      console.error('Error fetching file completions:', error);
    }
  };

  // Function to send selected groups and files to the backend
  const updateSelection = (groupValues: string[], fileValues: string[]) => {
    setSelectedGroups(groupValues);
    setSelectedFiles(fileValues);
    
    fetch('/api/file-groups/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        group_names: groupValues,
        file_paths: fileValues
      })
    }).catch(error => {
      console.error('Error updating selection:', error);
    });
  };

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
        placeholder="Select file groups or search for files"
        value={[...selectedGroups, ...selectedFiles]}
        onFocus={fetchFileGroups}
        onSearch={(value) => {
          setSearchText(value);
          fetchFileCompletions(value);
        }}
        onChange={(values) => {
          // Split values into groups and files
          const groupValues = values.filter(value => 
            fileGroups.some(group => group.name === value)
          );
          
          const fileValues = values.filter(value => 
            !fileGroups.some(group => group.name === value)
          );
          
          updateSelection(groupValues, fileValues);
        }}
        filterOption={false}
        optionLabelProp="label"
        className="custom-select"
        dropdownClassName="bg-gray-800 border border-gray-700"
      >
        {/* Group options */}
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
        
        {/* File completion options */}
        {fileCompletions.map(file => (
          <Select.Option
            key={file.path}
            value={file.path}
            label={file.display}
            className="bg-gray-800 hover:bg-gray-700"
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-200">{file.display}</span>
              <span className="text-gray-400 text-xs">File</span>
            </div>
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};

export default FileGroupSelect; 