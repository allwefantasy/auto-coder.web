import React, { useState } from 'react';
import { Switch, Select, Tooltip, message as AntdMessage } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import EditorComponent from './EditorComponent';
import { getMessage } from './lang';
import { FileGroup, ConfigState } from './types';

interface InputAreaProps {
  showConfig: boolean;
  setShowConfig: (value: boolean) => void;
  config: ConfigState;
  updateConfig: (key: string, value: boolean | string) => void;
  fileGroups: FileGroup[];
  selectedGroups: string[];
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
  setSelectedGroups: (values: string[]) => void;
  fetchFileGroups: () => void;
  isMaximized: boolean;
  setIsMaximized: React.Dispatch<React.SetStateAction<boolean>>;
  handleEditorDidMount: (editor: any, monaco: any) => void;
  setShouldSendMessage: (value: boolean) => void;
  isWriteMode: boolean;
  setIsWriteMode: (value: boolean) => void;
  handleRevert: () => void;
  handleSendMessage: () => void;
  sendLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({
  showConfig,
  setShowConfig,
  config,
  updateConfig,
  fileGroups,
  selectedGroups,
  setSelectedGroups,
  fetchFileGroups,
  isMaximized,
  setIsMaximized,
  handleEditorDidMount,
  setShouldSendMessage,
  isWriteMode,
  setIsWriteMode,
  handleRevert,
  handleSendMessage,
  sendLoading,
  setConfig
}) => {
  return (
    <div className="bg-gray-800 border-t border-gray-700">
      {/* Configuration and Groups Section */}
      <div className="px-2 pt-1">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm font-semibold">{getMessage('settingsAndGroups')}</span>
            <Switch
              size="small"
              checked={showConfig}
              onChange={setShowConfig}
              className="ml-2"
            />
          </div>
          <div className="text-gray-400 text-[10px]">
            {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + L to maximize/minimize
          </div>
        </div>

        {showConfig && (
          <div className="space-y-1 mb-1">
            <div className="flex items-center justify-between">
              <Tooltip title={getMessage('humanAsModelTooltip')}>
                <span className="text-gray-300 text-xs">{getMessage('humanAsModel')}</span>
              </Tooltip>
              <Switch
                size="small"
                checked={config.human_as_model}
                onChange={(checked) => updateConfig('human_as_model', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Tooltip title={getMessage('skipBuildIndexTooltip')}>
                <span className="text-gray-300 text-xs">{getMessage('skipBuildIndex')}</span>
              </Tooltip>
              <Switch
                size="small"
                checked={config.skip_build_index}
                onChange={(checked) => updateConfig('skip_build_index', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Tooltip title={getMessage('projectTypeTooltip')}>
                <span className="text-gray-300 text-xs">{getMessage('projectType')}</span>
              </Tooltip>
              <Select
                mode="tags"
                size="small"
                style={{ width: '60%' }}
                placeholder="e.g. .py,.ts"
                value={config.project_type ? config.project_type.split(',') : []}
                onChange={(values) => updateConfig('project_type', values.join(','))}
                className="custom-select"
                tokenSeparators={[',']}
              >
                {['.py', '.ts', '.tsx', '.js', '.jsx'].map(ext => (
                  <Select.Option key={ext} value={ext}>
                    {ext}
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Custom Configuration */}
            <div className="space-y-2 mt-2">
              {/* Heading */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-xs font-medium">{getMessage('customConfig')}</span>
                <button
                  onClick={() => {
                    const newExtraConf = { ...config.extra_conf };
                    newExtraConf[`custom_key_${Object.keys(config.extra_conf).length}`] = '';
                    setConfig((prev: ConfigState): ConfigState => ({
                      ...prev,
                      extra_conf: newExtraConf
                    }));
                  }}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {getMessage('addConfig')}
                </button>
              </div>

              {/* Config Items */}
              <div className="space-y-2">
                {Object.entries(config.extra_conf).map(([key, value], index) => (
                  <div key={index} className="flex items-center space-x-2">
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
                      className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
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
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* File Groups Select */}
        <div className="px-2">
          <div className="h-[1px] bg-gray-700/50 my-1"></div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select file groups to work with"
            value={selectedGroups}
            onFocus={fetchFileGroups}
            onChange={(values) => {
              console.log('Selected groups:', values);
              setSelectedGroups(values);
              fetch('/api/file-groups/switch', {
                method: 'POST',
                body: JSON.stringify({ group_names: values })
              });
            }}
            optionLabelProp="label"
            className="custom-select"
          >
            {fileGroups.map(group => (
              <Select.Option
                key={group.name}
                value={group.name}
                label={group.name}
              >
                <div className="flex justify-between items-center">
                  <span>{group.name}</span>
                  <span className="text-gray-400 text-xs">
                    {group.files.length} files
                    </span>
                </div>
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>

      {/* Message Input */}
      <div className={`p-4 flex flex-col space-y-2 ${isMaximized ? 'fixed inset-0 z-50 bg-gray-800' : ''} scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800`}>
        <div className="flex-1 min-h-[150px] h-full">
          <EditorComponent
            isMaximized={isMaximized}
            onEditorDidMount={handleEditorDidMount}
            onShouldSendMessage={() => setShouldSendMessage(true)}
            onToggleMaximize={() => setIsMaximized((prev: boolean): boolean => !prev)}
          />
        </div>
        <div className="flex flex-col mt-2 gap-2">
          {/* Bottom Actions Container */}
          <div className="space-y-3 bg-gray-850 p-3 rounded-lg shadow-inner border border-gray-700/50">
            {/* Mode and Shortcuts Row */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-4">
                {/* Mode Switch with Label */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-400">Mode:</span>
                  <Switch
                    size="small"
                    checked={isWriteMode}
                    onChange={setIsWriteMode}
                    checkedChildren="Write"
                    unCheckedChildren="Chat"
                    className="bg-gray-700 hover:bg-gray-600"
                  />
                </div>
                {/* Keyboard Shortcut */}
                <div className="flex items-center space-x-1.5">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-600 rounded shadow-sm">
                    {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + Enter
                  </kbd>
                  <span className="text-xs text-gray-500">to send</span>
                </div>
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between">
              {/* Left Side - Utility Actions */}
              <div className="flex items-center space-x-2">
                <Tooltip title={getMessage('clearEventsTooltip')} placement="top">
                  <button
                    className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 
                    transition-all duration-200 flex items-center space-x-1.5 group shadow-sm
                    border border-gray-600/50 hover:border-gray-500"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/event/clear', {
                          method: 'POST'
                        });
                        if (!response.ok) {
                          throw new Error('Failed to clear events');
                        }
                        AntdMessage.success('Event queue cleared successfully');
                      } catch (error) {
                        console.error('Error clearing events:', error);
                        AntdMessage.error('Failed to clear event queue');
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" 
                         className="h-4 w-4 transform group-hover:rotate-180 transition-transform duration-300" 
                         fill="none" 
                         viewBox="0 0 24 24" 
                         stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-xs font-medium">{getMessage('clearEvents')}</span>
                  </button>
                </Tooltip>
              </div>

              {/* Right Side - Primary Actions */}
              <div className="flex items-center space-x-2">
                <Tooltip title={getMessage('undoTooltip')} placement="top">
                  <button
                    className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600
                      transition-all duration-200 border border-gray-600/50 hover:border-gray-500
                      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
                      focus:ring-offset-gray-800 shadow-sm group"
                    onClick={handleRevert}
                  >
                    <UndoOutlined className="text-lg group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                </Tooltip>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white 
                    rounded-md font-medium transition-all duration-200
                    hover:from-blue-700 hover:to-indigo-700 
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
                    focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-md hover:shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30
                    border border-indigo-500/50 hover:border-indigo-400
                    transform hover:-translate-y-0.5"
                  onClick={handleSendMessage}
                  disabled={sendLoading}
                >
                  <div className="flex items-center space-x-2">
                    {sendLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{getMessage('sending')}</span>
                      </>
                    ) : (
                      <>
                        <span>{getMessage('send')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" 
                             className="h-4 w-4 transform rotate-45 group-hover:translate-x-0.5" 
                             fill="none" 
                             viewBox="0 0 24 24" 
                             stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;