import React, { useState, useEffect } from 'react';
import { Select, message } from 'antd';
import { getMessage } from '../Sidebar/lang';

interface ModelConfigProps {
  modelType: string;
  currentValue: string;
  onChange: (value: string) => void;
}

interface Model {
  name: string;
  model_name: string;
  model_type: string;
}

const ModelConfig: React.FC<ModelConfigProps> = ({ modelType, currentValue, onChange }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const response = await fetch('/models');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        setModels(data);
      } catch (error) {
        console.error(`Error fetching ${modelType} models:`, error);
        message.error(getMessage('modelFetchError'));
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [modelType]);

  const filteredModels = models.filter(model => 
    model.model_type === modelType || 
    (modelType === 'generate_rerank' && model.model_type === 'generate_rerank_model')
  );

  return (
    <div className="mb-4">
      <label className="block text-gray-300 mb-2">
        {getMessage(`${modelType}ModelLabel`)}
      </label>
      <Select
        loading={loading}
        value={currentValue}
        onChange={onChange}
        className="w-full"
        placeholder={getMessage(`${modelType}ModelPlaceholder`)}
      >
        {filteredModels.map(model => (
          <Select.Option key={model.name} value={model.name}>
            {model.name} ({model.model_name})
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};

export default ModelConfig;