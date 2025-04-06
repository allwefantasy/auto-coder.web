import React, { useState, useEffect } from 'react';
import { Select, message, Divider, Tabs } from 'antd';
import { getMessage, setLanguage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import ModelConfig from './ModelConfig';
import ModelManagement from './ModelManagement';
import ProviderManagement from './ProviderManagement';
import CompilerConfig from './CompilerConfig';
import RagConfig from './RagConfig';
import BasicSettings from './BasicSettings';
import AdvancedSettings from './AdvancedSettings';
import McpServerConfig from './McpServerConfig/McpServerConfig'; // Import the new component
import MemorySystem from './MemorySystem';
import './ModelConfig.css';

const { TabPane } = Tabs;

const SettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<{
    available_keys: AutoCoderArgs[];
    language: string;
  }>({
    available_keys: [],
    language: 'zh'
  });
  
  const [loading, setLoading] = useState(false);

  // Fetch language setting
  useEffect(() => {
    const fetchLanguage = async () => {
      try {
        const response = await fetch('/api/settings/language');
        if (!response.ok) {
          throw new Error('Failed to fetch language settings');
        }
        const data = await response.json();
        setConfig(prev => ({ ...prev, language: data.language || 'zh' }));
      } catch (error) {
        console.error('Error fetching language settings:', error);
      }
    };
    fetchLanguage();
  }, []);

  // Fetch available configuration keys
  useEffect(() => {
    setLoading(true);
    fetch('/api/conf/keys')
      .then(response => response.json())
      .then(data => {
        setConfig(prev => ({
          ...prev,
          available_keys: data.keys
        }));
      })
      .catch(error => {
        console.error('Error fetching configuration keys:', error);
        message.error('Failed to fetch configuration keys');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const updateConfig = async (key: string, value: string | boolean) => {
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

      message.success(getMessage('settingsUpdateSuccess'));
    } catch (error) {
      console.error('Error updating config:', error);
      message.error(getMessage('settingsUpdateError'));
    }
  };

  const updateLanguage = async (value: string) => {
    try {
      const response = await fetch('/api/settings/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update language settings');
      }
      
      setConfig(prev => ({ ...prev, language: value }));
      setLanguage(value as 'en' | 'zh');
      message.success(getMessage('settingsUpdateSuccess'));
    } catch (error) {
      console.error('Error updating language settings:', error);
      message.error('Failed to update language settings');
    }
  };

  return (
    <div className="settings-container p-2 overflow-y-auto h-full bg-gray-900">
      <div className="settings-section pb-2">
        <h3 className="settings-title text-white">{getMessage('languageSettings') || 'Language'}</h3>
        <div className="language-selector">
          <label className="language-label text-gray-300">Language / 语言</label>
          <Select
            value={config.language}
            onChange={updateLanguage}
            className="custom-select dark-select"
            popupClassName="custom-select-dropdown"
            options={[
              { value: 'en', label: 'English' },
              { value: 'zh', label: '中文' }
            ]}
          />
        </div>
      </div>
      
      <Divider className="border-gray-700 my-2" />
      
      <Tabs defaultActiveKey="general" className="settings-tabs">
        <TabPane tab={<span className="text-gray-300">{getMessage('modelConfiguration')}</span>} key="general">
          <ModelConfig 
            availableKeys={config.available_keys} 
            onModelChange={updateConfig}
          />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('modelManagement')}</span>} key="models">
          <ModelManagement />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('providerManagement')}</span>} key="providers">
          <ProviderManagement />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('compilerConfiguration') || 'Compiler Configuration'}</span>} key="compilers">
          <CompilerConfig />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('ragConfiguration') || 'RAG Configuration'}</span>} key="rags">
          <RagConfig />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('basicSettings')}</span>} key="basic">
          <BasicSettings 
            availableKeys={config.available_keys} 
            onSettingChange={updateConfig}
          />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('advancedSettings')}</span>} key="advanced">
          <AdvancedSettings 
            availableKeys={config.available_keys} 
            onSettingChange={updateConfig}
          />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('mcpServerConfiguration') || 'MCP Servers'}</span>} key="mcp">
          <McpServerConfig />
        </TabPane>
        <TabPane tab={<span className="text-gray-300">{getMessage('memorySystemTasks') || 'Memory System'}</span>} key="memory">
          <MemorySystem />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
