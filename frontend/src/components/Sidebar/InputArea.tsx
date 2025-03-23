import React, { useState } from 'react';
import { Switch, Select, Tooltip, message as AntdMessage } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import EditorComponent from './EditorComponent';
import { getMessage } from './lang';
import { FileGroup, ConfigState, EnhancedCompletionItem } from './types';
import FileGroupSelect from './FileGroupSelect';

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
  const [showCustomConfig, setShowCustomConfig] = useState<boolean>(false);
  const [mentionItems, setMentionItems] = useState<EnhancedCompletionItem[]>([]);

  const handleMentionMapChange = (items: EnhancedCompletionItem[]) => {
    console.log("Mention map changed:", items.length, "items");
    console.log(JSON.stringify(items));
    setMentionItems(items);
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700">
      {/* Configuration and Groups Section */}
      <div className="px-1 pt-0.5">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-xs font-semibold">{getMessage('settingsAndGroups')}</span>
            <Switch
              size="small"
              checked={showConfig}
              onChange={setShowConfig}
              className="ml-2"
            />
          </div>
          <div className="text-gray-400 text-[9px]">
            {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + L to maximize/minimize
          </div>
        </div>

        {showConfig && (
          <div className="space-y-0.5 mb-0.5">
            <div className="flex items-center justify-between">
              <Tooltip title={getMessage('skipBuildIndexTooltip')}>
                <span className="text-gray-300 text-[10px]">{getMessage('skipBuildIndex')}</span>
              </Tooltip>
              <Switch
                size="small"
                checked={config.skip_build_index}
                onChange={(checked) => updateConfig('skip_build_index', checked)}
              />
            </div>

            {/* Project Type - Changed to vertical layout */}
            <div className="flex flex-col space-y-1">
              <Tooltip title={getMessage('projectTypeTooltip')}>
                <span className="text-gray-300 text-[10px]">{getMessage('projectType')}</span>
              </Tooltip>
              <Select
                mode="tags"
                size="small"
                style={{ width: '100%' }}
                placeholder="e.g. .py,.ts"
                value={config.project_type ? config.project_type.split(',') : []}
                onChange={(values) => updateConfig('project_type', values.join(','))}
                className="custom-select"
                tokenSeparators={[',']}
                maxTagCount="responsive"
              >                
              </Select>
            </div>

            {/* Custom Configuration */}
            <div className="space-y-1 mt-1">
              {/* Heading with Toggle Button */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-[10px] font-medium">{getMessage('customConfig')}</span>
                <div className="flex items-center space-x-2">
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
                      className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      {getMessage('addConfig')}
                    </button>
                  )}
                </div>
              </div>

              {/* Config Items - Only shown when showCustomConfig is true */}
              {showCustomConfig && (
                <div className="space-y-1">
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
              )}
            </div>
          </div>
        )}

        {/* File Groups Select - Using the new component */}
        <FileGroupSelect
          fileGroups={fileGroups}
          selectedGroups={selectedGroups}
          setSelectedGroups={setSelectedGroups}
          fetchFileGroups={fetchFileGroups}
          mentionItems={mentionItems}
        />
      </div>

      {/* Message Input */}
      <div className={`p-4 flex flex-col space-y-2 ${isMaximized ? 'fixed inset-0 z-50 bg-gray-800' : ''} scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800`}>
        <div className="flex-1 min-h-[120px] h-full">
          <EditorComponent
            isMaximized={isMaximized}
            onEditorDidMount={handleEditorDidMount}
            onShouldSendMessage={() => setShouldSendMessage(true)}
            onToggleMaximize={() => setIsMaximized((prev: boolean): boolean => !prev)}
            onMentionMapChange={handleMentionMapChange}
          />
        </div>
        <div className="flex flex-col mt-1 gap-1">
          {/* Bottom Actions Container */}
          <div className="space-y-2 bg-gray-850 p-2 rounded-lg shadow-inner border border-gray-700/50">
            {/* Mode and Shortcuts Row */}
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center space-x-2">
                {/* Mode Switch with Label */}
                <span className="text-[10px] font-medium text-gray-400">Mode:</span>
                <Switch
                  size="small"
                  checked={isWriteMode}
                  onChange={setIsWriteMode}
                  checkedChildren="Write"
                  unCheckedChildren="Chat"
                  className="bg-gray-700 hover:bg-gray-600"
                />
                {/* Keyboard Shortcut */}
                <kbd className="px-1 py-0.5 ml-3 text-[10px] font-semibold text-gray-400 bg-gray-800 border border-gray-600 rounded shadow-sm">
                  {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + Enter
                </kbd>
                <span className="text-[10px] text-gray-500 inline-flex items-center">to send</span>
              </div>
              
              {/* Send Button (moved from Actions Row) */}
              <button
                className="p-2 text-blue-500 hover:text-blue-600 
                  rounded-md transition-all duration-200
                  focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
                  transform hover:-translate-y-0.5"
                onClick={handleSendMessage}
                disabled={sendLoading}
                title={getMessage('send')}
              >
                <div className="flex items-center justify-center">
                  {sendLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" 
                         className="h-5 w-5 transform rotate-45" 
                         fill="none" 
                         viewBox="0 0 24 24" 
                         stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;