import React, { useState, useEffect, useRef } from 'react';
import { Tree, Input, Button, message, Tooltip, Menu, Dropdown, Checkbox } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import {
  SearchOutlined,
  CheckOutlined,
  PlusOutlined,
  FolderOutlined,
  FileOutlined,
  FilterOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  UndoOutlined,
  SwapOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import './FileDirectorySelector.css';

// 自定义防抖 hook
function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const timer = useRef<NodeJS.Timeout | null>(null);

  const debouncedFunction = (...args: any[]) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };

  // 可选：在组件卸载时清除定时器
  React.useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  return debouncedFunction;
}

interface FileDirectorySelectorProps {
  treeData: DataNode[];
  checkedKeys: React.Key[];
  onCheckedKeysChange: (keys: React.Key[]) => void;
  onFileSelect?: (path: string) => void;
  onAddFiles?: () => void;
  selectedGroup?: { name: string } | null;
  onRefreshTree?: () => void;   // 新增刷新函数props
}

// 文件类型常量和颜色映射
const FILE_TYPE_COLORS: Record<string, string> = {
  js: '#f7df1e',
  jsx: '#61dafb',
  ts: '#3178c6',
  tsx: '#3178c6',
  css: '#264de4',
  scss: '#cc6699',
  html: '#e34c26',
  json: '#8bc34a',
  md: '#42a5f5',
  py: '#3572A5',
  java: '#b07219',
  go: '#00ADD8',
  rs: '#dea584',
  c: '#555555',
  cpp: '#f34b7d',
  sh: '#89e051',
  // 可以继续添加更多文件类型
};

// 获取文件图标颜色
const getFileIconColor = (filePath: string): string => {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_COLORS[extension] || '#9ca3af';  // 默认颜色
};

// 判断节点是否为目录
const isDirectory = (node: DataNode): boolean => {
  return !node.isLeaf;
};

// Helper function to get all file paths from tree data
const getAllFilePaths = (nodes: DataNode[]): string[] => {
  const paths: string[] = [];

  const traverse = (node: DataNode) => {
    if (node.isLeaf) {
      paths.push(node.key as string);
    } else if (node.children) {
      node.children.forEach(traverse);
    }
  };

  nodes.forEach(traverse);
  return paths;
};

