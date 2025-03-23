import React, { useState, useEffect, useRef } from 'react';
import { Select } from 'antd';
import { FileGroup, EnhancedCompletionItem } from './types';

interface FileGroupSelectProps {
  fileGroups: FileGroup[];
  selectedGroups: string[];
  setSelectedGroups: (values: string[]) => void;
  fetchFileGroups: () => void;
  mentionItems?: EnhancedCompletionItem[];
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
  fetchFileGroups,
  mentionItems = []
}) => {
  const [fileCompletions, setFileCompletions] = useState<FileCompletion[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  
  const [mentionFiles, setMentionFiles] = useState<{path: string, display: string}[]>([]);
  const processedMentionPaths = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    const files = mentionItems      
      .map(item => ({
        path: item.path,
        display: item.display || item.name || item.path.split('/').pop() || item.path
      }));
    
    setMentionFiles(files);
    console.log("Updated mention files:", files.length);
    
    // 只有当有提到的文件时才处理
    if (files.length > 0) {
      // 找出未处理过的新文件路径
      const newFilePaths = files
        .map(file => file.path)
        .filter(path => !processedMentionPaths.current.has(path));
      
      // 如果有新文件要添加
      if (newFilePaths.length > 0) {
        // 标记为已处理
        newFilePaths.forEach(path => processedMentionPaths.current.add(path));
        
        // 更新选中文件，避免重复
        setSelectedFiles(prevSelectedFiles => {
          const combinedFiles = [...prevSelectedFiles, ...newFilePaths];
          const uniqueFiles = Array.from(new Set(combinedFiles));
          
          // 直接在这里调用一次，避免依赖于状态更新后的回调
          updateSelection(selectedGroups, uniqueFiles);
          
          return uniqueFiles;
        });
      }
    }
  }, [mentionItems, selectedGroups]);

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
        popupClassName="dark-dropdown-menu"
        dropdownStyle={{ 
          backgroundColor: '#1f2937', 
          borderColor: '#374151' 
        }}
      >
        {fileGroups.map(group => (
          <Select.Option
            key={group.name}
            value={group.name}
            label={group.name}
            className="file-option"
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-200">{group.name}</span>
              <span className="text-gray-400 text-xs">
                {group.files.length} files
              </span>
            </div>
          </Select.Option>
        ))}
        
        {mentionFiles.length > 0 && searchText.length < 2 && (
          <Select.OptGroup label="Mentioned Files">
            {mentionFiles.map(file => (
              <Select.Option
                key={`mention-${file.path}`}
                value={file.path}
                label={file.display}
                className="file-option"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-200">{file.display}</span>
                  <span className="text-blue-400 text-xs">Mentioned</span>
                </div>
              </Select.Option>
            ))}
          </Select.OptGroup>
        )}
        
        {fileCompletions.length > 0 && (
          <Select.OptGroup label="Search Results">
            {fileCompletions.map(file => (
              <Select.Option
                key={file.path}
                value={file.path}
                label={file.display}
                className="file-option"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-200">{file.display}</span>
                  <span className="text-gray-400 text-xs">File</span>
                </div>
              </Select.Option>
            ))}
          </Select.OptGroup>
        )}
      </Select>
    </div>
  );
};

export default FileGroupSelect; 