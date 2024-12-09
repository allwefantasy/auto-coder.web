import React, { useState, useEffect } from 'react';
import { Switch, Input, message, Card } from 'antd';
import { Editor } from '@monaco-editor/react';
import type { AutoCoderArgs } from './types';

const SettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<{
    rag: boolean;
    rag_url: string;
    rag_type: string;
    rag_token: string;
    index_enabled: boolean;
    skip_build_index: boolean;
    skip_filter_index: boolean;
    index_filter_level: string;
    index_filter_workers: string;
    index_filter_file_num: string;
    index_build_workers: string;
    available_keys: AutoCoderArgs[];
  }>({
    rag: false,
    rag_url: '',
    rag_type: '',
    rag_token: '',
    index_enabled: false,
    skip_build_index: false,
    skip_filter_index: false,
    index_filter_level: '1',
    index_filter_workers: '100',
    index_filter_file_num: '10',
    index_build_workers: '100',
    available_keys: []
  });

  useEffect(() => {
    // 获取初始配置
    fetch('/api/conf')
      .then(response => response.json())
      .then(data => {
        const { rag = "false", rag_url = "", rag_type = "", rag_token = "" } = data.conf;
        setConfig(prev => ({
          ...prev,
          rag: rag === "true",
          rag_url,
          rag_type,
          rag_token
        }));
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        message.error('Failed to fetch configuration');
      });

    // 获取可用的配置键
    fetch('/api/conf/keys')
      .then(response => response.json())
      .then(data => {
        setConfig(prev => ({
          ...prev,
          available_keys: data.keys
        }));
      })
      .catch(error => {
        console.error('Error fetching configuration keys:', error);
        message.error('Failed to fetch configuration keys');
      });
  }, []);

  const updateConfig = async (key: string, value: string | boolean) => {
    try {
      const response = await fetch('/api/conf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: String(value) })
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      setConfig(prev => ({ ...prev, [key]: value }));
      message.success('Configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      message.error('Failed to update configuration');
    }
  };

  return (
    <div className="h-full bg-gray-900 p-6 overflow-y-auto">
      <Card className="bg-gray-800 border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">RAG</span>
            <Switch
              checked={config.rag}
              onChange={(checked) => updateConfig('rag', checked)}
              className="bg-gray-600"
            />
          </div>

          {config.rag && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-gray-300 mb-2">RAG URL</label>
                <Input
                  value={config.rag_url}
                  onChange={(e) => updateConfig('rag_url', e.target.value)}
                  placeholder="Enter RAG URL"
                  className="custom-input"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">RAG Type</label>
                <Input
                  value={config.rag_type}
                  onChange={(e) => updateConfig('rag_type', e.target.value)}
                  placeholder="Enter RAG Type"
                  className="custom-input"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">RAG Token</label>
                <Input.Password
                  value={config.rag_token}
                  onChange={(e) => updateConfig('rag_token', e.target.value)}
                  placeholder="Enter RAG Token"
                  className="custom-input"
                />
              </div>
            </div>
          )}

          <div className="border-t border-gray-700 mt-6 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Index</span>
              <Switch
                checked={config.index_enabled}
                onChange={(checked) => updateConfig('index_enabled', checked)}
                className="bg-gray-600"
              />
            </div>

            {config.index_enabled && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Skip Build Index</span>
                  <Switch
                    checked={config.skip_build_index}
                    onChange={(checked) => updateConfig('skip_build_index', checked)}
                    className="bg-gray-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Skip Filter Index</span>
                  <Switch
                    checked={config.skip_filter_index}
                    onChange={(checked) => updateConfig('skip_filter_index', checked)}
                    className="bg-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Index Filter Level</label>
                  <select
                    value={config.index_filter_level}
                    onChange={(e) => updateConfig('index_filter_level', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Index Filter Workers</label>
                  <Input
                    type="number"
                    value={config.index_filter_workers}
                    onChange={(e) => updateConfig('index_filter_workers', e.target.value)}
                    placeholder="Default: 100"
                    className="custom-input"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Index Filter File Number</label>
                  <Input
                    type="number"
                    value={config.index_filter_file_num}
                    onChange={(e) => updateConfig('index_filter_file_num', e.target.value)}
                    placeholder="Default: 10"
                    className="custom-input"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Index Build Workers</label>
                  <Input
                    type="number"
                    value={config.index_build_workers}
                    onChange={(e) => updateConfig('index_build_workers', e.target.value)}
                    placeholder="Default: 100"
                    className="custom-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPanel;