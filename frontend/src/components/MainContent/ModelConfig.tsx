import React, { useState, useEffect } from 'react';
import { Select, message, Skeleton, Button } from 'antd';
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
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({
    model: '',
    code_model: '',
    chat_model: '',
    generate_rerank_model: ''
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
          updatedModels.code_model = currentConfig.code_model;
        }
        
        if (currentConfig.chat_model) {
          updatedModels.chat_model = currentConfig.chat_model;
        }
        
        if (currentConfig.generate_rerank_model) {
          updatedModels.generate_rerank_model = currentConfig.generate_rerank_model;
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
          key.key === 'chat_model' || key.key === 'generate_rerank_model') && 
          !initialModels[key.key]) {
        initialModels[key.key] = (key as any).value || '';
      }
    });
    setSelectedModels(initialModels);
  }, [availableKeys]);

  const handleModelChange = (key: string, value: string) => {
    setSelectedModels(prev => ({ ...prev, [key]: value }));
    onModelChange(key, value);
  };

  const selectProps = {
    loading: loading || configLoading,
    className: "custom-select",
    popupClassName: "custom-select-dropdown",
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
        <h3 className="settings-title">{getMessage('modelName') || '模型配置'}</h3>
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
          <label className="model-config-label">Default Model</label>
          <Select
            {...selectProps}
            value={selectedModels.model}
            onChange={(value) => handleModelChange('model', value)}
            options={models.map(model => ({
              value: model.name,
              label: model.name
            }))}
          />
          <p className="model-config-description">Used for general purpose tasks</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">Code Model</label>
          <Select
            {...selectProps}
            value={selectedModels.code_model}
            onChange={(value) => handleModelChange('code_model', value)}
            options={models.map(model => ({
              value: model.name,
              label: model.name
            }))}
          />
          <p className="model-config-description">Used for code generation and analysis</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">Chat Model</label>
          <Select
            {...selectProps}
            value={selectedModels.chat_model}
            onChange={(value) => handleModelChange('chat_model', value)}
            options={models.map(model => ({
              value: model.name,
              label: model.name
            }))}
          />
          <p className="model-config-description">Used for conversational responses</p>
        </div>

        <div className="model-config-item">
          <label className="model-config-label">Rerank Model</label>
          <Select
            {...selectProps}
            value={selectedModels.generate_rerank_model}
            onChange={(value) => handleModelChange('generate_rerank_model', value)}
            options={models.map(model => ({
              value: model.name,
              label: model.name
            }))}
          />
          <p className="model-config-description">Used for reranking generated content</p>
        </div>
      </div>
    </div>
  );
};

export default ModelConfig;