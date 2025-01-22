import React, { useState, useEffect } from 'react';
import { Switch, Input, message, Card, Select } from 'antd';
import { Editor } from '@monaco-editor/react';
import { getMessage, setLanguage, getCurrentLanguage } from '../Sidebar/lang';
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
    language: string;
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
    available_keys: [],
    language: getCurrentLanguage()
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
      message.success(getMessage('settingsUpdateSuccess'));
    } catch (error) {
      console.error('Error updating config:', error);
      message.error(getMessage('settingsUpdateError'));
    }
  };

  return (
    <div className="h-full bg-gray-900 p-6 overflow-y-auto">
      <Card className="bg-gray-800 border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">{getMessage('settingsTitle')}</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Language / 语言</label>
            <Select
              value={config.language}
              onChange={(value) => {
                setConfig(prev => ({ ...prev, language: value }));
                setLanguage(value as 'en' | 'zh');
              }}
              className="custom-select w-full"
            >
              <Select.Option value="en">English</Select.Option>
              <Select.Option value="zh">中文</Select.Option>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">{getMessage('ragToggle')}</span>
            <Switch
              checked={config.rag}
              onChange={(checked) => setConfig(prev => ({ ...prev, rag: checked }))}
              className="bg-gray-600"
            />
          </div>

          {config.rag && (
            <div className="space-y-4 mt-4">
              <div>
              <label className="block text-gray-300 mb-2">{getMessage('ragUrlInput')}</label>
              <Input
                value={config.rag_url}
                onChange={(e) => setConfig(prev => ({ ...prev, rag_url: e.target.value }))}
                onBlur={(e) => updateConfig('rag_url', e.target.value)}
                placeholder={getMessage('ragUrlPlaceholder')}
                className="custom-input"
              />
              </div>

              <div>
              <label className="block text-gray-300 mb-2">{getMessage('ragTypeInput')}</label>
              <Input
                value={config.rag_type}
                onChange={(e) => setConfig(prev => ({ ...prev, rag_type: e.target.value }))}
                onBlur={(e) => updateConfig('rag_type', e.target.value)}
                placeholder={getMessage('ragTypePlaceholder')}
                className="custom-input"
              />
              </div>

              <div>
              <label className="block text-gray-300 mb-2">{getMessage('ragTokenInput')}</label>
              <Input.Password
                value={config.rag_token}
                onChange={(e) => setConfig(prev => ({ ...prev, rag_token: e.target.value }))}
                onBlur={(e) => updateConfig('rag_token', e.target.value)}
                placeholder={getMessage('ragTokenPlaceholder')}
                className="custom-input"
              />
              </div>
            </div>
          )}

          <div className="border-t border-gray-700 mt-6 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">{getMessage('indexToggle')}</span>
              <Switch
                checked={config.index_enabled}
                onChange={(checked) => setConfig(prev => ({ ...prev, index_enabled: checked }))}
                className="bg-gray-600"
              />
            </div>

            {config.index_enabled && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">{getMessage('skipBuildIndexToggle')}</span>
                  <Switch
                    checked={config.skip_build_index}
                    onChange={(checked) => updateConfig('skip_build_index', checked)}
                    className="bg-gray-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">{getMessage('skipFilterIndexToggle')}</span>
                  <Switch
                    checked={config.skip_filter_index}
                    onChange={(checked) => updateConfig('skip_filter_index', checked)}
                    className="bg-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">{getMessage('indexFilterLevelInput')}</label>
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
                  <label className="block text-gray-300 mb-2">{getMessage('indexFilterWorkersInput')}</label>
                  <Input
                    type="number"
                    value={config.index_filter_workers}
                    onChange={(e) => updateConfig('index_filter_workers', e.target.value)}
                    placeholder={getMessage('indexFilterWorkersPlaceholder')}
                    className="custom-input"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">{getMessage('indexFilterFileNumInput')}</label>
                  <Input
                    type="number"
                    value={config.index_filter_file_num}
                    onChange={(e) => updateConfig('index_filter_file_num', e.target.value)}
                    placeholder={getMessage('indexFilterFileNumPlaceholder')}
                    className="custom-input"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">{getMessage('indexBuildWorkersInput')}</label>
                  <Input
                    type="number"
                    value={config.index_build_workers}
                    onChange={(e) => updateConfig('index_build_workers', e.target.value)}
                    placeholder={getMessage('indexBuildWorkersPlaceholder')}
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
import React, { useEffect, useState } from 'react';
import { Select, message } from 'antd';
import { getMessage, setLanguage, getCurrentLanguage } from '../Sidebar/lang';

const SettingsPanel: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<string>('zh');

  useEffect(() => {
    // 初始化时获取当前语言设置
    const initLanguage = async () => {
      try {
        const response = await fetch('/api/settings/language');
        const data = await response.json();
        setCurrentLang(data.language || 'zh');
      } catch (error) {
        console.error('Failed to fetch language setting:', error);
      }
    };
    initLanguage();
  }, []);

  const handleLanguageChange = async (value: string) => {
    try {
      // 调用API更新语言设置
      const response = await fetch('/api/settings/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value)
      });

      if (!response.ok) {
        throw new Error('Failed to update language setting');
      }

      // 更新本地状态
      setCurrentLang(value);
      await setLanguage(value as 'zh' | 'en');
      message.success(getMessage('settingsUpdateSuccess'));
    } catch (error) {
      console.error('Error updating language:', error);
      message.error(getMessage('settingsUpdateError'));
    }
  };

  return (
    <div className="h-full p-4 bg-gray-900">
      <div className="mb-4">
        <label className="block text-gray-300 text-sm mb-2">
          {getMessage('language')}
        </label>
        <Select
          value={currentLang}
          onChange={handleLanguageChange}
          className="w-full"
          options={[
            { value: 'zh', label: '中文' },
            { value: 'en', label: 'English' }
          ]}
        />
      </div>
    </div>
  );
};

export default SettingsPanel;