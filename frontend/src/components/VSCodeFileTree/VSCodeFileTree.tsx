import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tree, Empty } from 'antd';
import { VSCodeFileTreeProps, VSCodeFileTreeNode } from './types';
import { filterTreeNodes, sortTreeNodes, getParentKeys } from './utils';
import FileTreeHeader from './components/FileTreeHeader';
import FileTreeSearch from './components/FileTreeSearch';
import FileTreeContextMenu from './components/FileTreeContextMenu';
import FileTreeNode from './components/FileTreeNode';
import './VSCodeFileTree.css';

const { DirectoryTree } = Tree;

const VSCodeFileTree: React.FC<VSCodeFileTreeProps> = ({
  treeData,
  expandedKeys = [],
  selectedKeys = [],
  onSelect,
  onExpand,
  onRefresh,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  onCopy,
  onCut,
  onPaste,
  projectName,
  showSearch = true,
  showHeader = true,
  allowContextMenu = true,
  customIcons,
  height = '100%',
  className = '',
  loading = false,
  readOnly = false,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [contextMenuNode, setContextMenuNode] = useState<VSCodeFileTreeNode | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [clipboardNode, setClipboardNode] = useState<VSCodeFileTreeNode | null>(null);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>(expandedKeys);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>(selectedKeys);

  // Update internal state when props change
  // useEffect(() => {
  //   setInternalExpandedKeys(expandedKeys);
  // }, [expandedKeys]);

  // useEffect(() => {
  //   setInternalSelectedKeys(selectedKeys);
  // }, [selectedKeys]);

  // Process tree data
  const processedTreeData = useMemo(() => {
    let processed = [...treeData];
    
    // Sort nodes
    processed = sortTreeNodes(processed);
    
    // Filter by search
    if (searchValue) {
      processed = filterTreeNodes(processed, searchValue);
      
      // Auto-expand all nodes when searching
      if (processed.length > 0) {
        const allKeys = getAllKeys(processed);
        setInternalExpandedKeys(allKeys);
      }
    }
    
    // Add custom titles with icons
    processed = addCustomTitles(processed);
    
    return processed;
  }, [treeData, searchValue, customIcons]);

  // Get all keys from tree for auto-expansion
  function getAllKeys (nodes: VSCodeFileTreeNode[]): string[] {
    const keys: string[] = [];
    const traverse = (nodeList: VSCodeFileTreeNode[]) => {
      nodeList.forEach(node => {
        keys.push(node.key);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return keys;
  };

  // Add custom titles with FileTreeNode component
  function addCustomTitles (nodes: VSCodeFileTreeNode[]): VSCodeFileTreeNode[] {
    return nodes.map(node => ({
      ...node,
      title: (
        <FileTreeNode
          node={node}
          customIcons={customIcons}
          showFullPath={!!searchValue}
        />
      ),
      children: node.children ? addCustomTitles(node.children) : undefined,
    }));
  };

  // Handle tree selection
  const handleSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    const stringKeys = selectedKeys.map(key => String(key));
    setInternalSelectedKeys(stringKeys);
    onSelect?.(stringKeys, info);
  }, [onSelect]);

  // Handle tree expansion
  const handleExpand = useCallback((expandedKeys: React.Key[], info: any) => {
    const stringKeys = expandedKeys.map(key => String(key));
    setInternalExpandedKeys(stringKeys);
    console.log('-------',stringKeys)
    onExpand?.(stringKeys, info);
  }, [onExpand]);

  // Handle right-click context menu
  const handleRightClick = useCallback(({ event, node }: { event: React.MouseEvent; node: any }) => {
    if (!allowContextMenu) return;
    
    event.preventDefault();
    setContextMenuNode(node);
    setContextMenuVisible(true);
  }, [allowContextMenu]);

  // Context menu handlers
  const handleCreateFile = useCallback((parentPath: string) => {
    onCreateFile?.(parentPath, '');
  }, [onCreateFile]);

  const handleCreateFolder = useCallback((parentPath: string) => {
    onCreateFolder?.(parentPath, '');
  }, [onCreateFolder]);

  const handleDelete = useCallback((node: VSCodeFileTreeNode) => {
    onDelete?.(node);
  }, [onDelete]);

  const handleRename = useCallback((node: VSCodeFileTreeNode) => {
    onRename?.(node, '');
  }, [onRename]);

  const handleCopy = useCallback((node: VSCodeFileTreeNode) => {
    setClipboardNode({ ...node, customData: { operation: 'copy' } });
    onCopy?.(node);
  }, [onCopy]);

  const handleCut = useCallback((node: VSCodeFileTreeNode) => {
    setClipboardNode({ ...node, customData: { operation: 'cut' } });
    onCut?.(node);
  }, [onCut]);

  const handlePaste = useCallback((targetNode: VSCodeFileTreeNode) => {
    if (clipboardNode) {
      onPaste?.(targetNode);
      // Clear clipboard after paste
      if (clipboardNode.customData?.operation === 'cut') {
        setClipboardNode(null);
      }
    }
  }, [clipboardNode, onPaste]);

  const handleHeaderCreateFile = useCallback(() => {
    onCreateFile?.('', '');
  }, [onCreateFile]);

  const handleHeaderCreateFolder = useCallback(() => {
    onCreateFolder?.('', '');
  }, [onCreateFolder]);

  return (
    <div 
      className={`vscode-file-tree ${className}`}
      style={{ height }}
    >
      {showHeader && (
        <FileTreeHeader
          title={projectName || 'Explorer'}
          onRefresh={onRefresh}
          onCreateFile={!readOnly ? handleHeaderCreateFile : undefined}
          onCreateFolder={!readOnly ? handleHeaderCreateFolder : undefined}
          loading={loading}
          readOnly={readOnly}
        />
      )}

      {showSearch && (
        <FileTreeSearch
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Search files..."
        />
      )}

      <div className="vscode-file-tree-content">
        {processedTreeData.length === 0 ? (
          <div className="vscode-empty-state">
            {searchValue ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No matching files found"
                className="vscode-empty"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No files found"
                className="vscode-empty"
              />
            )}
          </div>
        ) : (
          <>
            <DirectoryTree
              showIcon={false}
              autoExpandParent={!!searchValue}
              // expandedKeys={internalExpandedKeys}
              // selectedKeys={internalSelectedKeys}
              onSelect={handleSelect}
              onExpand={handleExpand}
              onRightClick={handleRightClick}
              treeData={processedTreeData}
              className="vscode-tree"
            />
            
            {allowContextMenu && (
              <FileTreeContextMenu
                node={contextMenuNode}
                visible={contextMenuVisible}
                onClose={() => setContextMenuVisible(false)}
                onCreateFile={!readOnly ? handleCreateFile : undefined}
                onCreateFolder={!readOnly ? handleCreateFolder : undefined}
                onDelete={!readOnly ? handleDelete : undefined}
                onRename={!readOnly ? handleRename : undefined}
                onCopy={handleCopy}
                onCut={!readOnly ? handleCut : undefined}
                onPaste={!readOnly ? handlePaste : undefined}
                readOnly={readOnly}
                clipboardNode={clipboardNode}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VSCodeFileTree;