import React, { useState, useEffect } from 'react';
import { InputNumber, Select, message } from 'antd';
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import './ModelConfig.css';

interface BasicSettingsProps {
  availableKeys: AutoCoderArgs[];
  onSettingChange: (key: string, value: string | number) => void;
}

interface BasicSettingsState {
  index_filter_model_max_input_length: number;
  auto_merge: string;
}

const BasicSettings: React.FC<BasicSettingsProps> = ({ availableKeys, onSettingChange }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BasicSettingsState>({
    index_filter_model_max_input_length: 51200,
    auto_merge: 'editblock'
  });

  // Fetch current configuration
  useEffect(() => {
    const fetchCurrentConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/conf');
        if (!response.ok) {
          throw new Error('Failed to fetch configuration');
        }
        const data = await response.json();
        const currentConfig = data.conf;
        
        // Update settings with current configuration
        const updatedSettings = { ...settings };
        
        if (currentConfig.index_filter_model_max_input_length !== undefined) {
          updatedSettings.index_filter_model_max_input_length = Number(currentConfig.index_filter_model_max_input_length);
        }
        if (currentConfig.auto_merge !== undefined) {
          updatedSettings.auto_merge = currentConfig.auto_merge;
        }
                
        setSettings(updatedSettings);
      } catch (error) {
        console.error('Error fetching current configuration:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentConfig();
  }, []);

  // Initialize settings from availableKeys as fallback
  useEffect(() => {
    const initialSettings = { ...settings };

    availableKeys.forEach(key => {
      if (key.key === 'index_filter_model_max_input_length' && initialSettings.index_filter_model_max_input_length === undefined) {
        initialSettings.index_filter_model_max_input_length = Number(key.default) || 51200;
      }
      if (key.key === 'auto_merge' && initialSettings.auto_merge === undefined) {
        initialSettings.auto_merge = key.default || 'editblock';
      }
    });

    setSettings(initialSettings);
  }, [availableKeys]);

  const handleSettingChange = (key: keyof BasicSettingsState, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onSettingChange(key, value);
  };

  if (loading) {
    return (
      <div className="p-4 text-white">
        {getMessage('loading')}
      </div>
    );
  }

  return (
    <div>
      <h3 className="settings-title">{getMessage('basicSettings')}</h3>
      
      <div className="space-y-4">
        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('indexMaxInputLength')}</label>
            <InputNumber
              value={settings.index_filter_model_max_input_length}
              onChange={(value) => handleSettingChange('index_filter_model_max_input_length', value || 51200)}
              className="bg-gray-600 text-white"
              min={1000}
              max={1000000}
            />
          </div>
          <p className="model-config-description">{getMessage('indexMaxInputLengthDescription')}</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('autoMergeMethod')}</label>
            <Select
              value={settings.auto_merge}
              onChange={(value) => handleSettingChange('auto_merge', value)}
              className="bg-gray-600 w-40"
              options={[
                { value: 'wholefile', label: 'Whole File' },
                { value: 'editblock', label: 'Edit Block' },
                { value: 'diff', label: 'Diff' },
                { value: 'strict_diff', label: 'Strict Diff' }
              ]}
            />
          </div>
          <p className="model-config-description">{getMessage('autoMergeMethodDescription')}</p>
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;
import React, { useState, useEffect } from 'react';
import { InputNumber, Select, message } from 'antd';
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import './ModelConfig.css';

interface BasicSettingsProps {
  availableKeys: AutoCoderArgs[];
  onSettingChange: (key: string, value: string | number | boolean) => void;
}

interface BasicSettingsState {
  index_filter_model_max_input_length: number;
  auto_merge: string;
}

const BasicSettings: React.FC<BasicSettingsProps> = ({ availableKeys, onSettingChange }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BasicSettingsState>({
    index_filter_model_max_input_length: 51200,
    auto_merge: 'editblock'
  });

  // Fetch current configuration
  useEffect(() => {
    const fetchCurrentConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/conf');
        if (!response.ok) {
          throw new Error('Failed to fetch configuration');
        }
        const data = await response.json();
        const currentConfig = data.conf;
        
        // Update settings with current configuration
        const updatedSettings = { ...settings };
        
        if (currentConfig.index_filter_model_max_input_length !== undefined) {
          updatedSettings.index_filter_model_max_input_length = Number(currentConfig.index_filter_model_max_input_length);
        }
        if (currentConfig.auto_merge !== undefined) {
          updatedSettings.auto_merge = currentConfig.auto_merge;
        }
                
        setSettings(updatedSettings);
      } catch (error) {
        console.error('Error fetching current configuration:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentConfig();
  }, []);

  // Initialize settings from availableKeys as fallback
  useEffect(() => {
    const initialSettings = { ...settings };

    availableKeys.forEach(key => {
      if (key.key === 'index_filter_model_max_input_length' && initialSettings.index_filter_model_max_input_length === undefined) {
        initialSettings.index_filter_model_max_input_length = key.default ? Number(key.default) : 51200;
      }
      if (key.key === 'auto_merge' && initialSettings.auto_merge === undefined) {
        initialSettings.auto_merge = key.default || 'editblock';
      }
    });

    setSettings(initialSettings);
  }, [availableKeys]);

  const handleSettingChange = (key: keyof BasicSettingsState, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onSettingChange(key, value);
  };

  if (loading) {
    return (
      <div className="p-4 text-white">
        {getMessage('loading')}
      </div>
    );
  }

  return (
    <div>
      <h3 className="settings-title">{getMessage('basicSettings')}</h3>
      
      <div className="space-y-4">
        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">索引最大输入长度</label>
            <InputNumber
              value={settings.index_filter_model_max_input_length}
              onChange={(value) => handleSettingChange('index_filter_model_max_input_length', value || 51200)}
              min={1000}
              max={100000}
              className="w-32"
            />
          </div>
          <p className="model-config-description">当索引内容超过该长度时，系统会自动拆分处理</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">合并格式和方式</label>
            <Select
              value={settings.auto_merge}
              onChange={(value) => handleSettingChange('auto_merge', value)}
              className="w-48"
              options={[
                { value: 'wholefile', label: 'Whole File' },
                { value: 'editblock', label: 'Edit Block' },
                { value: 'diff', label: 'Diff' },
                { value: 'strict_diff', label: 'Strict Diff' }
              ]}
            />
          </div>
          <p className="model-config-description">选择代码合并的方式和格式</p>
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;