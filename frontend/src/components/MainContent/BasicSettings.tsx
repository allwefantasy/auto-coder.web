import React, { useState, useEffect } from 'react';
import { InputNumber, Select, message, Tooltip } from 'antd'; // Added Tooltip
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import './ModelConfig.css';
import '../../styles/custom_antd.css';
import './BasicSettings.css';

interface BasicSettingsProps {
  availableKeys: AutoCoderArgs[];
  onSettingChange: (key: string, value: string | number | boolean) => void; // Updated type to include boolean
}

interface BasicSettingsState {
  project_type: string; // Added project_type
  index_filter_model_max_input_length: number;
  conversation_prune_safe_zone_tokens: number; // Added conversation_prune_safe_zone_tokens
  auto_merge: string;
  generate_times_same_model: number;
  rank_times_same_model: number;
  enable_agentic_filter: boolean;
  skip_build_index: boolean; // Added skip_build_index
  skip_filter_index: boolean; // Added skip_filter_index
  enable_agentic_edit: boolean; // Added enable_agentic_edit
  context_prune?: boolean;
  context_prune_safe_zone_tokens?: number;
}

const BasicSettings: React.FC<BasicSettingsProps> = ({ availableKeys, onSettingChange }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BasicSettingsState>({
    project_type: '', // Initialize project_type
    index_filter_model_max_input_length: 51200,
    conversation_prune_safe_zone_tokens: 51200, // Initialize conversation_prune_safe_zone_tokens
    auto_merge: 'editblock',
    generate_times_same_model: 1,
    rank_times_same_model: 1,
    enable_agentic_filter: false,
    enable_agentic_edit: false, // Initialize to false
    skip_build_index: false, // Initialize skip_build_index
    skip_filter_index: false, // Initialize skip_filter_index
    context_prune: true, // Initialize context_prune
    context_prune_safe_zone_tokens: 32*1024, // Initialize context_prune_safe_zone_tokens
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

        if (currentConfig.project_type !== undefined) { // Fetch project_type
          updatedSettings.project_type = currentConfig.project_type;
        }
        if (currentConfig.index_filter_model_max_input_length !== undefined) {
          updatedSettings.index_filter_model_max_input_length = Number(currentConfig.index_filter_model_max_input_length);
        }
        if (currentConfig.conversation_prune_safe_zone_tokens !== undefined) {
          updatedSettings.conversation_prune_safe_zone_tokens = Number(currentConfig.conversation_prune_safe_zone_tokens);
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
          updatedSettings.enable_agentic_filter = String(currentConfig.enable_agentic_filter).toLowerCase() === 'true';
        }
        if (currentConfig.enable_agentic_edit !== undefined) {
          updatedSettings.enable_agentic_edit = String(currentConfig.enable_agentic_edit).toLowerCase() === 'true';
        }
        if (currentConfig.skip_build_index !== undefined) { // Fetch skip_build_index
          updatedSettings.skip_build_index = String(currentConfig.skip_build_index).toLowerCase() === 'true';
        }
        if (currentConfig.skip_filter_index !== undefined) { // Fetch skip_filter_index
          updatedSettings.skip_filter_index = String(currentConfig.skip_filter_index).toLowerCase() === 'true';
        }
        if (currentConfig.context_prune !== undefined) {
          updatedSettings.context_prune = String(currentConfig.context_prune).toLowerCase() === 'true';
        }
        if (currentConfig.context_prune_safe_zone_tokens !== undefined) {
          updatedSettings.context_prune_safe_zone_tokens = Number(currentConfig.context_prune_safe_zone_tokens);
        }

        setSettings(updatedSettings);
      } catch (error) {
        console.error('Error fetching current configuration:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed settings from dependency array to avoid loop

  // Initialize settings from availableKeys as fallback
  useEffect(() => {
    const initialSettings = { ...settings };

    availableKeys.forEach(key => {
      if (key.key === 'project_type' && initialSettings.project_type === undefined) { // Fallback for project_type
        initialSettings.project_type = key.default || '';
      }
      if (key.key === 'index_filter_model_max_input_length' && initialSettings.index_filter_model_max_input_length === undefined) {
        initialSettings.index_filter_model_max_input_length = Number(key.default) || 51200;
      }
      if (key.key === 'conversation_prune_safe_zone_tokens' && initialSettings.conversation_prune_safe_zone_tokens === undefined) {
        initialSettings.conversation_prune_safe_zone_tokens = Number(key.default) || 51200;
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
      if (key.key === 'enable_agentic_filter' && initialSettings.enable_agentic_filter === undefined) {
        initialSettings.enable_agentic_filter = String(key.default).toLowerCase() === 'true' || false;
      }
      if (key.key === 'enable_agentic_edit' && initialSettings.enable_agentic_edit === undefined) {
        initialSettings.enable_agentic_edit = String(key.default).toLowerCase() === 'true' || false;
      }
      if (key.key === 'skip_build_index' && initialSettings.skip_build_index === undefined) { // Fallback for skip_build_index
        initialSettings.skip_build_index = String(key.default).toLowerCase() === 'true' || false;
      }
      if (key.key === 'skip_filter_index' && initialSettings.skip_filter_index === undefined) { // Fallback for skip_filter_index
        initialSettings.skip_filter_index = String(key.default).toLowerCase() === 'true' || false;
      }
      if (key.key === 'context_prune' && initialSettings.context_prune === undefined) {
        initialSettings.context_prune = String(key.default).toLowerCase() === 'true' || true;
      }
      if (key.key === 'context_prune_safe_zone_tokens' && initialSettings.context_prune_safe_zone_tokens === undefined) {
        initialSettings.context_prune_safe_zone_tokens = Number(key.default) || 32*1024;
      }
    });

    setSettings(initialSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableKeys]); // Removed settings from dependency array

  const handleSettingChange = (key: keyof BasicSettingsState, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onSettingChange(key, value); // Pass boolean directly
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
        {/* Project Type Setting - Added First */}
        <div className="model-config-item">
          <Tooltip title={getMessage('projectTypeTooltip') || 'Specify file extensions (e.g., .py,.ts) to help the model understand the project context.'}>
            <label className="model-config-label">{getMessage('projectType') || 'Project Type'}</label>
          </Tooltip>
          <div className="mt-1">
            <Select
              mode="tags"
              size="small"
              style={{ width: '100%' }}
              placeholder="e.g. .py,.ts"
              value={settings.project_type ? settings.project_type.split(',') : []}
              onChange={(values) => handleSettingChange('project_type', values.join(','))}
              className="custom-select" // Ensure this class provides appropriate styling
              tokenSeparators={[',']}
              maxTagCount="responsive"
            >
              {/* Options can be added here if needed, but tags mode allows free input */}
            </Select>
          </div>
          <p className="model-config-description">{getMessage('projectTypeDescription')}</p>
        </div>

        {/* Skip Build Index Setting - Added */}
        <div className="model-config-item">
          <Tooltip title={getMessage('enableBuildIndexTooltip') || 'If enabled, the system will automatically build or update the code index.'}>
            <label className="model-config-label">{getMessage('enableBuildIndexToggle') || 'Enable Build Index'}</label>
          </Tooltip>
          <div className="mt-1">
            <Select
              value={!settings.skip_build_index}
              onChange={(value) => handleSettingChange('skip_build_index', !value)}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: true, label: getMessage('enable') },
                { value: false, label: getMessage('disable') },
              ]}
            />
          </div>
          <p className="model-config-description">{getMessage('enableBuildIndexDescription')}</p>
        </div>

        {/* Enable Filter Index Setting */}
        <div className="model-config-item">
          <Tooltip title={getMessage('enableFilterIndexTooltip') || 'If enabled, the system will automatically filter the index when processing queries.'}>
            <label className="model-config-label">{getMessage('enableFilterIndexToggle') || 'Enable Filter Index'}</label>
          </Tooltip>
          <div className="mt-1">
            <Select
              value={!settings.skip_filter_index}
              onChange={(value) => handleSettingChange('skip_filter_index', !value)}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: true, label: getMessage('enable') },
                { value: false, label: getMessage('disable') },
              ]}
            />
          </div>
          <p className="model-config-description">{getMessage('enableFilterIndexDescription')}</p>
        </div>

        {/* Enable Agentic Filter - Moved here */}
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

        {/* Enable Agentic Edit - New */}
        <div className="model-config-item">
          <label className="model-config-label">{getMessage('enableAgenticEdit')}</label>
          <div className="mt-1">
            <Select
              value={settings.enable_agentic_edit}
              onChange={(value) => handleSettingChange('enable_agentic_edit', value)}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: true, label: getMessage('enable') },
                { value: false, label: getMessage('disable') },
              ]}
            />
          </div>
          <p className="model-config-description">{getMessage('enableAgenticEditDescription')}</p>
        </div>

        {/* Context Prune Setting */}
        <div className="model-config-item">
          <Tooltip title={getMessage('contextPruneTooltip')}>
            <label className="model-config-label">{getMessage('contextPrune')}</label>
          </Tooltip>
          <div className="mt-1">
            <Select
              value={settings.context_prune}
              onChange={(value) => handleSettingChange('context_prune', value)}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: true, label: getMessage('enable') },
                { value: false, label: getMessage('disable') },
              ]}
            />
          </div>
          <p className="model-config-description">{getMessage('contextPruneTooltip')}</p>
        </div>

        {/* Context Prune Safe Zone Tokens Setting */}
        <div className="model-config-item">
          <Tooltip title={getMessage('contextPruneSafeZoneTokensTooltip')}>
            <label className="model-config-label">{getMessage('contextPruneSafeZoneTokens')}</label>
          </Tooltip>
          <div className="mt-1">
            <InputNumber
              value={settings.context_prune_safe_zone_tokens}
              onChange={(value) => handleSettingChange('context_prune_safe_zone_tokens', value ?? 8000)}
              min={0}
              size="small"
            />
          </div>
          <p className="model-config-description">{getMessage('contextPruneSafeZoneTokensTooltip')}</p>
        </div>

        {/* Existing Settings */}
        <div className="model-config-item">
          <label className="model-config-label">{getMessage('indexMaxInputLength')}</label>
          <div className="mt-1">
            <InputNumber
              value={settings.index_filter_model_max_input_length}
              onChange={(value) => handleSettingChange('index_filter_model_max_input_length', value ?? 51200)} // Use nullish coalescing
              min={1000}
              max={1000000}
              size="small"
            />
          </div>
          <p className="model-config-description">{getMessage('indexMaxInputLengthDescription')}</p>
        </div>

        {/* Conversation Prune Safe Zone Tokens */}
        <div className="model-config-item">
          <label className="model-config-label">{getMessage('conversationPruneSafeZoneTokens') || 'Conversation Prune Safe Zone Tokens'}</label>
          <div className="mt-1">
            <InputNumber
              value={settings.conversation_prune_safe_zone_tokens}
              onChange={(value) => handleSettingChange('conversation_prune_safe_zone_tokens', value ?? 51200)} // Default to 51200
              min={1000}
              max={1000000}
              size="small"
            />
          </div>
          <p className="model-config-description">{getMessage('conversationPruneSafeZoneTokensDescription') || 'Reserved token count during context pruning to avoid losing important information.'}</p>
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
              onChange={(value) => handleSettingChange('generate_times_same_model', value ?? 1)} // Use nullish coalescing
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
              onChange={(value) => handleSettingChange('rank_times_same_model', value ?? 1)} // Use nullish coalescing
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
