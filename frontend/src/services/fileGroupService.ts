import { EventEmitter } from 'eventemitter3';

/**
 * 文件组服务类 - 处理文件组相关操作
 */
export class FileGroupService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * 获取所有文件组
   * @returns 文件组列表
   */
  async fetchFileGroups() {
    try {
      const response = await fetch('/api/file-groups');
      const data = await response.json();
      return data.groups || [];
    } catch (error) {
      console.error('Error fetching file groups:', error);
      this.emit('error', '获取文件组失败');
      return [];
    }
  }

  /**
   * 切换文件组和文件
   * @param groupNames 组名列表
   * @param filePaths 文件路径列表
   * @returns 切换结果，包含token数量
   */
  async switchFileGroups(groupNames: string[], filePaths: string[]) {
    try {
      const response = await fetch('/api/file-groups/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group_names: groupNames,
          file_paths: filePaths
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch file groups');
      }
      
      const data = await response.json();
      
      // 发布文件组切换事件
      this.emit('fileGroupsSwitched', { groupNames, filePaths });
      
      return {
        success: true,
        totalTokens: data.total_tokens,
        message: data.message
      };
    } catch (error) {
      console.error('Error switching file groups:', error);
      this.emit('error', '切换文件组失败');
      return {
        success: false,
        totalTokens: 0,
        message: '切换文件组失败'
      };
    }
  }

  /**
   * 创建新的文件组
   * @param name 组名
   * @param description 描述
   * @returns 创建结果
   */
  async createFileGroup(name: string, description: string = '') {
    try {
      const response = await fetch('/api/file-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          description: description
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create file group');
      }
      
      const data = await response.json();
      
      // 发布文件组创建事件
      this.emit('fileGroupCreated', { name, description });
      
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error creating file group:', error);
      this.emit('error', '创建文件组失败');
      return {
        success: false,
        message: '创建文件组失败'
      };
    }
  }

  /**
   * 删除文件组
   * @param name 组名
   * @returns 删除结果
   */
  async deleteFileGroup(name: string) {
    try {
      const response = await fetch(`/api/file-groups/${name}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file group');
      }
      
      const data = await response.json();
      
      // 发布文件组删除事件
      this.emit('fileGroupDeleted', { name });
      
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error deleting file group:', error);
      this.emit('error', '删除文件组失败');
      return {
        success: false,
        message: '删除文件组失败'
      };
    }
  }

  /**
   * 向文件组添加文件
   * @param groupName 组名
   * @param files 文件路径列表
   * @returns 添加结果
   */
  async addFilesToGroup(groupName: string, files: string[]) {
    try {
      const response = await fetch(`/api/file-groups/${groupName}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: files
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add files to group');
      }
      
      const data = await response.json();
      
      // 发布文件添加事件
      this.emit('filesAddedToGroup', { groupName, files });
      
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error adding files to group:', error);
      this.emit('error', '向文件组添加文件失败');
      return {
        success: false,
        message: '向文件组添加文件失败'
      };
    }
  }

  /**
   * 从文件组移除文件
   * @param groupName 组名
   * @param files 文件路径列表
   * @returns 移除结果
   */
  async removeFilesFromGroup(groupName: string, files: string[]) {
    try {
      const response = await fetch(`/api/file-groups/${groupName}/files`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: files
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove files from group');
      }
      
      const data = await response.json();
      
      // 发布文件移除事件
      this.emit('filesRemovedFromGroup', { groupName, files });
      
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error removing files from group:', error);
      this.emit('error', '从文件组移除文件失败');
      return {
        success: false,
        message: '从文件组移除文件失败'
      };
    }
  }

  /**
   * 清空当前文件上下文
   * @returns 清空结果
   */
  async clearCurrentFiles() {
    try {
      const response = await fetch('/api/file-groups/clear', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear current files');
      }
      
      const data = await response.json();
      
      // 发布清空事件
      this.emit('currentFilesCleared');
      
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error clearing current files:', error);
      this.emit('error', '清空当前文件上下文失败');
      return {
        success: false,
        message: '清空当前文件上下文失败'
      };
    }
  }

  /**
   * 自动创建文件组
   * @param options 选项
   * @returns 创建结果
   */
  async autoCreateGroups(options = { fileSizeLimit: 100, skipDiff: false, groupNumLimit: 10 }) {
    try {
      const response = await fetch('/api/file-groups/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_size_limit: options.fileSizeLimit,
          skip_diff: options.skipDiff,
          group_num_limit: options.groupNumLimit
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to auto create file groups');
      }
      
      const data = await response.json();
      
      // 发布自动创建事件
      this.emit('fileGroupsAutoCreated', data.groups);
      
      return {
        success: true,
        groups: data.groups || [],
        message: data.message
      };
    } catch (error) {
      console.error('Error auto creating file groups:', error);
      this.emit('error', '自动创建文件组失败');
      return {
        success: false,
        groups: [],
        message: '自动创建文件组失败'
      };
    }
  }
}

// 创建单例实例
export const fileGroupService = new FileGroupService();
