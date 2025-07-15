import type { DataNode as VSCodeFileTreeNode } from "antd/es/tree";

/**
 * Sort tree nodes (folders first, then files, both alphabetically)
 */
export function sortTreeNodes(nodes: VSCodeFileTreeNode[]): VSCodeFileTreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    // Folders first
    if (!a.isLeaf && b.isLeaf) return -1;
    if (a.isLeaf && !b.isLeaf) return 1;
    
    // Then alphabetically
    const nameA = (a.title as string) || a.key;
    const nameB = (b.title as string) || b.key;
    return nameA?.localeCompare?.(nameB);
  });

  // Recursively sort children
  const result = sorted.map(node => ({
    ...node,
    children: node.children ? sortTreeNodes(node.children) : undefined,
  }));

  return result;
}


/**
 * 
 * @param nodes 原始节点数组
 * @param parentPath 当前父路径（内部递归使用）
 * @returns 处理后的节点数组
 */
export function compactFolders(nodes: VSCodeFileTreeNode[], parentPath = ""): VSCodeFileTreeNode[] {
 const list =  nodes.map(node => {
    const currentPath = (parentPath ? `${parentPath}/${node.title}` : node.title) as string;

    // 如果是文件，直接返回（不参与路径合并）
    if (node.isLeaf) {
      return { ...node };
    }

    // 如果是目录且只有一个子目录，则合并路径
    if (!node.isLeaf && node.children?.length === 1 && !node.children[0].isLeaf) {
      const mergedChild = compactFolders(node.children, currentPath)[0];
      return {
        ...mergedChild,
        title: `${node.title}/${mergedChild.title}`,
        key: currentPath + "/" + mergedChild.title,  
      };
    }

    // 普通目录（有多个子节点或子节点是文件）
    return {
      ...node,
      key: currentPath,
      children: node.children ? compactFolders(node.children, currentPath) : [],
    };
  });
 
  return list
}