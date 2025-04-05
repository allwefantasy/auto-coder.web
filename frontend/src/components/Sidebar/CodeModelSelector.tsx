import React, { useState, useEffect, useCallback } from 'react';
import { Select, message, Tag, Tooltip } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import { getMessage } from './lang';
import '../../styles/custom_antd.css';
import './ragSelectorStyles.css';
import eventBus, { EVENTS } from '../../services/eventBus';

interface Model {
  name: string;
  model_name: string;
  model_type: string;
}

const CodeModelSelector: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedCodeModels, setSelectedCodeModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // State for update operation

  // Fetch available models
  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setAvailableModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      message.error(getMessage('processingError') || 'Error fetching models'); // Provide fallback message
    } finally {
      setLoadingModels(false);
    }
  };

  // Fetch current configuration for code_model
  const fetchCurrentConfig = async () => {
    setLoadingConfig(true);
    try {
      const response = await fetch('/api/conf');
      if (!response.ok) {
        // Don't throw error on initial load if conf doesn't exist or fails, just log.
        console.warn('Failed to fetch initial configuration, proceeding with defaults.');
        setSelectedCodeModels([]); // Default to empty array
        return; // Exit function early
      }
      const data = await response.json();
      const currentConfig = data.conf;

      if (currentConfig && currentConfig.code_model) {
          const models = typeof currentConfig.code_model === 'string'
              ? currentConfig.code_model.split(',').map(m => m.trim()).filter(m => m) // Handle empty strings after split
              : Array.isArray(currentConfig.code_model) ? currentConfig.code_model : []; // Ensure it's an array
          setSelectedCodeModels(models);
      } else {
          setSelectedCodeModels([]); // Ensure it's an empty array if not set or config is missing
      }
    } catch (error) {
      console.error('Error fetching current configuration:', error);
      // Don't show error message on initial load failure, maybe just log
      setSelectedCodeModels([]); // Default to empty on error as well
    } finally {
      setLoadingConfig(false);
    }
  };


  // Update or delete the configuration key
  const updateOrDeleteConfig = async (key: string, value: string[]) => {
    setIsUpdating(true);
    const isEmpty = value.length === 0;
    const url = `/api/conf${isEmpty ? `/${key}` : ''}`; // Use DELETE path if empty
    const method = isEmpty ? 'DELETE' : 'POST';
    const body = isEmpty ? undefined : JSON.stringify({ [key]: value.join(',') });
    const headers = isEmpty ? {} : { 'Content-Type': 'application/json' };

    try {
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        let errorDetail = `Failed to ${isEmpty ? 'delete' : 'update'} configuration key`;
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
       // Publish event on successful update/delete
       eventBus.publish(EVENTS.CONFIG.CODE_MODEL_UPDATED, value);
       // Optionally show success message
       // message.success(`Configuration '${key}' ${isEmpty ? 'cleared' : 'updated'} successfully.`);
    } catch (error: any) {
      console.error(`Error ${isEmpty ? 'deleting' : 'updating'} configuration key ${key}:`, error);
      message.error(error.message || `Failed to update ${key}`);
      // Refetch to show the actual current state after failure to revert UI optimisic update
      fetchCurrentConfig();
    } finally {
      setIsUpdating(false);
    }
  };


  useEffect(() => {
    fetchModels();
    fetchCurrentConfig();
  }, []);

  // Subscribe to code model updates from event bus
  useEffect(() => {
    const handleCodeModelUpdate = (updatedModels: string[]) => {
      // Ensure it's an array before comparing/setting
      const modelsArray = Array.isArray(updatedModels) ? updatedModels : [];
      setSelectedCodeModels(prev => {
        // Only update if the value is actually different
        if (JSON.stringify(prev) !== JSON.stringify(modelsArray)) {
          console.log("CodeModelSelector received update:", modelsArray);
          return modelsArray;
        }
        return prev; // Return previous state if no change
      });
    };

    const unsubscribe = eventBus.subscribe(EVENTS.CONFIG.CODE_MODEL_UPDATED, handleCodeModelUpdate);

    // Cleanup subscription on component unmount
    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array: subscribe once on mount, unsubscribe on unmount

  const handleModelChange = (value: string[]) => {
    const validValues = Array.isArray(value) ? value : []; // Ensure it's always an array
    // Optimistically update UI
    setSelectedCodeModels(validValues);
    // Trigger API update (which will publish event on success)
    updateOrDeleteConfig('code_model', validValues);
  };


  const isLoading = loadingModels || loadingConfig;

  return (
    <div className="w-full mb-2">
      <Tooltip title={getMessage('codeModelDescription') || "Select models for code generation"}>
        <div className="flex items-center mb-1 cursor-default">
          <CodeOutlined
            className="mr-1 text-gray-400" // Adjust styling as needed
            style={{ fontSize: '12px' }}
          />
          <span className="text-xxs text-gray-400">
            {getMessage('codeModel') || "Code Models"}
          </span>
        </div>
      </Tooltip>
      <Select
        mode="multiple"
        allowClear
        loading={isLoading || isUpdating} // Show loading during fetch and update
        className="custom-select w-full" // Use w-full for full width
        popupClassName="custom-select-dropdown"
        value={selectedCodeModels}
        onChange={handleModelChange}
        options={availableModels.map(model => ({
          value: model.name,
          label: model.name
        }))}
        showSearch
        filterOption={(input: string, option?: { label: string, value: string }) =>
          option?.label.toLowerCase().includes(input.toLowerCase()) || false
        }
        tagRender={(props) => {
          const { label, closable, onClose } = props;
          return (
            <Tag
              color="blue" // Or another suitable color
              closable={closable}
              onClose={onClose}
              style={{ marginRight: 3 }}
              className="text-xs" // Adjust tag text size if needed
            >
              {label}
            </Tag>
          );
        }}
        placeholder={getMessage('selectCodeModelsPlaceholder') || "Select code models..."}
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default CodeModelSelector;