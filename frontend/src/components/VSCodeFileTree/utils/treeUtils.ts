import { VSCodeFileTreeNode } from '../types';

/**
 * Filter tree nodes based on search text
 */
export function filterTreeNodes(
  nodes: VSCodeFileTreeNode[],
  searchText: string
): VSCodeFileTreeNode[] {
  console.log('[treeUtils] filterTreeNodes called:', {
    nodesLength: nodes.length,
    searchText,
  });

  if (!searchText) {
    console.log('[treeUtils] No search text, returning original nodes');
    return nodes;
  }

  const searchLower = searchText.toLowerCase();
  const result: VSCodeFileTreeNode[] = [];

  function searchInNode(node: VSCodeFileTreeNode): VSCodeFileTreeNode | null {
    const nodeName = (node.title as string) || node.key;
    const nodeMatches = nodeName.toLowerCase().includes(searchLower);
    
    console.log('[treeUtils] Searching in node:', {
      key: node.key,
      nodeName,
      nodeMatches,
      hasChildren: !!node.children?.length,
    });
    
    let matchingChildren: VSCodeFileTreeNode[] = [];
    
    if (node.children) {
      matchingChildren = node.children
        .map(child => searchInNode(child))
        .filter(child => child !== null) as VSCodeFileTreeNode[];
      
      console.log('[treeUtils] Children search results:', {
        originalChildrenCount: node.children.length,
        matchingChildrenCount: matchingChildren.length,
      });
    }

    if (nodeMatches || matchingChildren.length > 0) {
      const resultNode = {
        ...node,
        children: matchingChildren.length > 0 ? matchingChildren : node.children,
      };
      console.log('[treeUtils] Node included in results:', {
        key: node.key,
        reason: nodeMatches ? 'node matches' : 'has matching children',
      });
      return resultNode;
    }

    console.log('[treeUtils] Node excluded from results:', node.key);
    return null;
  }

  nodes.forEach(node => {
    const matchingNode = searchInNode(node);
    if (matchingNode) {
      result.push(matchingNode);
    }
  });

  console.log('[treeUtils] Filter complete:', {
    originalCount: nodes.length,
    filteredCount: result.length,
  });

  return result;
}

/**
 * Get all file nodes from tree (flattened)
 */
export function getAllFileNodes(nodes: VSCodeFileTreeNode[]): VSCodeFileTreeNode[] {
  const result: VSCodeFileTreeNode[] = [];

  function traverse(nodeList: VSCodeFileTreeNode[]) {
    nodeList.forEach(node => {
      if (node.isLeaf) {
        result.push(node);
      } else if (node.children) {
        traverse(node.children);
      }
    });
  }

  traverse(nodes);
  return result;
}

/**
 * Find node by key in tree
 */
export function findNodeByKey(
  nodes: VSCodeFileTreeNode[],
  key: string
): VSCodeFileTreeNode | null {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get parent path from a file path
 */
export function getParentPath(path: string): string {
  const parts = path.split('/');
  return parts.slice(0, -1).join('/');
}

/**
 * Get all parent keys for a given key
 */
export function getParentKeys(
  nodes: VSCodeFileTreeNode[],
  targetKey: string
): string[] {
  const parentKeys: string[] = [];

  function findParents(nodeList: VSCodeFileTreeNode[], currentPath: string[]): boolean {
    for (const node of nodeList) {
      const newPath = [...currentPath, node.key];
      
      if (node.key === targetKey) {
        parentKeys.push(...currentPath);
        return true;
      }
      
      if (node.children && findParents(node.children, newPath)) {
        return true;
      }
    }
    return false;
  }

  findParents(nodes, []);
  return parentKeys;
}

/**
 * Sort tree nodes (folders first, then files, both alphabetically)
 */
export function sortTreeNodes(nodes: VSCodeFileTreeNode[]): VSCodeFileTreeNode[] {
  console.log('[treeUtils] sortTreeNodes called:', {
    nodesLength: nodes.length,
  });

  const sorted = [...nodes].sort((a, b) => {
    // Folders first
    if (!a.isLeaf && b.isLeaf) return -1;
    if (a.isLeaf && !b.isLeaf) return 1;
    
    // Then alphabetically
    const nameA = (a.title as string) || a.key;
    const nameB = (b.title as string) || b.key;
    return nameA.localeCompare(nameB);
  });

  console.log('[treeUtils] Nodes sorted:', {
    originalOrder: nodes.map(n => n.key),
    sortedOrder: sorted.map(n => n.key),
  });

  // Recursively sort children
  const result = sorted.map(node => ({
    ...node,
    children: node.children ? sortTreeNodes(node.children) : undefined,
  }));

  console.log('[treeUtils] sortTreeNodes complete');
  return result;
}

/**
 * Convert file path to tree structure
 */
export function pathToTreeNode(
  path: string,
  isFile: boolean = true,
  customData?: any
): VSCodeFileTreeNode {
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  
  return {
    key: path,
    title: name,
    isLeaf: isFile,
    path,
    type: isFile ? 'file' : 'folder',
    extension: isFile ? name.split('.').pop()?.toLowerCase() : undefined,
    customData,
  };
}

/**
 * Build tree structure from flat file list
 */
export function buildTreeFromPaths(paths: string[]): VSCodeFileTreeNode[] {
  const root: { [key: string]: VSCodeFileTreeNode } = {};

  paths.forEach(path => {
    const parts = path.split('/').filter(Boolean);
    let current = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLastPart = index === parts.length - 1;
      
      if (!current[part]) {
        current[part] = {
          key: currentPath,
          title: part,
          isLeaf: isLastPart,
          path: currentPath,
          type: isLastPart ? 'file' : 'folder',
          extension: isLastPart ? part.split('.').pop()?.toLowerCase() : undefined,
          children: isLastPart ? undefined : [],
        };
      }
      
      if (!isLastPart && current[part].children) {
        current = current[part].children.reduce((acc, child) => {
          acc[child.title as string] = child;
          return acc;
        }, {} as { [key: string]: VSCodeFileTreeNode });
      }
    });
  });

  return Object.values(root);
}