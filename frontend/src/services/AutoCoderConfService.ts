import { EventEmitter } from 'eventemitter3';
import { message as AntdMessage } from 'antd';
import { ConfigState, ConfigKey } from '../components/Sidebar/types';

// 定义配置服务类
export class AutoCoderConfService extends EventEmitter {
  private config: ConfigState = {
    human_as_model: false,    
    extra_conf: {},
    available_keys: []
  };

  constructor() {
    super();
    // 初始化时加载配置
    this.fetchConfig();
    this.fetchConfigKeys();
  }

  // 获取当前配置
  public getConfig(): ConfigState {
    return { ...this.config };
  }

  // 获取配置
  private async fetchConfig(): Promise<ConfigState | null> {
    try {
      const response = await fetch('/api/conf');
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const data = await response.json();
      const { human_as_model, skip_build_index, project_type, ...extraConf } = data.conf;

      this.config = {
        ...this.config,
        human_as_model: human_as_model === "true",
        skip_build_index: skip_build_index === "true",
        project_type: project_type,
        extra_conf: this.convertToStringValues(extraConf)
      };

      // 通知订阅者配置已更新
      this.emit('configUpdated', this.config);

      return this.config;
    } catch (error) {
      console.error('Error fetching config:', error);
      this.emit('error', 'Failed to fetch configuration');
      return null;
    }
  }

  // 将值转换为字符串，确保类型兼容性
  private convertToStringValues(obj: Record<string, any>): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key in obj) {
      result[key] = String(obj[key]);
    }
    return result;
  }

  // 获取可用的配置键
  private async fetchConfigKeys(): Promise<ConfigKey[] | null> {
    try {
      const response = await fetch('/api/conf/keys');
      if (!response.ok) {
        throw new Error('Failed to fetch configuration keys');
      }

      const data = await response.json();
      
      this.config = {
        ...this.config,
        available_keys: data.keys
      };

      // 通知订阅者配置键已更新
      this.emit('configKeysUpdated', this.config.available_keys);
      return this.config.available_keys;
    } catch (error) {
      console.error('Error fetching configuration keys:', error);
      this.emit('error', 'Failed to fetch configuration keys');
      return null;
    }
  }

  // 更新配置
  public async updateConfig(key: string, value: boolean | string): Promise<boolean> {
    try {
      const response = await fetch('/api/conf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: String(value) })
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      // 更新本地配置
      if (key === 'human_as_model' || key === 'skip_build_index') {
        this.config = { 
          ...this.config, 
          [key]: Boolean(value)
        };
      } else if (key === 'project_type') {
        this.config = { 
          ...this.config, 
          project_type: String(value) 
        };
      } else {
        // 更新 extra_conf 中的配置
        this.config = {
          ...this.config,
          extra_conf: {
            ...this.config.extra_conf,
            [key]: String(value)
          }
        };
      }

      // 通知订阅者配置已更新
      this.emit('configUpdated', this.config);
      return true;
    } catch (error) {
      console.error('Error updating config:', error);
      this.emit('error', `Failed to update configuration key: ${key}`);
      return false;
    }
  }

  // 重新加载全部配置
  public async reloadConfig(): Promise<void> {
    await this.fetchConfig();
    await this.fetchConfigKeys();
  }
}

// 导出单例实例
export const autoCoderConfService = new AutoCoderConfService(); 