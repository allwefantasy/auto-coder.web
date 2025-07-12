import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { FileTreeSearchProps } from '../types';

const FileTreeSearch: React.FC<FileTreeSearchProps> = ({
  value = '',
  onChange,
  placeholder = 'Search files...',
  className = '',
}) => {
  return (
    <div className={`vscode-file-tree-search ${className}`}>
      <Input
        prefix={<SearchOutlined className="vscode-search-icon" />}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        allowClear
        className="vscode-search-input"
      />
    </div>
  );
};

export default FileTreeSearch;