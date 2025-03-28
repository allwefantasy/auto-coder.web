import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Select, SelectProps } from 'antd';
import { FileGroup, EnhancedCompletionItem } from './types';
import eventBus, { EVENTS } from '../../services/eventBus';
import { FileMetadata } from '../../types/file_meta';
import './FileGroupSelect.css';
import { getMessage } from './lang';

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
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  const [mentionFiles, setMentionFiles] = useState<{path: string, display: string}[]>([]);
  const selectRef = useRef<any>(null);
  const processedMentionPaths = useRef<Set<string>>(new Set());
  
  // 新增状态 - 已打开的文件
  const [openedFiles, setOpenedFiles] = useState<FileMetadata[]>([]);
  
  // 订阅编辑器选项卡变更事件，而不是 files.opened 事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.EDITOR.TABS_CHANGED, (tabs: FileMetadata[]) => {
      console.log(getMessage('editorTabsChanged'), tabs);
      setOpenedFiles(tabs);
    });
    
    // 组件卸载时取消订阅
    return () => unsubscribe();
  }, []);
  
  // 简化全局键盘导航事件监听
  useEffect(() => {
    // 只有当下拉菜单打开时才添加键盘事件监听
    if (!dropdownVisible) return;
    
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      // 如果事件已经被处理，不要再处理
      if (e.defaultPrevented) return;
      
      // 只处理 Escape 键，其他键交给组件内部处理
      if (e.key === 'Escape') {
        setDropdownVisible(false);
        e.preventDefault();
      }
    };
    
    // 添加全局事件监听器
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [dropdownVisible]);
  
  useEffect(() => {
    const files = mentionItems      
      .map(item => ({
        path: item.path,
        display: item.display || item.name || item.path.split('/').pop() || item.path
      }));
    
    setMentionFiles(files);
    console.log(getMessage('updatedMentionFiles', { count: String(files.length) }));
    
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
      console.error(getMessage('errorFetchingCompletions'), error);
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
      console.error(getMessage('errorUpdatingSelection'), error);
    });
  };

  // 改进焦点管理
  const focusSelect = () => {
    if (selectRef.current) {
      // 使用较短的延迟确保DOM已经完全渲染
      setTimeout(() => {
        try {
          // 仅在没有焦点时聚焦到Select组件的输入框
          if (selectRef.current && selectRef.current.selectRef) {
            const inputElement = selectRef.current.selectRef.querySelector('input');
            if (inputElement && document.activeElement !== inputElement) {
              inputElement.focus();
            }
          }
        } catch (error) {
          console.error('Error focusing select:', error);
        }
      }, 10);
    }
  };

  return (
    <div className="px-1">
      <div className="h-[1px] bg-gray-700/50 my-0.5"></div>
      <Select
        ref={selectRef}
        mode="multiple"
        style={{ 
          width: '100%', 
          background: '#1f2937', 
          borderColor: '#374151', 
          color: '#e5e7eb',
          minHeight: '28px',
          height: 'auto',
          fontSize: '12px'
        }}
        maxTagCount={20}
        maxTagTextLength={30}
        maxTagPlaceholder={(omittedValues) => getMessage('moreFiles', { count: String(omittedValues.length) })}
        placeholder={getMessage('fileGroupSelectPlaceholder')}
        value={[...selectedGroups, ...selectedFiles]}
        onFocus={() => {
          fetchFileGroups();
          setDropdownVisible(true);
        }}
        onBlur={() => {
          // 添加短暂延迟，避免点击下拉选项时触发blur
          setTimeout(() => setDropdownVisible(false), 100);
        }}
        open={dropdownVisible}
        onDropdownVisibleChange={(visible) => {
          setDropdownVisible(visible);
          // 仅在打开下拉菜单时设置焦点
          if (visible) {
            focusSelect();
          }
        }}
        // onKeyDown={handleKeyDown} // Removed to allow default Ant Design keyboard navigation
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
        // 启用过滤选项以支持键盘导航
        filterOption={(input, option) => {
          if (!option) return false;
          
          // 使用 option.label 作为主要过滤依据
          const labelText = typeof option.label === 'string' ? option.label : '';
          // 使用 option.value 作为备用
          const valueText = typeof option.value === 'string' ? option.value : '';
          
          // 同时匹配 label 和 value
          return (
            labelText.toLowerCase().includes(input.toLowerCase()) ||
            valueText.toLowerCase().includes(input.toLowerCase())
          );
        }}
        optionFilterProp="label"
        className="custom-select multi-line-select"
        listHeight={300}
        popupClassName="dark-dropdown-menu keyboard-navigation-dropdown"
        dropdownStyle={{ 
          backgroundColor: '#1f2937', 
          borderColor: '#374151',
          fontSize: '12px'
        }}
        showSearch={true}
        tabIndex={0}
        autoClearSearchValue={false}
        tagRender={(props) => {
          const { label, value, closable, onClose } = props;
          return (
            <span 
              className="inline-flex items-center m-0.5 px-1 py-0.5 rounded bg-gray-700 text-gray-200 text-xs"
              style={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '1.2'
              }}
            >
              <span className="mr-0.5">{label}</span>
              {closable && (
                <span 
                  className="cursor-pointer text-gray-400 hover:text-gray-200 ml-0.5"
                  onClick={onClose}
                >
                  ×
                </span>
              )}
            </span>
          );
        }}
      >
        {fileCompletions.length > 0 && (
          <Select.OptGroup label={getMessage('searchResults')}>
            {fileCompletions.map(file => (
              <Select.Option
                key={file.path}
                value={file.path}
                label={file.display}
                className="file-option"
              >
                <div className="flex justify-between items-center" title={file.path}>
                  <span className="text-gray-200 text-xs">{file.display} ({file.path.length > 50 ? '...' + file.path.slice(-50) : file.path})</span>
                  <span className="text-gray-400 text-[10px]">{getMessage('fileType')}</span>
                </div>
              </Select.Option>
            ))}
          </Select.OptGroup>
        )}

        {/* 已打开文件选项组 */}
        {openedFiles.length > 0 && searchText.length < 2 && (
          <Select.OptGroup 
            label={
              <div className="flex justify-between items-center">
                <span>{getMessage('openedFiles')}</span>
                <button 
                  className="text-xs text-blue-400 hover:text-blue-300 px-1 py-0 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 获取所有已打开文件路径
                    const openedFilePaths = openedFiles.map(file => file.path);
                    
                    // 检查是否所有已打开文件都已被选中
                    const allSelected = openedFilePaths.every(path => 
                      selectedFiles.includes(path)
                    );
                    
                    if (allSelected) {
                      // 如果全部已选中，则取消选择所有已打开文件
                      const newFileSelection = selectedFiles.filter(
                        path => !openedFilePaths.includes(path)
                      );
                      updateSelection(selectedGroups, newFileSelection);
                    } else {
                      // 否则选择所有已打开文件
                      const newFileSelection = [
                        ...selectedFiles.filter(path => !openedFilePaths.includes(path)),
                        ...openedFilePaths
                      ];
                      updateSelection(selectedGroups, newFileSelection);
                    }
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="feather feather-check-square"
                  >
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                </button>
              </div>
            }
          >
            {openedFiles.map(file => {
              // 使用文件名作为显示名
              const display = file.label || file.path.split('/').pop() || file.path;
              return (
                <Select.Option
                  key={`opened-${file.path}`}
                  value={file.path}
                  label={display}
                  className="file-option"
                >
                <div className="flex justify-between items-center" title={file.path}>
                  <span className={`text-xs ${file.isSelected ? 'text-white font-medium' : 'text-gray-200'}`}>
                    {display} ({file.path.length > 40 ? '...' + file.path.slice(-40) : file.path})
                  </span>
                  <span className={`text-[10px] ${file.isSelected ? 'text-green-400' : 'text-green-600/70'}`}>
                    {getMessage(file.isSelected ? 'fileStatusActive' : 'fileStatusOpened')}
                  </span>
                </div>
                </Select.Option>
              );
            })}
          </Select.OptGroup>
        )}

        {fileGroups.map(group => (
          <Select.Option
            key={group.name}
            value={group.name}
            label={group.name}
            className="file-option"
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-200 text-xs">{group.name}</span>
              <span className="text-gray-400 text-[10px]">
                {getMessage('fileCount', { count: String(group.files.length) })}
              </span>
            </div>
          </Select.Option>
        ))}
        
        {mentionFiles.length > 0 && searchText.length < 2 && (
          <Select.OptGroup label={getMessage('mentionedFiles')}>
            {mentionFiles.map(file => (
              <Select.Option
                key={`mention-${file.path}`}
                value={file.path}
                label={file.display}
                className="file-option"
              >
                <div className="flex justify-between items-center" title={file.path}>
                  <span className="text-gray-200 text-xs">{file.display} ({file.path.length > 20 ? '...' + file.path.slice(-20) : file.path})</span>
                  <span className="text-blue-400 text-[10px]">{getMessage('mentionedFileStatus')}</span>
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
