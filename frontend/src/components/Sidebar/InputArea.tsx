import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Switch, Select, Tooltip, message as AntdMessage, Spin } from 'antd';
import { UndoOutlined, BuildOutlined, LoadingOutlined } from '@ant-design/icons';
// EditorComponent is now replaced by PromptInput
// import EditorComponent from './EditorComponent'; 
import PromptInput from '../Common/PromptInput'; // Import the new PromptInput component
import { getMessage } from './lang';
import { FileGroup, ConfigState } from './types'; // EnhancedCompletionItem might not be needed here anymore
import FileGroupSelect from './FileGroupSelect';
import { chatService } from '../../services/chatService';
import ProviderSelectors from './ProviderSelectors'; // Import the new parent component
import { codingService } from '../../services/codingService';
import eventBus, { EVENTS } from '../../services/eventBus';
import axios from 'axios';
import { ToggleInputFullscreenEventData, AgenticModeChangedEventData, ToggleWriteModeEventData, HotkeyEventData, SendMessageEventData, StopGenerationEventData } from '../../services/event_bus_data';

interface InputAreaProps {
  fileGroups: FileGroup[];
  selectedGroups: string[];
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
  setSelectedGroups: (values: string[]) => void;
  fetchFileGroups: () => void;
  isMaximized: boolean;
  setIsMaximized: React.Dispatch<React.SetStateAction<boolean>>;
  handleEditorDidMount: (editor: any, monaco: any) => void;  
  isWriteMode: boolean;
  setIsWriteMode: (value: boolean) => void;
  isRuleMode: boolean;
  setIsRuleMode: (value: boolean) => void;
  handleRevert: () => void;
  sendLoading: boolean;
  isFullScreen: boolean;
  showFileGroupSelect: boolean;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  panelId?: string;
  isActive?: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({
  fileGroups,
  selectedGroups,
  setSelectedGroups,
  fetchFileGroups,
  isMaximized,
  setIsMaximized,
  handleEditorDidMount,  
  isWriteMode,
  setIsWriteMode,
  isRuleMode,
  setIsRuleMode,
  handleRevert,
  sendLoading,
  setConfig,
  isFullScreen,
  showFileGroupSelect,
  soundEnabled,
  setSoundEnabled,
  panelId,
  isActive = true
}) => {    
  const [showConfig, setShowConfig] = useState<boolean>(true);
  const [config, setLocalConfig] = useState<ConfigState>({
    human_as_model: false,
    extra_conf: {},
    available_keys: []
  });
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [indexBuilding, setIndexBuilding] = useState<boolean>(false);
  const [indexStatus, setIndexStatus] = useState<string>('');
  const [agenticActive, setAgenticActive] = useState(true);
  const [isInputAreaMaximized, setIsInputAreaMaximized] = useState<boolean>(false);
  const [promptValue, setPromptValue] = useState(''); // State for PromptInput value
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

  // 处理编辑器全屏切换
  const toggleFullscreen = useCallback(() => {
    if (inputAreaRef.current) {
      const element = inputAreaRef.current;
      
      if (!isInputAreaMaximized) {
        setIsInputAreaMaximized(true);
      } else {
        setIsInputAreaMaximized(false);
      }
    }
  }, [isInputAreaMaximized]);

  // 定义toggleWriteMode函数 - 放在使用之前
  const toggleWriteMode = useCallback(() => {
    // 按照Chat -> Write -> Rule -> Chat的顺序循环切换
    if (!isWriteMode && !isRuleMode) {
      // 当前是Chat模式，切换到Write模式
      setIsWriteMode(true);
      setIsRuleMode(false);
    } else if (isWriteMode && !isRuleMode) {
      // 当前是Write模式，切换到Rule模式
      setIsWriteMode(false);
      setIsRuleMode(true);
    } else {
      // 当前是Rule模式，切换到Chat模式
      setIsWriteMode(false);
      setIsRuleMode(false);
    }
  }, [isWriteMode, isRuleMode, setIsWriteMode, setIsRuleMode]);

  // 自定义发送消息函数
  const handleSendMessageFromInputArea = useCallback((currentPromptValue: string) => {
    if (!currentPromptValue.trim()) return;
    eventBus.publish(EVENTS.CHAT.SEND_MESSAGE, new SendMessageEventData(currentPromptValue, panelId));
    setPromptValue(''); // Clear input after sending
  }, [panelId]);

  // 自定义停止生成函数
  const handleStopGeneration = useCallback(() => {
    // 使用eventBus发送消息
    eventBus.publish(EVENTS.CHAT.STOP_GENERATION, new StopGenerationEventData(panelId));
  }, [panelId]);

  // 监听editor发布的全屏切换事件
  useEffect(() => {
    const handleToggleFullscreenEvent = (data: ToggleInputFullscreenEventData) => {
      // 检查事件是否与当前面板相关
      if (data.panelId && data.panelId !== panelId) {
        return; // 如果事件不属于当前面板，直接返回
      }
      
      setIsInputAreaMaximized(prev => !prev);
    };

    const unsubscribe = eventBus.subscribe(EVENTS.UI.TOGGLE_INPUT_FULLSCREEN, handleToggleFullscreenEvent);
    
    return () => {
      unsubscribe();
    };
  }, [panelId]);

  // 监听热键事件
  useEffect(() => {
    // 只有当面板处于活跃状态时才订阅热键事件
    if (!isActive) return;

    // 处理全屏切换热键
    const handleToggleFullscreenHotkey = (data: HotkeyEventData) => {
      if (data.panelId !== panelId) return;
      setIsInputAreaMaximized(prev => !prev);
    };

    // 处理发送消息热键 - PromptInput handles its own Enter to send.
    // This global hotkey might still be useful for a generic send command.
    const handleSendHotkey = (data: HotkeyEventData) =>
      if (data.panelId !== panelId) return;
      // Trigger send using the current promptValue
      // Check if editor is focused to avoid double send if PromptInput also handles it.
      // For now, let PromptInput's internal mechanism handle direct editor "Enter".
      // This event bus hotkey can be for a more global "send" action if needed.
      // handleSendMessageFromInputArea(promptValue);
    };

    // 处理模式切换热键
    const handleToggleModeHotkey = (data: HotkeyEventData) => {
      if (data.panelId !== panelId) return;
      toggleWriteMode();
    };

    // 订阅热键事件
    const unsubscribeFullscreen = eventBus.subscribe(EVENTS.HOTKEY.TOGGLE_FULLSCREEN, handleToggleFullscreenHotkey);
    // const unsubscribeSend = eventBus.subscribe(EVENTS.HOTKEY.SEND, handleSendHotkey); // PromptInput has its own send. Re-evaluate if needed.
    const unsubscribeMode = eventBus.subscribe(EVENTS.HOTKEY.TOGGLE_MODE, handleToggleModeHotkey);

    return () => {
      unsubscribeFullscreen();
      // unsubscribeSend();
      unsubscribeMode();
    };
  }, [isActive, panelId, toggleWriteMode]); // removed handleSendMessageFromInputArea, promptValue

