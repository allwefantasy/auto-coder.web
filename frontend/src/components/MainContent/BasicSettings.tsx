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
import { Tooltip } from 'antd';

interface BasicSettingsState {
  project_type: string; // Added project_type
  index_filter_model_max_input_length: number;
  auto_merge: string;
  generate_times_same_model: number;
  rank_times_same_model: number;
  enable_agentic_filter: boolean;
}

const BasicSettings: React.FC<BasicSettingsProps> = ({ availableKeys, onSettingChange }) => {
  const [loading, setLoading] = useState(true); // Start with loading true
  const [settings, setSettings] = useState<BasicSettingsState>({
    project_type: '', // Initialize project_type
    index_filter_model_max_input_length: 51200,
    auto_merge: 'editblock',
    generate_times_same_model: 1,
    rank_times_same_model: 1,
    enable_agentic_filter: false,
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
        const currentConfig = data.conf || {}; // Ensure currentConfig is an object

        // Update settings with current configuration
        const updatedSettings: BasicSettingsState = { ...settings };

        if (currentConfig.project_type !== undefined) {
          updatedSettings.project_type = currentConfig.project_type;
        }
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
        if (currentConfig.enable_agentic_filter !== undefined) {
          // Assuming the backend sends boolean or string "true"/"false"
          updatedSettings.enable_agentic_filter = String(currentConfig.enable_agentic_filter).toLowerCase() === 'true';
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

  // Initialize settings from availableKeys as fallback (only if not fetched)
  useEffect(() => {
    // This effect should ideally run only if the fetch failed or didn't provide values
    // But given the current structure, we check if the state still holds the initial empty/default values
    // Only apply defaults if the fetched config didn't set them.
    if (!loading) { // Only run after fetch attempt is complete
        const updatedSettings = { ...settings };
        let changed = false;

        availableKeys.forEach(key => {
            if (key.key === 'project_type' && updatedSettings.project_type === '') {
                updatedSettings.project_type = key.default || '';
                changed = true;
            }
            if (key.key === 'index_filter_model_max_input_length' && updatedSettings.index_filter_model_max_input_length === 51200) { // Assuming 51200 is the default/initial
                updatedSettings.index_filter_model_max_input_length = Number(key.default) || 51200;
                 changed = true;
            }
            if (key.key === 'auto_merge' && updatedSettings.auto_merge === 'editblock') { // Assuming 'editblock' is the default/initial
                updatedSettings.auto_merge = key.default || 'editblock';
                 changed = true;
            }
            if (key.key === 'generate_times_same_model' && updatedSettings.generate_times_same_model === 1) { // Assuming 1 is the default/initial
                updatedSettings.generate_times_same_model = Number(key.default) || 1;
                 changed = true;
            }
            if (key.key === 'rank_times_same_model' && updatedSettings.rank_times_same_model === 1) { // Assuming 1 is the default/initial
                updatedSettings.rank_times_same_model = Number(key.default) || 1;
                 changed = true;
            }
             if (key.key === 'enable_agentic_filter' && updatedSettings.enable_agentic_filter === false) { // Assuming false is the default/initial
                updatedSettings.enable_agentic_filter = String(key.default).toLowerCase() === 'true' || false;
                 changed = true;
            }
        });

        if (changed) {
           setSettings(updatedSettings);
        }
    }
  }, [availableKeys, loading, settings]); // Add settings to dependency array if needed, be cautious of loops

  const handleSettingChange = (key: keyof BasicSettingsState, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Convert boolean to string for backend compatibility if needed, or handle appropriately
    onSettingChange(key, typeof value === 'boolean' ? String(value) : value);
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
         {/* Project Type Setting */}
         <div className="model-config-item">
           <Tooltip title={getMessage('projectTypeTooltip')}>
             <label className="model-config-label">{getMessage('projectType')}</label>
           </Tooltip>
           <div className="mt-1">
             <Select
               mode="tags"
               size="small"
               style={{ width: '100%' }}
               placeholder="e.g. .py,.ts"
               value={settings.project_type ? settings.project_type.split(',') : []}
               onChange={(values) => handleSettingChange('project_type', values.join(','))}
               className="custom-select"
               tokenSeparators={[',']}
               maxTagCount="responsive"
             />
           </div>
           <p className="model-config-description">{getMessage('projectTypeDescription')}</p> {/* Add description if available */}
         </div>

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

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('enableAgenticFilter')}</label>
          <div className="mt-1">
            <Select
              value={settings.enable_agentic_filter}
              onChange={(value) => handleSettingChange('enable_agentic_filter', value)}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: true, label: getMessage('enable') },
                { value: false, label: getMessage('disable') },
              ]}
            />
          </div>
          <p className="model-config-description">{getMessage('enableAgenticFilterDescription')}</p>
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;