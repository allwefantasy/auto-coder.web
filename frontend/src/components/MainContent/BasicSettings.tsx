import React, { useState, useEffect } from 'react';
import { InputNumber, Select, message } from 'antd';
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import './ModelConfig.css';
import '../../styles/custom_antd.css';
import './BasicSettings.css';

interface BasicSettingsProps {
  availableKeys: AutoCoderArgs[];
  onSettingChange: (key: string, value: string | number) => void;
}

interface BasicSettingsState {
  index_filter_model_max_input_length: number;
  auto_merge: string;
  generate_times_same_model: number;
  rank_times_same_model: number;
}

const BasicSettings: React.FC<BasicSettingsProps> = ({ availableKeys, onSettingChange }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BasicSettingsState>({
    index_filter_model_max_input_length: 51200,
    auto_merge: 'editblock',
    generate_times_same_model: 1,
    rank_times_same_model: 1,
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
        if (currentConfig.generate_times_same_model !== undefined) {
          updatedSettings.generate_times_same_model = Number(currentConfig.generate_times_same_model);
        }
        if (currentConfig.rank_times_same_model !== undefined) {
          updatedSettings.rank_times_same_model = Number(currentConfig.rank_times_same_model);
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
      if (key.key === 'generate_times_same_model' && initialSettings.generate_times_same_model === undefined) {
        initialSettings.generate_times_same_model = Number(key.default) || 1;
      }
      if (key.key === 'rank_times_same_model' && initialSettings.rank_times_same_model === undefined) {
        initialSettings.rank_times_same_model = Number(key.default) || 1;
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
    <div className="p-2 text-white">
      <div className="space-y-2">
        <div className="model-config-item">
          <label className="model-config-label">{getMessage('indexMaxInputLength')}</label>
          <div className="mt-1">
            <InputNumber
              value={settings.index_filter_model_max_input_length}
              onChange={(value) => handleSettingChange('index_filter_model_max_input_length', value || 51200)}
              min={1000}
              max={1000000}
              size="small"
            />
          </div>
          <p className="model-config-description">{getMessage('indexMaxInputLengthDescription')}</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('autoMergeMethod')}</label>
          <div className="mt-1">
            <Select
              value={settings.auto_merge}
              onChange={(value) => handleSettingChange('auto_merge', value)}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: 'wholefile', label: getMessage('wholeFile') },
                { value: 'editblock', label: getMessage('editBlock') },
                { value: 'diff', label: getMessage('diff') },
                { value: 'strict_diff', label: getMessage('strictDiff') }
              ]}
            />
          </div>
          <p className="model-config-description">{getMessage('autoMergeMethodDescription')}</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('generateTimesSameModel')}</label>
          <div className="mt-1">
            <InputNumber
              value={settings.generate_times_same_model}
              onChange={(value) => handleSettingChange('generate_times_same_model', value || 1)}
              min={1}
              max={10}
              size="small"
            />
          </div>
          <p className="model-config-description">{getMessage('generateTimesSameModelDescription')}</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('rankTimesSameModel')}</label>
          <div className="mt-1">
            <InputNumber
              value={settings.rank_times_same_model}
              onChange={(value) => handleSettingChange('rank_times_same_model', value || 1)}
              min={1}
              max={10}
              size="small"
            />
          </div>
          <p className="model-config-description">{getMessage('rankTimesSameModelDescription')}</p>
        </div>

      </div>
    </div>
  );
};

export default BasicSettings;