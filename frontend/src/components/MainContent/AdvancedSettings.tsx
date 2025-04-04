import React, { useState, useEffect } from 'react';
import { Switch, message } from 'antd';
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import './ModelConfig.css';

interface AdvancedSettingsProps {
  availableKeys: AutoCoderArgs[];
  onSettingChange: (key: string, value: boolean | string) => void;
}

interface AdvancedSettingsState {
  enable_auto_fix_merge: boolean;
  enable_auto_fix_lint: boolean;
  enable_auto_fix_compile: boolean;
  enable_active_context: boolean;
  enable_active_context_in_generate: boolean;
  enable_task_history: boolean;
  include_project_structure: boolean;    
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ availableKeys, onSettingChange }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AdvancedSettingsState>({
    enable_auto_fix_merge: false,
    enable_auto_fix_lint: false,
    enable_auto_fix_compile: false,
    enable_active_context: false,
    enable_active_context_in_generate: false,
    enable_task_history: false,
    include_project_structure: true,
    skip_filter_index: false,    
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
        
        if (currentConfig.enable_auto_fix_merge !== undefined) {
          updatedSettings.enable_auto_fix_merge = currentConfig.enable_auto_fix_merge === "true";
        }
        if (currentConfig.enable_auto_fix_lint !== undefined) {
          updatedSettings.enable_auto_fix_lint = currentConfig.enable_auto_fix_lint === "true";
        }
        if (currentConfig.enable_auto_fix_compile !== undefined) {
          updatedSettings.enable_auto_fix_compile = currentConfig.enable_auto_fix_compile === "true";
        }
        if (currentConfig.enable_active_context !== undefined) {
          updatedSettings.enable_active_context = currentConfig.enable_active_context === "true";
        }
        if (currentConfig.enable_active_context_in_generate !== undefined) {
          updatedSettings.enable_active_context_in_generate = currentConfig.enable_active_context_in_generate === "true";
        }
        if (currentConfig.enable_task_history !== undefined) {
          updatedSettings.enable_task_history = currentConfig.enable_task_history === "true";
        }
        if (currentConfig.include_project_structure !== undefined) {
          updatedSettings.include_project_structure = currentConfig.include_project_structure === "true";
        }
        if (currentConfig.skip_filter_index !== undefined) {
          updatedSettings.skip_filter_index = currentConfig.skip_filter_index === "true";
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
      if (key.key === 'enable_auto_fix_merge' && initialSettings.enable_auto_fix_merge === undefined) {
        initialSettings.enable_auto_fix_merge = key.default === "true";
      }
      if (key.key === 'enable_auto_fix_lint' && initialSettings.enable_auto_fix_lint === undefined) {
        initialSettings.enable_auto_fix_lint = key.default === "true";
      }
      if (key.key === 'enable_auto_fix_compile' && initialSettings.enable_auto_fix_compile === undefined) {
        initialSettings.enable_auto_fix_compile = key.default === "true";
      }
      if (key.key === 'enable_active_context' && initialSettings.enable_active_context === undefined) {
        initialSettings.enable_active_context = key.default === "true";
      }
      if (key.key === 'enable_active_context_in_generate' && initialSettings.enable_active_context_in_generate === undefined) {
        initialSettings.enable_active_context_in_generate = key.default === "true";
      }
      if (key.key === 'enable_task_history' && initialSettings.enable_task_history === undefined) {
        initialSettings.enable_task_history = key.default === "true";
      }
      if (key.key === 'include_project_structure' && initialSettings.include_project_structure === undefined) {
        initialSettings.include_project_structure = key.default === "true" || key.default === undefined;
      }
      if (key.key === 'skip_filter_index' && initialSettings.skip_filter_index === undefined) {
        initialSettings.skip_filter_index = key.default === "true";
      }      
    });

    setSettings(initialSettings);
  }, [availableKeys]);

  const handleSettingChange = (key: keyof AdvancedSettingsState, value: boolean) => {
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
      <h3 className="settings-title">{getMessage('advancedSettings')}</h3>
      
      <div className="space-y-4">
        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('advancedSettings_enableAutoFixMerge')}</label>
            <Switch
              checked={settings.enable_auto_fix_merge}
              onChange={(checked) => handleSettingChange('enable_auto_fix_merge', checked)}
              className="bg-gray-600"
            />
          </div>
          <p className="model-config-description">{getMessage('advancedSettings_enableAutoFixMergeDescription')}</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('enableAutoFixLint')}</label>
            <Switch
              checked={settings.enable_auto_fix_lint}
              onChange={(checked) => handleSettingChange('enable_auto_fix_lint', checked)}
              className="bg-gray-600"
            />
          </div>
          <p className="model-config-description">{getMessage('enableAutoFixLintDescription')}</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('enableAutoFixCompile')}</label>
            <Switch
              checked={settings.enable_auto_fix_compile}
              onChange={(checked) => handleSettingChange('enable_auto_fix_compile', checked)}
              className="bg-gray-600"
            />
          </div>
          <p className="model-config-description">{getMessage('enableAutoFixCompileDescription')}</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('enableActiveContext')}</label>
            <Switch
              checked={settings.enable_active_context}
              onChange={(checked) => handleSettingChange('enable_active_context', checked)}
              className="bg-gray-600"
            />
          </div>
          <p className="model-config-description">{getMessage('enableActiveContextDescription')}</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('enableActiveContextInGenerate')}</label>
            <Switch
              checked={settings.enable_active_context_in_generate}
              onChange={(checked) => handleSettingChange('enable_active_context_in_generate', checked)}
              className="bg-gray-600"
            />
          </div>
          <p className="model-config-description">{getMessage('enableActiveContextInGenerateDescription')}</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('enableTaskHistory')}</label>
            <Switch
              checked={settings.enable_task_history}
              onChange={(checked) => handleSettingChange('enable_task_history', checked)}
              className="bg-gray-600"
            />
          </div>
          <p className="model-config-description">{getMessage('enableTaskHistoryDescription')}</p>
        </div>

        <div className="model-config-item">
          <div className="flex justify-between items-center">
            <label className="model-config-label">{getMessage('includeProjectStructure')}</label>
            <Switch
              checked={settings.include_project_structure}
              onChange={(checked) => handleSettingChange('include_project_structure', checked)}
              className="bg-gray-600"
            />
          </div>
          <p className="model-config-description">{getMessage('includeProjectStructureDescription')}</p>
        </div>


      </div>
    </div>
  );
};

export default AdvancedSettings; 