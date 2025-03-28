import React, { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { Select, message } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
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

  // 监听编辑器发来的聚焦事件
  useEffect(() => {
    const handleFocusEvent = () => {
      if (selectRef.current) {
        selectRef.current.focus();
        message.info(getMessage('focusInput'), 1);
      }
    };

    // 订阅聚焦事件
    const unsubscribe = eventBus.subscribe(EVENTS.FILE_GROUP_SELECT.FOCUS, handleFocusEvent);
    
    // 清理函数
    return () => {
      unsubscribe();
    };
  }, []);

  const formatPathDisplay = useCallback((path: string, maxLength: number = 40) => {
    // Remove the filename part (everything after last slash)
    const dirPath = path.substring(0, path.lastIndexOf('/'));
    // Show last maxLength characters of directory path
    return dirPath.length > maxLength ? '...' + dirPath.slice(-maxLength) : dirPath;
  }, []);
  
  // 新增状态 - 已打开的文件
  const [openedFiles, setOpenedFiles] = useState<FileMetadata[]>([]);
  // 新增状态 - 当前键盘聚焦的选项索引
  const [focusedOptionIndex, setFocusedOptionIndex] = useState<number>(-1);
  
  // 订阅编辑器选项卡变更事件，而不是 files.opened 事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.EDITOR.TABS_CHANGED, (tabs: FileMetadata[]) => {
      console.log(getMessage('editorTabsChanged'), tabs);
      setOpenedFiles(tabs);
    });
    
    // 组件卸载时取消订阅
    return () => unsubscribe();
  }, []);
  
  
  
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

  // 处理键盘导航事件
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!dropdownVisible) {
      // 如果下拉列表未显示，则不处理键盘事件
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedOptionIndex(prev => {
          // 计算可选项的总数
          const totalOptions = fileCompletions.length + fileGroups.length + 
            (openedFiles.length > 0 && searchText.length < 2 ? openedFiles.length : 0) + 
            (mentionFiles.length > 0 && searchText.length < 2 ? mentionFiles.length : 0);
          
          // 移动到下一个选项，如果到达末尾则回到第一个
          return prev >= totalOptions - 1 ? 0 : prev + 1;
        });
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setFocusedOptionIndex(prev => {
          // 计算可选项的总数
          const totalOptions = fileCompletions.length + fileGroups.length + 
            (openedFiles.length > 0 && searchText.length < 2 ? openedFiles.length : 0) + 
            (mentionFiles.length > 0 && searchText.length < 2 ? mentionFiles.length : 0);
          
          // 移动到上一个选项，如果到达顶部则移到最后一个
          return prev <= 0 ? totalOptions - 1 : prev - 1;
        });
        break;
      
      case 'Enter':
        if (focusedOptionIndex >= 0) {
          e.preventDefault();
          // 获取当前聚焦的选项并选中它
          // 这需要一个额外的逻辑来确定哪个选项是当前聚焦的
          selectFocusedOption(focusedOptionIndex);
        }
        break;
      
      case 'Tab':
        if (focusedOptionIndex >= 0) {
          e.preventDefault();
          // 与Enter键相同，选中当前聚焦的选项
          selectFocusedOption(focusedOptionIndex);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        // 关闭下拉菜单
        setDropdownVisible(false);
        break;
      
      default:
        break;
    }
  };

  // 选择当前聚焦的选项
  const selectFocusedOption = (index: number) => {
    // 需要根据当前的渲染顺序计算出索引对应的实际选项
    // 这取决于你的选项在界面上的渲染顺序
    let optionIndex = index;
    let selectedValue: string = '';
    
    // 先检查是否是搜索结果中的选项
    if (fileCompletions.length > 0 && optionIndex < fileCompletions.length) {
      selectedValue = fileCompletions[optionIndex].path;
    } else {
      optionIndex -= fileCompletions.length;
      
      // 检查是否是已打开文件中的选项
      if (openedFiles.length > 0 && searchText.length < 2 && optionIndex < openedFiles.length) {
        selectedValue = openedFiles[optionIndex].path;
      } else {
        optionIndex -= (openedFiles.length > 0 && searchText.length < 2 ? openedFiles.length : 0);
        
        // 检查是否是提到文件中的选项
        if (mentionFiles.length > 0 && searchText.length < 2 && optionIndex < mentionFiles.length) {
          selectedValue = mentionFiles[optionIndex].path;
        } else {
          optionIndex -= (mentionFiles.length > 0 && searchText.length < 2 ? mentionFiles.length : 0);
          
          // 最后检查是否是文件组中的选项
          if (optionIndex < fileGroups.length) {
            selectedValue = fileGroups[optionIndex].name;
          }
        }
      }
    }
    
    if (selectedValue) {
      // 更新选中项
      const isGroup = fileGroups.some(group => group.name === selectedValue);
      
      if (isGroup) {
        // 如果是文件组，则将其添加到选中组
        const updatedGroups = [...selectedGroups];
        if (!updatedGroups.includes(selectedValue)) {
          updatedGroups.push(selectedValue);
        }
        updateSelection(updatedGroups, selectedFiles);
      } else {
        // 如果是文件，则将其添加到选中文件
        const updatedFiles = [...selectedFiles];
        if (!updatedFiles.includes(selectedValue)) {
          updatedFiles.push(selectedValue);
        }
        updateSelection(selectedGroups, updatedFiles);
      }
      
      // 关闭下拉菜单
      setDropdownVisible(false);
    }
  };

  return (
    <div className="px-1" onKeyDown={handleKeyDown}>
      <div className="h-[1px] bg-gray-700/50 my-0.5"></div>
      <div className="flex items-center gap-1">
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
          // 重置聚焦的选项索引
          setFocusedOptionIndex(-1);
        }}
        onBlur={() => {
          // 添加短暂延迟，避免点击下拉选项时触发blur
          setTimeout(() => {
            setDropdownVisible(false);
            // 重置聚焦的选项索引
            setFocusedOptionIndex(-1);
          }, 100);
        }}
        open={dropdownVisible}        
        onSearch={(value) => {
          setSearchText(value);
          fetchFileCompletions(value);
          // 当搜索文本变化时，重置聚焦的选项索引
          setFocusedOptionIndex(-1);
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
        className="custom-select multi-line-select keyboard-navigation-select"
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
        // 添加下拉菜单项选中状态的处理
        dropdownRender={(menu) => {
          return (
            <div className="keyboard-navigation-menu">
              {menu}
            </div>
          );
        }}
      >
        {fileCompletions.length > 0 && (
          <Select.OptGroup label={getMessage('searchResults')}>
            {fileCompletions.map((file, index) => (
              <Select.Option
                key={file.path}
                value={file.path}
                label={file.display}
                className={`file-option ${focusedOptionIndex === index ? 'keyboard-focused-option' : ''}`}
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
            {openedFiles.map((file, index) => {
              // 使用文件名作为显示名
              const display = file.label || file.path.split('/').pop() || file.path;
              const optionIndex = fileCompletions.length + index;
              return (
                <Select.Option
                  key={`opened-${file.path}`}
                  value={file.path}
                  label={display}
                  className={`file-option ${focusedOptionIndex === optionIndex ? 'keyboard-focused-option' : ''}`}
                >
                <div className="flex justify-between items-center" title={file.path}>
                  <span className={`text-xs ${file.isSelected ? 'text-white font-medium' : 'text-gray-200'}`}>
                    {display} ({formatPathDisplay(file.path)})
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

        {fileGroups.map((group, index) => {
          const optionIndex = fileCompletions.length + 
            (openedFiles.length > 0 && searchText.length < 2 ? openedFiles.length : 0) + 
            (mentionFiles.length > 0 && searchText.length < 2 ? mentionFiles.length : 0) + 
            index;
          return (
            <Select.Option
              key={group.name}
              value={group.name}
              label={group.name}
              className={`file-option ${focusedOptionIndex === optionIndex ? 'keyboard-focused-option' : ''}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-200 text-xs">{group.name}</span>
                <span className="text-gray-400 text-[10px]">
                  {getMessage('fileCount', { count: String(group.files.length) })}
                </span>
              </div>
            </Select.Option>
          );
        })}
        
        {mentionFiles.length > 0 && searchText.length < 2 && (
          <Select.OptGroup label={getMessage('mentionedFiles')}>
            {mentionFiles.map((file, index) => {
              const optionIndex = fileCompletions.length + 
                (openedFiles.length > 0 && searchText.length < 2 ? openedFiles.length : 0) + 
                index;
              return (
                <Select.Option
                  key={`mention-${file.path}`}
                  value={file.path}
                  label={file.display}
                  className={`file-option ${focusedOptionIndex === optionIndex ? 'keyboard-focused-option' : ''}`}
                >
                  <div className="flex justify-between items-center" title={file.path}>
                    <span className="text-gray-200 text-xs">{file.display} ({formatPathDisplay(file.path, 20)})</span>
                    <span className="text-blue-400 text-[10px]">{getMessage('mentionedFileStatus')}</span>
                  </div>
                </Select.Option>
              );
            })}
          </Select.OptGroup>
        )}
      </Select>
        <CloseCircleOutlined
          className="text-gray-400 hover:text-gray-200 cursor-pointer text-sm"
          onClick={async () => {
            try {
              await fetch('/api/file-groups/clear', {
                method: 'POST'
              });
              setSelectedGroups([]);
              setSelectedFiles([]);
              fetchFileGroups();
            } catch (error) {
              console.error(getMessage('clearFailed'), error);
            }
          }}
          title={getMessage('clearContext')}
        />
      </div>
    </div>
  );
};

export default FileGroupSelect;
