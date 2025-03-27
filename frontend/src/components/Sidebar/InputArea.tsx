import React, { useState, useEffect } from 'react';
import { Switch, Select, Tooltip, message as AntdMessage } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import EditorComponent from './EditorComponent';
import { getMessage } from './lang';
import { FileGroup, ConfigState, EnhancedCompletionItem } from './types';
import FileGroupSelect from './FileGroupSelect';
import { chatService } from '../../services/chatService';
import { codingService } from '../../services/codingService';
import CustomConfig from './CustomConfig';

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
  handleStopGeneration: () => void;
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
  handleStopGeneration,
  sendLoading,
  setConfig
}) => {
  const [mentionItems, setMentionItems] = useState<EnhancedCompletionItem[]>([]);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  useEffect(() => {
    const handleTaskComplete = () => {
      setIsCancelling(false);
    };

    const service = isWriteMode ? codingService : chatService;
    service.on('taskComplete', handleTaskComplete);

    return () => {
      service.off('taskComplete', handleTaskComplete);
    };
  }, [isWriteMode]);

  const handleCancelGeneration = async () => {
    if (isCancelling) return;
    
    setIsCancelling(true);
    
    try {
      await handleStopGeneration();
    } catch (error) {
      console.error('Error cancelling task:', error);
      setIsCancelling(false);
      AntdMessage.error('取消任务失败');
    }
  };

  const handleMentionMapChange = (items: EnhancedCompletionItem[]) => {
    console.log("Mention map changed:", items.length, "items");
    console.log(JSON.stringify(items));
    setMentionItems(items);
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700">
      {/* Configuration and Groups Section */}
      <div className="px-0.5 pt-0">
        <div className="space-y-0">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-xs font-semibold">{getMessage('settingsAndGroups')}</span>
            <Switch
              size="small"
              checked={showConfig}
              onChange={setShowConfig}
              className="ml-0.5"
            />             
          </div>
         
        </div>

        {showConfig && (
          <div className="space-y-0 -mb-0.5">
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
            <div className="flex flex-col space-y-0">
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
            <CustomConfig 
              config={config}
              setConfig={setConfig}
              updateConfig={updateConfig}
            />
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
      <div className={`px-1 py-0.5 flex flex-col space-y-0.5 ${isMaximized ? 'fixed inset-0 z-50 bg-gray-800' : ''} scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800`}>
        <div className="flex-1 min-h-[80px] h-full">
          <EditorComponent
            isMaximized={isMaximized}
            onEditorDidMount={handleEditorDidMount}
            onShouldSendMessage={() => setShouldSendMessage(true)}
            onToggleMaximize={() => setIsMaximized((prev: boolean): boolean => !prev)}
            onMentionMapChange={handleMentionMapChange}
          />
        </div>
        <div className="flex flex-col mt-0 gap-0">
          {/* Bottom Actions Container */}
          <div className="space-y-0 bg-gray-850 p-0.5 rounded-lg shadow-inner border border-gray-700/50">
            {/* Mode and Shortcuts Row */}
            <div className="flex items-center justify-between px-0">
              <div className="flex items-center space-x-0.5">
                {/* Mode Switch with Label */}
                <span className="text-[9px] font-medium text-gray-400">Mode:</span>
                <Switch
                  size="small"
                  checked={isWriteMode}
                  onChange={setIsWriteMode}
                  checkedChildren="Write"
                  unCheckedChildren="Chat"
                  className="bg-gray-700 hover:bg-gray-600"
                />
                {/* Keyboard Shortcut */}
                <kbd className="px-0.5 py-0 ml-1 text-[8px] font-semibold text-gray-400 bg-gray-800 border border-gray-600 rounded shadow-sm">
                  {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + Enter
                </kbd>                
                <span className="text-[8px] text-gray-500 inline-flex items-center">to send</span>
                <div className="text-gray-400 text-[8px]">
                    /{navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + L to maximize/minimize
                </div>
              </div>
              
              {/* Send Button (moved from Actions Row) */}
              <button
                className={`p-0.5 rounded-md transition-all duration-200
                  focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
                  ${sendLoading 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-blue-500 hover:text-blue-600'
                  }`}
                onClick={sendLoading ? handleCancelGeneration : handleSendMessage}
                disabled={isCancelling}
                title={sendLoading ? (isCancelling ? getMessage('cancelling') : getMessage('stop')) : getMessage('send')}
              >
                <div className="flex items-center justify-center">
                  {sendLoading ? (
                    <div className="relative">
                      {isCancelling ? (
                        <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" 
                         className="h-3.5 w-3.5 transform rotate-45" 
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