  // 添加新的eventBus事件监听
  useEffect(() => {
    const handleToggleWriteMode = (data: ToggleWriteModeEventData) => {
      // 检查事件是否与当前面板相关      
      if (data.panelId && data.panelId !== panelId) {
        return; // 如果事件不属于当前面板，直接返回
      }      
      toggleWriteMode();
    };

    const unsubscribe = eventBus.subscribe(EVENTS.UI.TOGGLE_WRITE_MODE, handleToggleWriteMode);
    
    return () => {
      unsubscribe();
    };
  }, [toggleWriteMode, panelId]);

  // 获取配置信息
  const fetchConfig = useCallback(async () => {
    try {
      const response = await axios.get('/api/conf');
      if (response.data && response.data.conf) {
        const apiConfig = response.data.conf;
        const newConfig: ConfigState = {
          human_as_model: apiConfig.human_as_model === 'true',
          extra_conf: apiConfig.extra_conf || {},
          available_keys: apiConfig.available_keys || []
        };
        setLocalConfig(newConfig);
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      AntdMessage.error('Failed to fetch configuration');
    }
  }, [setConfig]);

  // 更新配置
  const updateConfig = useCallback(async (key: string, value: boolean | string) => {
    try {
      // 更新本地状态
      setLocalConfig(prev => {
        const newConfig = { ...prev, [key]: value };
        // 同步到父组件
        setConfig(newConfig);
        return newConfig;
      });

      // 发送到API
      await axios.post('/api/conf', { [key]: value });
    } catch (error) {
      console.error(`Error updating config ${key}:`, error);
      AntdMessage.error(`Failed to update ${key}`);
    }
  }, [setConfig]);

  useEffect(() => {
    checkIndexStatus();
    fetchConfig();
    
    const handleTaskComplete = () => {
      setIsCancelling(false);
    };

    const service = isWriteMode ? codingService : chatService;
    service.on('taskComplete', handleTaskComplete);

    return () => {
      service.off('taskComplete', handleTaskComplete);
    };
  }, [isWriteMode, fetchConfig]);

  const handleCancelGeneration = async () => {
    if (isCancelling) return;
    
    setIsCancelling(true);
    
    try {
      await handleStopGeneration();
    } catch (error) {
      console.error('Error cancelling task:', error);
      setIsCancelling(false);
      AntdMessage.error('取消任务失败');
    }finally {
      setIsCancelling(false);   // 确保状态重置
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
                  onClick={() => window.open('https://uelng8wukz.feishu.cn/wiki/EFCEwiYZFit44ZkJgohcYjlMnVP?fromScene=spaceOverview', '_blank')}
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
              <Tooltip title={soundEnabled ? "关闭提示音" : "开启提示音"}>
                <button
                  onClick={() => {                    
                    setSoundEnabled(!soundEnabled)
                  }}
                  className="ml-0.5 p-0.5 rounded-md transition-all duration-200 text-gray-400 hover:text-gray-300"
                >
                  {soundEnabled ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a9 9 0 010 12M8.464 8.464a5 5 0 010 7.072" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" />
                      <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </Tooltip>
            </div>           
          </div>
         
        </div>
        
        <div className="h-[1px] bg-gray-700/50 my-1 w-full"></div>
        {/* Provider Selectors (RAG/MCPs) */}
        <ProviderSelectors isWriteMode={isWriteMode} />

        {/* File Group Selector */}
        <div className="w-full mt-1"> {/* Add margin top if needed */}
          <FileGroupSelect
            fileGroups={fileGroups}
            selectedGroups={selectedGroups}
            setSelectedGroups={setSelectedGroups}
            fetchFileGroups={fetchFileGroups}            
            panelId={panelId}
          />
        </div>
      </div>

      <div className={`px-1 py-0.5 flex flex-col ${isMaximized && !isInputAreaMaximized ? 'fixed inset-0 z-50 bg-gray-800' : ''} 
          ${isInputAreaMaximized ? 'flex-1 overflow-hidden' : 'w-full'} 
          scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800`}
        style={{ width: '100%' }}
      >
        <div className={`flex-1 ${isInputAreaMaximized ? 'flex-grow h-full' : ''}`}
             style={isInputAreaMaximized ? { display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' } : {}} // Adjusted height calculation
        >
          <PromptInput
            value={promptValue}
            onValueChange={setPromptValue}
            onSendMessage={handleSendMessageFromInputArea}
            isLoading={sendLoading || isCancelling}
            onEditorDidMount={handleEditorDidMount}
            isFullScreen={isInputAreaMaximized}
            onToggleFullScreen={toggleFullscreen}
            panelId={panelId}
            editorMinHeight={isInputAreaMaximized ? "100%" : "80px"}
            editorMaxHeight={isInputAreaMaximized ? "100%" : "300px"} // Or a suitable max height for non-fullscreen
            showStopButton={sendLoading} // Show stop if sendLoading is true
            // placeholder is handled by PromptInput's i18n
          />
        </div>
        
        {/* The bottom controls (Mode select, hotkey hints, agentic mode, send/stop button) are now part of PromptInput or managed differently */}
        {/* We will keep the Mode select and Agentic mode controls here for now, as they are specific to InputArea's broader context */}
        
        <div className="flex flex-col mt-1 gap-1 flex-shrink-0"> {/* Added gap-1 and mt-1 */}
          <div className="space-y-0.5 bg-gray-850 p-1 rounded-lg shadow-inner border border-gray-700/50"> {/* Adjusted padding and spacing */}
            <div className="flex items-center justify-between px-0.5"> {/* Adjusted padding */}
              <div className="flex items-center space-x-1"> {/* Adjusted spacing */}
                <span className="text-xs font-medium text-gray-400">Mode:</span> {/* Increased font size slightly */}
                <Tooltip title={`Switch mode (${navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + .)`}>
                  <Select
                    size="small"
                    value={isRuleMode ? "rule" : (isWriteMode ? "write" : "chat")}
                    onChange={(value) => {
                      if (value === "rule") {
                        setIsRuleMode(true);
                        setIsWriteMode(false);
                      } else {
                        setIsRuleMode(false);
                        setIsWriteMode(value === "write");
                      }
                    }}
                    options={[
                      { value: 'chat', label: 'Chat' },
                      { value: 'write', label: 'Write' },
                      { value: 'rule', label: 'Rule' },
                    ]}
                    style={{ width: 85 }} // Adjusted width
                    className="text-xs"                    
                    popupMatchSelectWidth={false}
                  />
                </Tooltip>
                <div className="text-gray-400 text-xs ml-1"> {/* Increased font size and margin */}
                    {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + L to fullscreen
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 mr-1"> {/* Adjusted spacing */}
                <button
                  className={`p-1 rounded-md transition-all duration-200
                    ${agenticActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => {
                    const newActive = !agenticActive;
                    setAgenticActive(newActive);
                    import('../../services/eventBus').then(({ default: eventBus }) => {
                      eventBus.publish(EVENTS.AGENTIC.MODE_CHANGED, new AgenticModeChangedEventData(newActive, panelId));
                    });
                  }}
                  title="Step By Step Mode" // Changed title for clarity
                >
                  <span className={`text-xs font-semibold ${agenticActive ? '' : 'opacity-60'}`}>{getMessage('agentButtonLabel')}</span> {/* Adjusted font and opacity */}
                </button>
                {/* The send/stop button is now part of PromptInput. If a global stop is needed, it can be added here. */}
                {/* For now, PromptInput's isLoading prop controls its internal send/stop button visibility. */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