const FileDirectorySelector: React.FC<FileDirectorySelectorProps> = ({
  treeData,
  checkedKeys,
  onCheckedKeysChange,
  onFileSelect,
  onAddFiles,
  selectedGroup,
  onRefreshTree
}) => {
  const [filteredTreeData, setFilteredTreeData] = useState<DataNode[]>(treeData);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [rightClickNode, setRightClickNode] = useState<DataNode | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const treeRef = useRef<any>(null);
  const [allowDrop, setAllowDrop] = useState<boolean>(true);
  const [filterDropdownVisible, setFilterDropdownVisible] = useState<boolean>(false);
  const [fileTypeFilters, setFileTypeFilters] = useState<string[]>([]);
  // 新增状态：跟踪当前是全选模式还是反选模式
  const [isSelectAllMode, setIsSelectAllMode] = useState<boolean>(true);

  // 防抖搜索函数
  const debouncedFilterTreeData = useDebounce((value: string) => {
    filterTreeData(value);
  }, 500);

  // 当treeData变化时更新filteredTreeData
  useEffect(() => {
    setFilteredTreeData(treeData);
    // 提取所有文件类型作为过滤选项
    const types = new Set<string>();
    const extractTypes = (nodes: DataNode[]) => {
      nodes.forEach(node => {
        if (node.isLeaf) {
          const key = node.key as string;
          const ext = key.split('.').pop()?.toLowerCase();
          if (ext) types.add(ext);
        }
        if (node.children) extractTypes(node.children);
      });
    };
    extractTypes(treeData);
    setFileTypeFilters(Array.from(types));
  }, [treeData]);

  // 搜索过滤逻辑
  const filterTreeData = (value: string, data: DataNode[] = treeData) => {
    const searchTerm = value.toLowerCase();

    if (!searchTerm) {
      setFilteredTreeData(data);
      return;
    }

    // 先判断用户输入是否正好是某个文件路径
    const exactFileNode = (() => {
      let foundNode: DataNode | null = null;

      const searchFileNode = (nodes: DataNode[]) => {
        for (const node of nodes) {
          const nodePath = node.key.toString();
          if (node.isLeaf && nodePath.toLowerCase() === searchTerm) {
            foundNode = node;
            return;
          }
          if (node.children) {
            searchFileNode(node.children);
            if (foundNode) return;
          }
        }
      };

      searchFileNode(data);
      return foundNode;
    })();

    if (exactFileNode) {
      // 如果是文件，直接只显示该文件节点
      setFilteredTreeData([
        {
          ...exactFileNode,
          children: undefined,  // 文件无子节点
        }
      ]);
      // 不展开任何目录
      setExpandedKeys([]);
      return;
    }

    // 递归查找并保持树形结构
    const filterData = (nodes: DataNode[]): DataNode[] => {
      return nodes.map(node => {
        const newNode = { ...node };
        const nodeTitle = typeof node.title === 'string' ? node.title : '';
        const nodePath = node.key.toString();

        if (node.children?.length) {
          newNode.children = filterData(node.children);
          return newNode.children.length > 0 || nodePath.toLowerCase().includes(searchTerm) ? newNode : null;
        }

        return nodePath.toLowerCase().includes(searchTerm) ? newNode : null;
      }).filter(Boolean) as DataNode[];
    };

    // 开始过滤，保持目录结构
    const filteredData = filterData(data);
    setFilteredTreeData(filteredData);

    // 自动展开包含搜索结果的目录
    const findExpandKeys = (nodes: DataNode[], paths: string[] = []): string[] => {
      nodes.forEach(node => {
        if (!isDirectory(node)) return;

        const hasMatchingChild = node.children?.some(child => {
          const childPath = child.key.toString().toLowerCase();
          return childPath.includes(searchTerm);
        });

        if (hasMatchingChild) {
          paths.push(node.key.toString());
        }

        if (node.children) {
          findExpandKeys(node.children, paths);
        }
      });
      return paths;
    };

    setExpandedKeys(findExpandKeys(data));
  };

  // 增强树节点的显示
  const enhanceTreeDataWithIcons = (data: DataNode[]): DataNode[] => {
    return data.map(node => {
      const isLeaf = node.isLeaf;
      const nodePath = node.key.toString();
      let icon;

      if (isLeaf) {
        const fileColor = getFileIconColor(nodePath);
        icon = <FileOutlined className="file-icon" style={{ color: fileColor }} />;
      } else {
        // 根据是否展开显示不同的文件夹图标
        const isExpanded = expandedKeys.includes(nodePath);
        icon = isExpanded ?
          <FolderOpenOutlined className="file-icon folder-icon" /> :
          <FolderOutlined className="file-icon folder-icon" />;
      }

      // 提取文件名用于显示
      const pathParts = nodePath.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // 高亮搜索匹配部分
      const highlightTitle = () => {
        if (!searchValue) return fileName;

        const index = fileName.toLowerCase().indexOf(searchValue.toLowerCase());
        if (index === -1) return fileName;

        const beforeStr = fileName.substring(0, index);
        const matchStr = fileName.substring(index, index + searchValue.length);
        const afterStr = fileName.substring(index + searchValue.length);

        return (
          <span>
            {beforeStr}
            <span className="search-highlight">{matchStr}</span>
            {afterStr}
          </span>
        );
      };

      const enhancedNode: DataNode = {
        ...node,
        title: (
          <span className="file-node-title" title={nodePath}>
            {icon}
            <span className="file-name">{highlightTitle()}</span>
          </span>
        ) as React.ReactNode
      };

      if (node.children) {
        enhancedNode.children = enhanceTreeDataWithIcons(node.children);
      }

      return enhancedNode;
    });
  };

  // 增强的树数据
  const enhancedTreeData = enhanceTreeDataWithIcons(filteredTreeData);

  // 右键菜单处理
  const handleRightClick = (event: React.MouseEvent, node: DataNode) => {
    event.preventDefault();
    event.stopPropagation();
    setRightClickNode(node);
    setContextMenuVisible(true);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };

  // 构建右键菜单
  const buildContextMenu = () => {
    if (!rightClickNode) return null;

    const isDir = !rightClickNode.isLeaf;
    const path = rightClickNode.key.toString();

    return (
      <Menu
        className="file-context-menu"
        onClick={({ key }) => handleContextMenuClick(key, path, isDir)}
      >
        {isDir ? (
          <>
            <Menu.Item key="expand" icon={<FolderOpenOutlined />}>
              {expandedKeys.includes(path) ? "Collapse" : "Expand"}
            </Menu.Item>
            <Menu.Item key="selectAll" icon={<CheckOutlined />}>
              Select All Files Inside
            </Menu.Item>
            <Menu.Divider />
          </>
        ) : (
          <>
            <Menu.Item key="select" icon={<CheckOutlined />}>
              {checkedKeys.includes(path) ? "Deselect" : "Select"}
            </Menu.Item>
            <Menu.Item key="preview" icon={<FileOutlined />}>
              Preview File
            </Menu.Item>
            <Menu.Divider />
          </>
        )}
        <Menu.Item key="copy" icon={<CopyOutlined />}>
          Copy Path
        </Menu.Item>
        {selectedGroup && !isDir && (
          <Menu.Item key="add" icon={<PlusOutlined />} disabled={!selectedGroup}>
            Add to {selectedGroup.name}
          </Menu.Item>
        )}
      </Menu>
    );
  };

  // 处理右键菜单点击
  const handleContextMenuClick = (key: string, path: string, isDir: boolean) => {
    setContextMenuVisible(false);

    switch (key) {
      case 'expand':
        if (expandedKeys.includes(path)) {
          setExpandedKeys(expandedKeys.filter(k => k !== path));
        } else {
          setExpandedKeys([...expandedKeys, path]);
        }
        break;
      case 'selectAll':
        // 选择目录下所有文件
        if (isDir) {
          const childFiles = getAllFilesInDirectory(path, treeData);
          const newCheckedKeys = Array.from(new Set([...checkedKeys, ...childFiles]));
          onCheckedKeysChange(newCheckedKeys);
        }
        break;
      case 'select':
        if (checkedKeys.includes(path)) {
          onCheckedKeysChange(checkedKeys.filter(k => k !== path));
        } else {
          onCheckedKeysChange([...checkedKeys, path]);
        }
        break;
      case 'preview':
        onFileSelect?.(path);
        break;
      case 'copy':
        navigator.clipboard.writeText(path)
          .then(() => message.success('Path copied to clipboard'))
          .catch(() => message.error('Failed to copy path'));
        break;
      case 'add':
        if (selectedGroup && onAddFiles) {
          // 处理添加的文件路径
          const pathsToAdd: React.Key[] = [];
          if (isDir) {
            // 如果是目录，添加该目录下的所有文件
            const dirFiles = getAllFilesInDirectory(path, treeData);
            pathsToAdd.push(...dirFiles);
          } else {
            pathsToAdd.push(path);
          }

          // 打印要添加的文件路径
          console.log('Files to add from context menu:', pathsToAdd);
          
          onCheckedKeysChange(pathsToAdd);

          // 使用处理后的文件路径调用 onAddFiles
          setTimeout(() => {
            onAddFiles();
          }, 100);
        }
        break;
    }
  };

  // 处理文件拖动
  const onDrop = (info: any) => {
    if (!allowDrop || !selectedGroup) return;

    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;

    // 如果是文件拖到目录中
    if (!info.dragNode.isLeaf && info.node.isLeaf) {
      return; // 不允许将目录拖到文件上
    }

    // 如果是文件拖动，添加到选中列表
    if (info.dragNode.isLeaf) {
      if (!checkedKeys.includes(dragKey)) {
        onCheckedKeysChange([...checkedKeys, dragKey]);
        message.success('File added to selection');
      }
    }
  };

  // 处理树节点选择 - 增强后的方法
  const handleCheck = (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }, info: any) => {
    const checkedKeysArray = Array.isArray(checked) ? checked : checked.checked;
    
    // 过滤掉所有目录，只保留文件节点
    let newCheckedKeys = checkedKeysArray.filter(key => {
      // 从treeData中查找该key对应的节点是否为文件（叶子节点）
      const isLeafNode = (nodes: DataNode[], nodeKey: React.Key): boolean => {
        for (const node of nodes) {
          if (node.key === nodeKey) {
            return !!node.isLeaf;
          }
          if (node.children) {
            const found = isLeafNode(node.children, nodeKey);
            if (found) return true;
          }
        }
        return false;
      };
      
      return isLeafNode(treeData, key);
    });

    console.log('Processed checked keys:', newCheckedKeys);

    // 更新选中状态
    onCheckedKeysChange(newCheckedKeys);
  };
  
  // 获取目录下所有文件
  const getAllFilesInDirectory = (dirPath: string, nodes: DataNode[]): string[] => {
    const files: string[] = [];

    // 标准化路径（将反斜杠转换为正斜杠）
    const normalizePath = (p: string): string => p.replace(/\\/g, '/');
    const normalizedDirPath = normalizePath(dirPath);

    const traverseDir = (path: string, nodesArray: DataNode[]) => {
      // 找到指定路径的节点
      const findNode = (p: string, ns: DataNode[]): DataNode | null => {
        const normalizedP = normalizePath(p);
        for (const n of ns) {
          const normalizedNodeKey = normalizePath(n.key.toString());
          if (normalizedNodeKey === normalizedP) return n;
          if (n.children) {
            const found = findNode(p, n.children);
            if (found) return found;
          }
        }
        return null;
      };

      const dirNode = findNode(path, nodesArray);

      if (dirNode && dirNode.children) {
        // 收集子节点的所有文件
        const collectFiles = (node: DataNode) => {
          if (node.isLeaf) {
            files.push(node.key.toString());
          } else if (node.children) {
            node.children.forEach(collectFiles);
          }
        };

        dirNode.children.forEach(collectFiles);
      }
    };

    traverseDir(normalizedDirPath, nodes);
    return files;
  };
  
  // 获取处理后的文件数量
  const getProcessedFileCount = (): number => {
    return checkedKeys.length;
  };

  // 获取所有可选文件（当前过滤条件下的文件）
  const getAllSelectableFiles = (): React.Key[] => {
    return getAllFilePaths(filteredTreeData);
  };

  // 修改：处理全选/反选切换功能
  const handleSelectionToggle = () => {
    const allFiles = getAllSelectableFiles();
    
    if (isSelectAllMode) {
      // 全选模式
      onCheckedKeysChange(allFiles);
      message.success(`已选择 ${allFiles.length} 个文件`);
    } else {
      // 反选模式
      const invertedSelection = allFiles.filter(file => !checkedKeys.includes(file));
      onCheckedKeysChange(invertedSelection);
      message.success(`已反选 ${invertedSelection.length} 个文件`);
    }
    
    // 切换模式
    setIsSelectAllMode(!isSelectAllMode);
  };

  // 渲染过滤下拉菜单
  const renderFilterDropdown = () => {
    return (
      <Menu className="file-type-filter-menu">
        <Menu.ItemGroup title="Filter by File Type">
          {fileTypeFilters.map(type => (
            <Menu.Item key={type}>
              <Checkbox>{type}</Checkbox>
            </Menu.Item>
          ))}
        </Menu.ItemGroup>
      </Menu>
    );
  };

  return (
    <div className="file-directory-selector">
      <div className="search-container">
        <div className="search-header" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search files..."
            className="search-input"
            value={searchValue}
            onChange={(e) => {
              const value = e.target.value;
              setSearchValue(value);
              debouncedFilterTreeData(value);
            }}
            suffix={
              <Dropdown
                overlay={renderFilterDropdown()}
                trigger={['click']}
                open={filterDropdownVisible}
                onOpenChange={setFilterDropdownVisible}
              >
                <FilterOutlined className="filter-icon" />
              </Dropdown>
            }
          />
          {onRefreshTree && (
            <Tooltip title="刷新目录树">
              <Button
                icon={
                  refreshLoading ? (
                    <UndoOutlined spin style={{ transition: 'transform 0.3s' }} />
                  ) : (
                    <UndoOutlined />
                  )
                }
                loading={refreshLoading}
                onClick={async () => {
                  try {
                    setRefreshLoading(true);
                    await onRefreshTree();
                    setSearchValue('');
                    filterTreeData('');
                  } finally {
                    setRefreshLoading(false);
                  }
                }}
                className="refresh-tree-button"
              />
            </Tooltip>
          )}
        </div>

        {selectedGroup && (
          <div className="action-buttons">
            <Button
              type="primary"
              onClick={onAddFiles}
              disabled={checkedKeys.length === 0}
              icon={<PlusOutlined />}
              className="add-button"
              block
            >
              Add Selected ({getProcessedFileCount()})
            </Button>
            <Tooltip title={isSelectAllMode ? "全选当前可见文件" : "反选当前可见文件"}>
              <Button
                onClick={handleSelectionToggle}
                icon={isSelectAllMode ? <CheckOutlined /> : <SwapOutlined />}
                className={`selection-toggle-button ${isSelectAllMode ? "select-all-mode" : "invert-mode"}`}
              />
            </Tooltip>
          </div>
        )}
      </div>

      <div className="file-tree-container">
        <Tree
          ref={treeRef}
          checkable
          treeData={enhancedTreeData}
          checkedKeys={checkedKeys}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          onCheck={handleCheck}
          onSelect={(_, info) => {
            const node = info.node;
            if (node.isLeaf && onFileSelect) {
              onFileSelect(node.key as string);
            }
          }}
          onRightClick={({ event, node }) => handleRightClick(event, node)}
          onDoubleClick={(event: any, node: any) => {
            if (node.isLeaf && onFileSelect) {
              onFileSelect(node.key as string);
            }
          }}
          draggable={allowDrop}
          onDrop={onDrop}
          className="custom-dark-tree"
          showIcon={false} // 使用自定义图标
          showLine={{ showLeafIcon: false }}
          blockNode
          autoExpandParent={false}
          virtual={false}
        />

        {/* 右键菜单 */}
        {contextMenuVisible && (
          <div
            className="context-menu-wrapper"
            style={{ position: 'fixed', top: contextMenuPosition.y, left: contextMenuPosition.x }}
          >
            {buildContextMenu()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDirectorySelector; 