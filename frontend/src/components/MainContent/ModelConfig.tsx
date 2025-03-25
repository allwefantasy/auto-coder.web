import React, { useState, useEffect } from 'react';
import { Select, message } from 'antd';
import { getMessage } from '../Sidebar/lang';
import type { AutoCoderArgs } from './types';

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
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({
    model: '',
    code_model: '',
    chat_model: '',
    generate_rerank_model: ''
  });

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const response = await fetch('/models');
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
    fetchModels();
  }, []);

  useEffect(() => {
    // Initialize selected models from available keys
    const initialModels: Record<string, string> = {};
    availableKeys.forEach(key => {
      if (key.key === 'model' || key.key === 'code_model' || 
          key.key === 'chat_model' || key.key === 'generate_rerank_model') {
        initialModels[key.key] = (key as any).value || '';
      }
    });
    setSelectedModels(initialModels);
  }, [availableKeys]);

  const handleModelChange = (key: string, value: string) => {
    setSelectedModels(prev => ({ ...prev, [key]: value }));
    onModelChange(key, value);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-6">{getMessage('modelName')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-300 mb-2">Default Model</label>
          <Select
            loading={loading}
            value={selectedModels.model}
            onChange={(value) => handleModelChange('model', value)}
            className="custom-select w-full"
            options={models.map(model => ({
              value: model.model_name,
              label: `${model.name} (${model.model_type})`
            }))}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Code Model</label>
          <Select
            loading={loading}
            value={selectedModels.code_model}
            onChange={(value) => handleModelChange('code_model', value)}
            className="custom-select w-full"
            options={models.map(model => ({
              value: model.model_name,
              label: `${model.name} (${model.model_type})`
            }))}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Chat Model</label>
          <Select
            loading={loading}
            value={selectedModels.chat_model}
            onChange={(value) => handleModelChange('chat_model', value)}
            className="custom-select w-full"
            options={models.map(model => ({
              value: model.model_name,
              label: `${model.name} (${model.model_type})`
            }))}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Rerank Model</label>
          <Select
            loading={loading}
            value={selectedModels.generate_rerank_model}
            onChange={(value) => handleModelChange('generate_rerank_model', value)}
            className="w-full"
            options={models.map(model => ({
              value: model.model_name,
              label: `${model.name} (${model.model_type})`
            }))}
          />
        </div>
      </div>
    </div>
  );
};

export default ModelConfig;