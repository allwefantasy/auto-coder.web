import React, { useState, useEffect } from 'react';
import { Select, message, Skeleton, Button, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';
import '../../styles/custom_antd.css';
import './ModelConfig.css';

interface ModelConfigProps {
  availableKeys: AutoCoderArgs[];
  onModelChange: (key: string, value: string) => void;
}

interface Model {
  name: string;
  model_name: string;
  model_type: string;
}

const ModelConfig: React.FC<ModelConfigProps> = ({ availableKeys, onModelChange }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Record<string, string | string[]>>({
    model: '',
    code_model: [],
    chat_model: '',
    generate_rerank_model: '',
    index_model: '',
    index_filter_model: ''
  });

  // Fetch available models
  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      message.error(getMessage('processingError'));
    } finally {
      setLoading(false);
    }
  };

  // Function to delete a specific configuration key
  const deleteConfigKey = async (key: string) => {
    try {
      const response = await fetch(`/api/conf/${key}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        // Try to parse error message from backend if available
        let errorDetail = 'Failed to delete configuration key';
        try {
          const errorData = await response.json();
          if (errorData && errorData.detail) {
            errorDetail = errorData.detail;
          }
        } catch (parseError) {
          // Ignore if response is not JSON or empty
        }
        throw new Error(errorDetail);
      }
      // Optionally show success message or handle UI update if needed
      // message.success(`Configuration key '${key}' deleted successfully.`);
    } catch (error: any) {
      console.error(`Error deleting configuration key ${key}:`, error);
      message.error(error.message || `Failed to delete ${key}`);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Fetch current configuration
  useEffect(() => {
    const fetchCurrentConfig = async () => {
      setConfigLoading(true);
      try {
        const response = await fetch('/api/conf');
        if (!response.ok) {
          throw new Error('Failed to fetch configuration');
        }
        const data = await response.json();
        const currentConfig = data.conf;
        
        // Update selected models with current configuration
        const updatedModels = { ...selectedModels };
        
        if (currentConfig.model) {
          updatedModels.model = currentConfig.model;
        }
        
        if (currentConfig.code_model) {
          // If code_model is a string, split it by comma to create an array
          updatedModels.code_model = typeof currentConfig.code_model === 'string' 
            ? currentConfig.code_model.split(',') 
            : currentConfig.code_model;
        }
        
        if (currentConfig.chat_model) {
          updatedModels.chat_model = currentConfig.chat_model;
        }
        
        if (currentConfig.generate_rerank_model) {
          updatedModels.generate_rerank_model = currentConfig.generate_rerank_model;
        }
        
        if (currentConfig.index_model) {
          updatedModels.index_model = currentConfig.index_model;
        }
        
        if (currentConfig.index_filter_model) {
          updatedModels.index_filter_model = currentConfig.index_filter_model;
        }
        
        setSelectedModels(updatedModels);
      } catch (error) {
        console.error('Error fetching current configuration:', error);
      } finally {
        setConfigLoading(false);
      }
    };
    
    fetchCurrentConfig();
  }, []);

  // Initialize selected models from available keys as fallback
  useEffect(() => {
    // Only initialize from availableKeys if we don't have a value from config
    const initialModels: Record<string, string> = { ...selectedModels };
    availableKeys.forEach(key => {
      if ((key.key === 'model' || key.key === 'code_model' || 
          key.key === 'chat_model' || key.key === 'generate_rerank_model' ||
          key.key === 'index_model' || key.key === 'index_filter_model') && 
          !initialModels[key.key]) {
        initialModels[key.key] = (key as any).value || '';
      }
    });
    setSelectedModels(initialModels);
  }, [availableKeys]);

  const handleModelChange = (key: string, value: string | string[]) => {
    const isEmpty = Array.isArray(value) ? value.length === 0 : value === '';
    
    setSelectedModels(prev => ({ ...prev, [key]: value }));

    if (isEmpty) {
      // If the value is empty, call the delete endpoint for this specific key
      deleteConfigKey(key);
      // Also notify the parent component about the change (to empty)
      onModelChange(key, Array.isArray(value) ? '' : value); 
    } else {
      // If the value is not empty, format it (e.g., for code_model) and notify the parent
      let formattedValue = value;
      if (key === 'code_model' && Array.isArray(value)) {
        formattedValue = value.join(',');
      }
      onModelChange(key, formattedValue as string);
    }
  };

  const selectProps = {
    loading: loading || configLoading,
    className: "custom-select",
    popupClassName: "custom-select-dropdown",
    showSearch: true,
    filterOption: (input: string, option?: { label: string, value: string }) => 
      option?.label.toLowerCase().includes(input.toLowerCase()) || false,
    style: { 
      width: '100%'
    }
  };

  if (loading || configLoading) {
    return (
      <div className="space-y-2">
        <Skeleton.Input active block style={{ height: 32, backgroundColor: '#1e293b' }} />
        <Skeleton.Input active block style={{ height: 32, backgroundColor: '#1e293b' }} />
        <Skeleton.Input active block style={{ height: 32, backgroundColor: '#1e293b' }} />
        <Skeleton.Input active block style={{ height: 32, backgroundColor: '#1e293b' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="settings-title">{getMessage('modelConfiguration')}</h3>
        <Button 
          type="text" 
          icon={<ReloadOutlined />} 
          onClick={() => {
            fetchModels();            
          }}
          loading={loading}
          className="text-gray-400 hover:text-white"
        />
      </div>
      
      <div className="space-y-3">
        <div className="model-config-item">
          <label className="model-config-label">{getMessage('defaultModel')}</label>
          <Select
            {...selectProps}
            allowClear // Add allowClear prop
            value={selectedModels.model || undefined} // Handle empty string for placeholder/clear
            onChange={(value) => handleModelChange('model', value || '')} // Ensure empty string on clear
            options={models.map(model => ({
              value: model.name,              
              label: model.name
            }))}
          />
          <p className="model-config-description">{getMessage('defaultModelDescription')}</p>
        </div>

        {/* Code Model Selector is now moved to the Sidebar (CodeModelSelector.tsx) */}
        {/* Remove the section below if it's fully handled by the sidebar component */}
        {/* 
        <div className="model-config-item">
          <label className="model-config-label">{getMessage('codeModel')}</label>
          <Select
            {...selectProps}
            allowClear 
            mode="multiple"
            value={selectedModels.code_model as string[] || []} 
            onChange={(value) => handleModelChange('code_model', value || [])} 
            options={models.map(model => ({
              value: model.name,              
              label: model.name
            }))}
            tagRender={(props) => {
              const { label, value, closable, onClose } = props;
              return (
                <Tag 
                  color="blue" 
                  closable={closable} 
                  onClose={onClose} 
                  style={{ marginRight: 3 }}
                >
                  {label}
                </Tag>
              );
            }}
          />
          <p className="model-config-description">{getMessage('codeModelDescription')}</p>
        </div> 
        */}

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('chatModel')}</label>
          <Select
            {...selectProps}
            allowClear // Add allowClear prop
            value={selectedModels.chat_model || undefined} // Handle empty string for placeholder/clear
            onChange={(value) => handleModelChange('chat_model', value || '')} // Ensure empty string on clear
            options={models.map(model => ({
              value: model.name,              
              label: model.name
            }))}
          />
          <p className="model-config-description">{getMessage('chatModelDescription')}</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('rerankModel')}</label>
          <Select
            {...selectProps}
            allowClear // Add allowClear prop
            value={selectedModels.generate_rerank_model || undefined} // Handle empty string for placeholder/clear
            onChange={(value) => handleModelChange('generate_rerank_model', value || '')} // Ensure empty string on clear
            options={models.map(model => ({
              value: model.name,              
              label: model.name
            }))}
          />
          <p className="model-config-description">{getMessage('rerankModelDescription')}</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('indexModel')}</label>
          <Select
            {...selectProps}
            allowClear // Add allowClear prop
            value={selectedModels.index_model || undefined} // Handle empty string for placeholder/clear
            onChange={(value) => handleModelChange('index_model', value || '')} // Ensure empty string on clear
            options={models.map(model => ({
              value: model.name,              
              label: model.name
            }))}
          />
          <p className="model-config-description">{getMessage('indexModelDescription')}</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">{getMessage('indexFilterModel')}</label>
          <Select
            {...selectProps}
            allowClear // Add allowClear prop
            value={selectedModels.index_filter_model || undefined} // Handle empty string for placeholder/clear
            onChange={(value) => handleModelChange('index_filter_model', value || '')} // Ensure empty string on clear
            options={models.map(model => ({
              value: model.name,              
              label: model.name
            }))}
          />
          <p className="model-config-description">{getMessage('indexFilterModelDescription')}</p>
        </div>
      </div>
    </div>
  );
};

export default ModelConfig;