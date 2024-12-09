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
    available_keys: AutoCoderArgs[];
  }>({
    rag: false,
    rag_url: '',
    rag_type: '',
    rag_token: '',
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
            <span className="text-gray-300">Enable RAG</span>
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
        </div>
      </Card>
    </div>
  );
};

export default SettingsPanel;