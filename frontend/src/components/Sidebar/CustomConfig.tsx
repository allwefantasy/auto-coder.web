import React, { useState } from 'react';
import { Select, message as AntdMessage } from 'antd';
import { getMessage } from './lang';
import { ConfigState } from './types';

interface CustomConfigProps {
  config: ConfigState;
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
  updateConfig: (key: string, value: boolean | string) => void;
}

const CustomConfig: React.FC<CustomConfigProps> = ({ config, setConfig, updateConfig }) => {
  const [showCustomConfig, setShowCustomConfig] = useState<boolean>(false);

  return (
    <div className="space-y-0 mt-0">
      {/* Heading with Toggle Button */}
      <div className="flex items-center justify-between">
        <span className="text-gray-300 text-[10px] font-medium">{getMessage('customConfig')}</span>
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => setShowCustomConfig(!showCustomConfig)}
            className="text-[10px] text-gray-400 hover:text-gray-300 focus:outline-none"
          >
            {showCustomConfig ? getMessage('collapseConfig') : getMessage('expandConfig')}
          </button>
          {showCustomConfig && (
            <button
              onClick={() => {
                const newExtraConf = { ...config.extra_conf };
                newExtraConf[`custom_key_${Object.keys(config.extra_conf).length}`] = '';
                setConfig((prev: ConfigState): ConfigState => ({
                  ...prev,
                  extra_conf: newExtraConf
                }));
              }}
              className="px-0.5 py-0 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {getMessage('addConfig')}
            </button>
          )}
        </div>
      </div>

      {/* Config Items - Only shown when showCustomConfig is true */}
      {showCustomConfig && (
        <div className="space-y-0">
          {Object.entries(config.extra_conf).map(([key, value], index) => (
            <div key={index} className="flex items-center space-x-0.5">
              <Select
                showSearch
                size="small"
                value={key}
                style={{ width: '40%' }}
                placeholder="Key"
                className="custom-select"
                onChange={(newKey) => {
                  const newExtraConf = { ...config.extra_conf };
                  delete newExtraConf[key];
                  newExtraConf[newKey] = value;
                  setConfig((prev: ConfigState): ConfigState => ({
                    ...prev,
                    extra_conf: newExtraConf
                  }));
                }}
                optionLabelProp="label"
              >
                {config.available_keys.map(configKey => (
                  <Select.Option
                    key={configKey.key}
                    value={configKey.key}
                    label={configKey.key}
                  >
                    <div className="flex justify-between items-center">
                      <span>{configKey.key}</span>
                      <span className="text-gray-400 text-xs">
                        {configKey.type}
                      </span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const newExtraConf = { ...config.extra_conf };
                  newExtraConf[key] = e.target.value;
                  setConfig((prev: ConfigState): ConfigState => ({
                    ...prev,
                    extra_conf: newExtraConf
                  }));
                }}
                onBlur={() => {
                  if (key && config.extra_conf[key] !== '') {
                    updateConfig(key, config.extra_conf[key]);
                  }
                }}
                className="flex-1 bg-gray-700 text-white text-xs rounded px-0.5 py-0 border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Value"
              />
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/conf/${key}`, {
                      method: 'DELETE'
                    });

                    if (!response.ok) {
                      throw new Error('Failed to delete configuration');
                    }

                    const newExtraConf = { ...config.extra_conf };
                    delete newExtraConf[key];
                    setConfig((prev: ConfigState): ConfigState => ({
                      ...prev,
                      extra_conf: newExtraConf
                    }));

                    AntdMessage.success('Configuration deleted successfully');
                  } catch (error) {
                    console.error('Error deleting configuration:', error);
                    AntdMessage.error('Failed to delete configuration');
                  }
                }}
                className="p-0 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomConfig; 