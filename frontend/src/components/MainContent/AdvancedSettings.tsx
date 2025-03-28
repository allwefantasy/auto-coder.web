import React, { useState, useEffect } from 'react';
import { Switch, message } from 'antd';
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import { autoCoderConfService } from '../../services/AutoCoderConfService';
import './ModelConfig.css';

interface AdvancedSettingsProps {
  availableKeys: AutoCoderArgs[];
  onSettingChange: (key: string, value: boolean | string) => void;
}

interface AdvancedSettingsState {
  enable_auto_fix_lint: boolean;
  enable_active_context: boolean;
  enable_task_history: boolean;
  include_project_structure: boolean;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ availableKeys, onSettingChange }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AdvancedSettingsState>({
    enable_auto_fix_lint: false,
    enable_active_context: false,
    enable_task_history: false,
    include_project_structure: true
  });

  // Subscribe to config changes
  useEffect(() => {
    const handleConfigUpdate = (config: any) => {
      const updatedSettings = { ...settings };
      
      if (config.extra_conf?.enable_auto_fix_lint !== undefined) {
        updatedSettings.enable_auto_fix_lint = config.extra_conf.enable_auto_fix_lint === "true";
      }
      
      if (config.extra_conf?.enable_active_context !== undefined) {
        updatedSettings.enable_active_context = config.extra_conf.enable_active_context === "true";
      }
      
      if (config.extra_conf?.enable_task_history !== undefined) {
        updatedSettings.enable_task_history = config.extra_conf.enable_task_history === "true";
      }
      
      if (config.extra_conf?.include_project_structure !== undefined) {
        updatedSettings.include_project_structure = config.extra_conf.include_project_structure === "true";
      }
      
      setSettings(updatedSettings);
      setLoading(false);
    };

    // Subscribe to config changes
    autoCoderConfService.on('configUpdated', handleConfigUpdate);

    // Initial load
    setLoading(true);
    const config = autoCoderConfService.getConfig();
    handleConfigUpdate(config);

    // Cleanup
    return () => {
      autoCoderConfService.off('configUpdated', handleConfigUpdate);
    };
  }, []);

  // Initialize settings from availableKeys as fallback
  useEffect(() => {
    const initialSettings = { ...settings };

    availableKeys.forEach(key => {
      if (key.key === 'enable_auto_fix_lint' && initialSettings.enable_auto_fix_lint === undefined) {
        initialSettings.enable_auto_fix_lint = key.default === "true";
      }
      if (key.key === 'enable_active_context' && initialSettings.enable_active_context === undefined) {
        initialSettings.enable_active_context = key.default === "true";
      }
      if (key.key === 'enable_task_history' && initialSettings.enable_task_history === undefined) {
        initialSettings.enable_task_history = key.default === "true";
      }
      if (key.key === 'include_project_structure' && initialSettings.include_project_structure === undefined) {
        initialSettings.include_project_structure = key.default === "true" || key.default === undefined;
      }
    });

    setSettings(initialSettings);
  }, [availableKeys]);

  const handleSettingChange = async (key: keyof AdvancedSettingsState, value: boolean) => {
    // Update local state
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Update config using service
    const success = await autoCoderConfService.updateConfig(key, value);
    if (!success) {
      // Restore previous setting if update fails
      setSettings(prev => ({ ...prev, [key]: !value }));
      message.error(getMessage('settingsUpdateError'));
    }
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