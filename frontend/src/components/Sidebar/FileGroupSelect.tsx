import React, { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { Select, message } from 'antd';
import type { CustomTagProps } from 'rc-select/lib/BaseSelect';
import { CloseCircleOutlined } from '@ant-design/icons';
import { FileGroup, EnhancedCompletionItem } from './types';
import eventBus, { EVENTS } from '../../services/eventBus';
import { FileMetadata } from '../../types/file_meta';
import './FileGroupSelect.css';
import { getMessage } from '../../lang';
import { FileGroupSelectionUpdatedEventData } from '../../services/event_bus_data';
import { ServiceFactory } from '../../services/ServiceFactory';

interface FileGroupSelectProps {
  fileGroups: FileGroup[];
  selectedGroups: string[];
  setSelectedGroups: (values: string[]) => void;
  fetchFileGroups: () => void;
  mentionItems?: EnhancedCompletionItem[];
  panelId?: string; // 添加可选的面板ID参数
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
  panelId = '',
}) => {
  // 获取文件组服务
  const fileGroupService = ServiceFactory.getFileGroupService(panelId);
  const [fileCompletions, setFileCompletions] = useState<FileCompletion[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [mentionFiles, setMentionFiles] = useState<{ path: string, display: string }[]>([]);
  const [tokenCount, setTokenCount] = useState<number>(0);
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

  // 监听编辑器发来的mentions变化事件
  useEffect(() => {
    const handleMentionsChanged = (mentions: Array<{ type: string; text: string; path: string }>) => {
      console.log(mentions)
      // 仅处理文件类型的mentions
      const fileOnlyMentions = mentions;

      if (fileOnlyMentions.length > 0) {
        // 转换为组件需要的格式
        const fileMentions = fileOnlyMentions.map(item => ({
          path: item.path,
          display: item.text
        }));

        // 更新状态
        setMentionFiles(fileMentions);

        // 更新已处理的mentions路径集合
        processedMentionPaths.current = new Set(fileMentions.map(file => file.path));

        // 自动选中被提到的文件
        const mentionPaths = fileMentions.map(file => file.path);
        const newSelectedFiles = [...selectedFiles];
        let hasNewFiles = false;

        // 添加尚未选中的提到文件
        mentionPaths.forEach(path => {
          if (!newSelectedFiles.includes(path)) {
            newSelectedFiles.push(path);
            hasNewFiles = true;
          }
        });

        // 如果有新文件被添加，更新选择
        if (hasNewFiles) {
          updateSelection(selectedGroups, newSelectedFiles);
        }
      }
    };

    // 订阅mentions变化事件
    const unsubscribe = eventBus.subscribe(EVENTS.EDITOR.MENTIONS_CHANGED, handleMentionsChanged);

    // 清理函数
    return () => {
      unsubscribe();
    };
  }, [selectedGroups, selectedFiles]);

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
    // 去重处理
    const uniqueGroupValues = Array.from(new Set(groupValues));
    const uniqueFileValues = Array.from(new Set(fileValues));

    setSelectedGroups(uniqueGroupValues);
    setSelectedFiles(uniqueFileValues);

    // 使用文件组服务切换文件组
    fileGroupService.switchFileGroups(uniqueGroupValues, uniqueFileValues)
      .then((result: { success: boolean; totalTokens: number; message: string }) => {
        // 更新token计数
        if (result.totalTokens !== undefined) {
          setTokenCount(result.totalTokens);
        }

        // 发布文件组选择更新事件，通知ChatPanel组件
        eventBus.publish(
          EVENTS.FILE_GROUP_SELECT.SELECTION_UPDATED,
          new FileGroupSelectionUpdatedEventData(uniqueGroupValues, uniqueFileValues, panelId)
        );
        console.log('Published file group selection updated event', uniqueGroupValues, uniqueFileValues);
      })
      .catch((error: Error) => {
        console.error(getMessage('errorUpdatingSelection'), error);
      });
  };

  // 处理键盘导航事件
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!dropdownVisible) {
      // 如果下拉列表未显示，则不处理键盘事件
      return;
    }

    // 计算可选项的总数
    const totalOptions = fileCompletions.length +
      (openedFiles.length > 0 && searchText.length < 2 ? openedFiles.length : 0) +
      (mentionFiles.length > 0 && searchText.length < 2 ? mentionFiles.length : 0) +
      fileGroups.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡，避免和Ant Design的导航冲突
        if (totalOptions === 0) return; // 如果没有选项，不做任何操作

        setFocusedOptionIndex(prev => {
          // 移动到下一个选项，如果到达末尾则回到第一个
          const nextIndex = prev >= totalOptions - 1 ? 0 : prev + 1;
          console.log(`移动到下一个选项: ${nextIndex}`);
          return nextIndex;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡
        if (totalOptions === 0) return; // 如果没有选项，不做任何操作

        setFocusedOptionIndex(prev => {
          // 移动到上一个选项，如果到达顶部则移到最后一个
          const nextIndex = prev <= 0 ? totalOptions - 1 : prev - 1;
          console.log(`移动到上一个选项: ${nextIndex}`);
          return nextIndex;
        });
        break;

      case 'Enter':
        if (focusedOptionIndex >= 0) {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡
          // 选中当前聚焦的选项
          selectFocusedOption(focusedOptionIndex);
          console.log(`选中选项: ${focusedOptionIndex}`);
        }
        break;

      case 'Tab':
        if (focusedOptionIndex >= 0) {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡
          // 与Enter键相同，选中当前聚焦的选项
          selectFocusedOption(focusedOptionIndex);
          console.log(`选中选项: ${focusedOptionIndex}`);
        }
        break;

      case 'Escape':
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡
        // 关闭下拉菜单
        setDropdownVisible(false);
        // 清空搜索文本和重置选项索引
        setSearchText('');
        setFocusedOptionIndex(-1);
        console.log('关闭下拉菜单');
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

      // 关闭下拉菜单但保持焦点
      setDropdownVisible(false);
      // 清空搜索文本
      setSearchText('');
      // 重置选项索引
      setFocusedOptionIndex(-1);

      // 清空Select组件的搜索框内容并保持焦点
      if (selectRef.current) {
        try {
          // 保持焦点
          selectRef.current.focus();

          if (selectRef.current.clearInput) {
            selectRef.current.clearInput();
          }

          // 直接清除输入元素的值
          setTimeout(() => {
            if (selectRef.current && selectRef.current.selector) {
              const inputElement = selectRef.current.selector.querySelector('.ant-select-selection-search-input');
              if (inputElement) {
                inputElement.value = '';
                // 确保焦点保持在输入框上
                inputElement.focus();
              }
            }
          }, 50);
        } catch (error) {
          console.error('Error clearing search box:', error);
        }
      }
    }
  };

  // 格式化token数量显示，添加千位分隔符
  const formatTokenCount = (count: number): string => {
    return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="px-1 w-full" onKeyDown={handleKeyDown}>
      <div className="h-[1px] bg-gray-700/50 my-0.5 w-full"></div>
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-xs text-gray-400 flex items-center">
          <span className="mr-1">Tokens:</span>
          <span className="font-medium text-green-400">{formatTokenCount(tokenCount)}</span>
        </span>
      </div>
      <div className="flex items-center gap-1 w-full">
        <Select
          ref={selectRef}
          allowClear
          mode="multiple"
          style={{
            width: '100%',
            background: '#1f2937',
            borderColor: '#374151',
            color: '#e5e7eb',
            // minHeight: '28px',
            height: 'auto',
            fontSize: '12px',
            flex: '1 1 auto'
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
          onBlur={(e) => {
            // 检查是否是因为选择了选项而导致的失焦
            const relatedTarget = e.relatedTarget as HTMLElement;
            const isSelectingOption = relatedTarget &&
              (relatedTarget.classList.contains('ant-select-item') ||
                relatedTarget.closest('.ant-select-dropdown'));

            if (!isSelectingOption) {
              // 添加短暂延迟，避免点击下拉选项时触发blur
              setTimeout(() => {
                setDropdownVisible(false);
                // 重置聚焦的选项索引
                setFocusedOptionIndex(-1);
                // 清空搜索文本
                setSearchText('');
              }, 100);
            }
          }}
          open={dropdownVisible}
          onClear={async () => {
            try {
              // 使用文件组服务清空当前文件
              const result: { success: boolean; message: string } = await fileGroupService.clearCurrentFiles();
              if (result.success) {
                setSelectedGroups([]);
                setSelectedFiles([]);
                fetchFileGroups();
              }
            } catch (error: unknown) {
              console.error(getMessage('clearFailed'), error);
            }
          }}
          onSearch={(value) => {
            setSearchText(value);
            fetchFileCompletions(value);
            // 当搜索文本变化时，重置聚焦的选项索引
            setFocusedOptionIndex(-1);
          }}
          onDropdownVisibleChange={(visible) => {
            // 保持状态一致性
            setDropdownVisible(visible);
            if (!visible) {
              // 重置聚焦的选项索引
              setFocusedOptionIndex(-1);
              // 清空搜索文本
              setSearchText('');

              // 强制清除搜索框内容，但保持焦点
              setTimeout(() => {
                if (selectRef.current && selectRef.current.selector) {
                  const inputElement = selectRef.current.selector.querySelector('.ant-select-selection-search-input');
                  if (inputElement) {
                    inputElement.value = '';
                    // 确保焦点保持在输入框上
                    inputElement.focus();
                  }
                }
              }, 10);
            } else {
              // 当下拉菜单显示时，确保焦点在输入框上
              setTimeout(() => {
                if (selectRef.current && selectRef.current.selector) {
                  const inputElement = selectRef.current.selector.querySelector('.ant-select-selection-search-input');
                  if (inputElement) {
                    inputElement.focus();
                  }
                }
              }, 10);
            }
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
          // 禁用默认的键盘导航，使用我们自定义的导航
          listItemHeight={28}
          listHeight={320}
          menuItemSelectedIcon={null}
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
          popupClassName="dark-dropdown-menu keyboard-navigation-dropdown"
          dropdownStyle={{
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            fontSize: '12px'
          }}
          showSearch={true}
          tabIndex={0}
          autoClearSearchValue={true}
          getPopupContainer={() => document.body}
          tagRender={(props: CustomTagProps) => {
            const { label, value, closable, onClose } = props;
            // 判断是文件组还是文件
            const isFileGroup = fileGroups.some(group => group.name === value);

            // 如果是文件，获取文件名部分      
            let fileName = null;
            if (value) {
              if (isFileGroup) {
                fileName = value;
              } else {
                if (value.includes("/")) {
                  fileName = value.split("/").pop();
                } else if (value.includes("\\")) {
                  fileName = value.split("\\").pop();
                } else {
                  fileName = value;
                }
              }
            }

            return (
              <span
                className={`inline-flex items-center m-0.5 px-1 py-0.5 rounded text-xs ${isFileGroup ? 'bg-blue-700 text-blue-100' : 'bg-gray-700 text-gray-200'
                  }`}
                style={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2'
                }}
                title={value} // 鼠标悬停显示完整值
              >
                {isFileGroup ? (
                  // 文件组显示
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>{label}</span>
                  </span>
                ) : (
                  // 文件显示
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{fileName}</span>
                  </span>
                )}
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
          dropdownRender={(menu) => (
            <div className="keyboard-navigation-menu">
              {menu}
            </div>
          )}
          onKeyDown={(e) => {
            // 监听 Cmd/Ctrl + I 快捷键
            if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
              e.preventDefault();
              e.stopPropagation();
              // 发布事件让编辑器获得焦点
              eventBus.publish(EVENTS.EDITOR.FOCUS);
            }
            // 处理Escape键
            else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setDropdownVisible(false);
            }
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
                    <span className="text-gray-200 text-xs">{file.display} ({formatPathDisplay(file.path)})</span>
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
        {/* <CloseCircleOutlined
          className="text-gray-400 hover:text-gray-200 cursor-pointer text-sm"
          onClick={async () => {
            try {
              // 使用文件组服务清空当前文件
              const result: { success: boolean; message: string } = await fileGroupService.clearCurrentFiles();
              if (result.success) {
                setSelectedGroups([]);
                setSelectedFiles([]);
                fetchFileGroups();
              }
            } catch (error: unknown) {
              console.error(getMessage('clearFailed'), error);
            }
          }}
          title={getMessage('clearContext')}
        /> */}
      </div>
    </div>
  );
};

export default FileGroupSelect; 