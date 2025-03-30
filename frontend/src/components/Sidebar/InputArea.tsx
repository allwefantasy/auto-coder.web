import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Switch, Select, Tooltip, message as AntdMessage, Spin } from 'antd';
import { UndoOutlined, BuildOutlined, LoadingOutlined } from '@ant-design/icons';
import EditorComponent from './EditorComponent';
import { getMessage } from './lang';
import { FileGroup, ConfigState, EnhancedCompletionItem } from './types';
import FileGroupSelect from './FileGroupSelect';
import { chatService } from '../../services/chatService';
import { codingService } from '../../services/codingService';
import eventBus, { EVENTS } from '../../services/eventBus';

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
  isFullScreen: boolean;
  showFileGroupSelect: boolean;
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
  setConfig,
  isFullScreen,
  showFileGroupSelect
}) => {  
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [indexBuilding, setIndexBuilding] = useState<boolean>(false);
  const [indexStatus, setIndexStatus] = useState<string>('');
  const [isInputAreaMaximized, setIsInputAreaMaximized] = useState<boolean>(false);
  const originalLayoutRef = useRef<{
    position: string,
    top: string,
    right: string,
    bottom: string,
    left: string,
    zIndex: string,
    width: string,
    height: string,
    background: string
  } | null>(null);
  
  const inputAreaRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (inputAreaRef.current) {
      const element = inputAreaRef.current;
      
      if (!isInputAreaMaximized) {
        const computedStyle = window.getComputedStyle(element);
        originalLayoutRef.current = {
          position: computedStyle.position,
          top: computedStyle.top,
          right: computedStyle.right,
          bottom: computedStyle.bottom,
          left: computedStyle.left,
          zIndex: computedStyle.zIndex,
          width: computedStyle.width,
          height: computedStyle.height,
          background: computedStyle.background
        };
        
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.right = '0';
        element.style.bottom = '0';
        element.style.left = '0';
        element.style.zIndex = '9999';
        element.style.width = '100vw';
        element.style.height = '100vh';
        element.style.background = '#1f2937';
        element.style.overflow = 'hidden';
        element.style.display = 'flex';
        element.style.flexDirection = 'column';
        
        setIsInputAreaMaximized(true);
      } else {
        if (originalLayoutRef.current) {
          const originalStyle = originalLayoutRef.current;
          element.style.position = originalStyle.position;
          element.style.top = originalStyle.top;
          element.style.right = originalStyle.right;
          element.style.bottom = originalStyle.bottom;
          element.style.left = originalStyle.left;
          element.style.zIndex = originalStyle.zIndex;
          element.style.width = '100%';
          element.style.height = originalStyle.height;
          element.style.background = originalStyle.background;
          element.style.overflow = '';
          element.style.display = '';
          element.style.flexDirection = '';
        }
        
        setIsInputAreaMaximized(false);
      }
    }
  }, [isInputAreaMaximized]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.UI.TOGGLE_INPUT_FULLSCREEN, toggleFullscreen);
    
    return () => {
      unsubscribe();
    };
  }, [toggleFullscreen]);

  const toggleWriteMode = useCallback(() => {
    setIsWriteMode(!isWriteMode);
  }, [setIsWriteMode, isWriteMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        toggleWriteMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleWriteMode]);

  useEffect(() => {
    checkIndexStatus();
    
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


  const buildIndex = async () => {
    if (indexBuilding) return;
    
    try {
      setIndexBuilding(true);
      setIndexStatus('starting');
      
      const response = await fetch('/api/index/build', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to build index: ${response.statusText}`);
      }
      
      const data = await response.json();
      setIndexStatus('building');
      AntdMessage.success('Index build started');
      
      pollIndexStatus();
    } catch (error) {
      console.error('Error building index:', error);
      AntdMessage.error('Failed to build index');
      setIndexBuilding(false);
      setIndexStatus('error');
    }
  };

  const checkIndexStatus = async () => {
    try {
      const response = await fetch('/api/index/status');
      
      if (!response.ok) {
        throw new Error(`Failed to get index status: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'completed') {
        setIndexBuilding(false);
        setIndexStatus('completed');
      } else if (data.status === 'error') {
        setIndexBuilding(false);
        setIndexStatus('error');
      } else if (data.status === 'running') {
        setIndexBuilding(true);
        setIndexStatus('building');
      } else if (data.status === 'unknown') {
        setIndexBuilding(false);
        setIndexStatus('');
      }
    } catch (error) {
      console.error('Error checking index status:', error);
      setIndexBuilding(false);
    }
  };

  const pollIndexStatus = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/index/status');
        
        if (!response.ok) {
          throw new Error(`Failed to get index status: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'completed') {
          setIndexBuilding(false);
          setIndexStatus('completed');
          AntdMessage.success('Index build completed');
          clearInterval(interval);
        } else if (data.status === 'error') {
          setIndexBuilding(false);
          setIndexStatus('error');
          AntdMessage.error(`Index build failed: ${data.error}`);
          clearInterval(interval);
        } else if (data.status === 'running') {
          setIndexBuilding(true);
          setIndexStatus('building');
        }
      } catch (error) {
        console.error('Error polling index status:', error);
        setIndexBuilding(false);
        setIndexStatus('error');
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  return (
    <div
      className={`flex flex-col w-full bg-gray-800 border-t border-gray-700 ${isInputAreaMaximized ? 'fixed inset-0 z-[9999] p-4' : ''}`}
      ref={inputAreaRef}
      style={{ width: '100%' }}
    >
      <div className={`px-0.5 pt-0 ${isInputAreaMaximized ? 'mb-2 flex-shrink-0' : 'w-full'}`}>
        <div className="space-y-0 w-full">
          <div className="flex items-center justify-between w-full">
            <span className="text-gray-300 text-xs font-semibold">{getMessage('settingsAndGroups')}</span>
            <div className="flex items-center">
              <Tooltip title="Open Documentation">
                <button
                  onClick={() => window.open('https://uelng8wukz.feishu.cn/wiki/BxySwtln8iQKENkHB12cIV6vnZb?fromScene=spaceOverview', '_blank')}
                  className="mr-1 p-0.5 rounded-md transition-all duration-200 text-blue-500 hover:text-blue-400 hover:bg-gray-700"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </button>
              </Tooltip>
              <Tooltip title={isInputAreaMaximized ? "退出全屏" : "全屏模式"}>
                <button
                  onClick={toggleFullscreen}
                  className="mr-1 p-0.5 rounded-md transition-all duration-200 text-blue-500 hover:text-blue-400 hover:bg-gray-700"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    {isInputAreaMaximized ? (
                      <>
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                      </>
                    ) : (
                      <>
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                      </>
                    )}
                  </svg>
                </button>
              </Tooltip>
              <Tooltip title={indexBuilding ? "Building index..." : "Build index"}>
                <button 
                  onClick={buildIndex}
                  disabled={indexBuilding}
                  className={`mr-1 p-0.5 rounded-md transition-all duration-200 
                    ${indexBuilding ? 'text-gray-500 cursor-not-allowed' : 'text-blue-500 hover:text-blue-400 hover:bg-gray-700'}`}
                >
                  {indexBuilding ? (
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
                  ) : (
                    <BuildOutlined style={{ fontSize: 14 }} />
                  )}
                </button>
              </Tooltip>
              {indexStatus === 'completed' && (
                <Tooltip title="Index built successfully">
                  <span className="mr-1 text-green-500 text-xs">✓</span>
                </Tooltip>
              )}
              {indexStatus === 'error' && (
                <Tooltip title="Index build failed">
                  <span className="mr-1 text-red-500 text-xs">✗</span>
                </Tooltip>
              )}
              <Switch
                size="small"
                checked={showConfig}
                onChange={setShowConfig}
                className="ml-0.5"
              />
            </div>           
          </div>
         
        </div>

        {showConfig && (
          <div className="space-y-0 -mb-0.5 w-full">
            <div className="flex flex-col space-y-0 w-full">
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
            <div className="flex items-center justify-between ">
              <Tooltip title={getMessage('skipBuildIndexTooltip')}>
                <span className="text-gray-300 text-[10px]">{getMessage('skipBuildIndex')}</span>
              </Tooltip>
              <Switch
                size="small"
                checked={config.skip_build_index}
                onChange={(checked) => updateConfig('skip_build_index', checked)}
              />
            </div>                        
          </div>
        )}

        <div className="h-[1px] bg-gray-700/50 my-1 w-full"></div>
        <div className="w-full">
          <FileGroupSelect
            fileGroups={fileGroups}
            selectedGroups={selectedGroups}
            setSelectedGroups={setSelectedGroups}
            fetchFileGroups={fetchFileGroups}            
          />
        </div>
      </div>

      <div className={`px-1 py-0.5 flex flex-col ${isMaximized && !isInputAreaMaximized ? 'fixed inset-0 z-50 bg-gray-800' : ''} 
          ${isInputAreaMaximized ? 'flex-1 overflow-hidden' : 'w-full'} 
          scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800`}
        style={{ width: '100%' }}
      >
        <div className={`flex-1 ${isInputAreaMaximized ? 'flex-grow h-full' : 'min-h-[80px]'}`}
             style={isInputAreaMaximized ? { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' } : {}}
        >
          <EditorComponent
            isMaximized={isMaximized || isInputAreaMaximized}
            onEditorDidMount={handleEditorDidMount}
            onShouldSendMessage={() => setShouldSendMessage(true)}
            onToggleMaximize={() => {
              if (isInputAreaMaximized) {
                return;
              }
              setIsMaximized((prev: boolean): boolean => !prev);
            }}            
          />
        </div>
        <div className="flex flex-col mt-0 gap-0 flex-shrink-0">
          <div className="space-y-0 bg-gray-850 p-0.5 rounded-lg shadow-inner border border-gray-700/50">
            <div className="flex items-center justify-between px-0">
              <div className="flex items-center space-x-0.5">
                <span className="text-[9px] font-medium text-gray-400">Mode:</span>
                <Tooltip title={`Switch between Chat and Write mode (${navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + .)`}>
                  <Switch
                    size="small"
                    checked={isWriteMode}
                    onChange={setIsWriteMode}
                    checkedChildren="Write"
                    unCheckedChildren="Chat"
                    className="bg-gray-700 hover:bg-gray-600"
                  />
                </Tooltip>
                <kbd className="px-0.5 py-0 ml-1 text-[8px] font-semibold text-gray-400 bg-gray-800 border border-gray-600 rounded shadow-sm">
                  {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + Enter
                </kbd>                
                <span className="text-[8px] text-gray-500 inline-flex items-center">to send</span>
                <div className="text-gray-400 text-[8px]">
                    /{navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + L to maximize/minimize
                </div>
              </div>
              
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