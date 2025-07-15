import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Switch, Select, Tooltip, message as AntdMessage, Spin } from 'antd';
import { UndoOutlined, BuildOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import EditorComponent from './EditorComponent';
import { getMessage } from '../../lang';
import { FileGroup, ConfigState, EnhancedCompletionItem } from './types';
import FileGroupSelect from './FileGroupSelect';
import { chatService } from '../../services/chatService';
import ProviderSelectors from './ProviderSelectors'; // Import the new parent component
import { codingService } from '../../services/codingService';
import eventBus, { EVENTS } from '../../services/eventBus';
import axios from 'axios';
import { ToggleInputFullscreenEventData, AgenticModeChangedEventData, ToggleWriteModeEventData, HotkeyEventData, SendMessageEventData, StopGenerationEventData } from '../../services/event_bus_data';
import CommandPanel from './CommandPanel';

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
  isCommandMode?: boolean;
  setIsCommandMode?: (value: boolean) => void;
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
  isCommandMode = false,
  setIsCommandMode = () => { },
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
  const [settings, setSetting] = useState(true);
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
    // 按照Chat -> Write -> Rule -> Command -> Chat的顺序循环切换
    if (!isWriteMode && !isRuleMode && !isCommandMode) {
      // 当前是Chat模式，切换到Write模式
      setIsWriteMode(true);
      setIsRuleMode(false);
      setIsCommandMode(false);
    } else if (isWriteMode && !isRuleMode && !isCommandMode) {
      // 当前是Write模式，切换到Rule模式
      setIsWriteMode(false);
      setIsRuleMode(true);
      setIsCommandMode(false);
    } else if (!isWriteMode && isRuleMode && !isCommandMode) {
      // 当前是Rule模式，切换到Command模式
      setIsWriteMode(false);
      setIsRuleMode(false);
      setIsCommandMode(true);
    } else {
      // 当前是Command模式，切换到Chat模式
      setIsWriteMode(false);
      setIsRuleMode(false);
      setIsCommandMode(false);
    }
  }, [isWriteMode, isRuleMode, isCommandMode, setIsWriteMode, setIsRuleMode, setIsCommandMode]);

  // 自定义发送消息函数
  const handleSendMessage = useCallback((text?: string) => {

    // 使用eventBus发送消息
    eventBus.publish(EVENTS.CHAT.SEND_MESSAGE, new SendMessageEventData(text, panelId));
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

    // 处理发送消息热键
    const handleSendHotkey = (data: HotkeyEventData) => {
      if (data.panelId !== panelId) return;
      handleSendMessage();
    };

    // 处理模式切换热键
    const handleToggleModeHotkey = (data: HotkeyEventData) => {
      console.log(data)
      if (data.panelId !== panelId) return;
      toggleWriteMode();
    };

    // 订阅热键事件
    const unsubscribeFullscreen = eventBus.subscribe(EVENTS.HOTKEY.TOGGLE_FULLSCREEN, handleToggleFullscreenHotkey);
    const unsubscribeSend = eventBus.subscribe(EVENTS.HOTKEY.SEND, handleSendHotkey);
    const unsubscribeMode = eventBus.subscribe(EVENTS.HOTKEY.TOGGLE_MODE, handleToggleModeHotkey);

    return () => {
      unsubscribeFullscreen();
      unsubscribeSend();
      unsubscribeMode();
    };
  }, [isActive, panelId, handleSendMessage, toggleWriteMode]);

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
      AntdMessage.error(getMessage('failedToFetchConfiguration'));
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
      AntdMessage.error(`${getMessage('failedToUpdate')} ${key}`);
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
      AntdMessage.error(getMessage('cancelTaskFailed'));
    } finally {
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
      AntdMessage.success(getMessage('indexBuildStarted'));

      pollIndexStatus();
    } catch (error) {
      console.error('Error building index:', error);
      AntdMessage.error(getMessage('failedToBuildIndex'));
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
          AntdMessage.success(getMessage('indexBuildCompleted'));
          clearInterval(interval);
        } else if (data.status === 'error') {
          setIndexBuilding(false);
          setIndexStatus('error');
          AntdMessage.error(`${getMessage('indexBuildFailedWithError')} ${data.error}`);
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
      {/* 顶部设置和组选择区域 */}
      <div className={`px-0.5 pt-0 ${isInputAreaMaximized ? 'mb-2 flex-shrink-0' : 'w-full'}`}>
        <div className="space-y-0 w-full">
          {/* 顶部设置区域和工具按钮 */}
          <div className="flex items-center justify-between w-full">
            <span className="text-gray-300 text-xs font-semibold">{getMessage('settingsAndGroups')}</span>
            <div className="flex items-center">
              {/* 模型选择和文件选择开发关 */}
              <Tooltip title={getMessage('settings')}>
                <button
                  onClick={() => { setSetting(!settings) }}
                  className="mr-1 p-0.5 rounded-md transition-all duration-200 text-blue-500 hover:text-blue-400 hover:bg-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </Tooltip>
              {/* 文档按钮 */}
              <Tooltip title={getMessage('openDocumentation')}>
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
              {/* 全屏切换按钮 */}
              <Tooltip title={isInputAreaMaximized ? getMessage('exitFullscreen') : getMessage('fullscreenMode')}>
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
              {/* 构建索引按钮 */}
              <Tooltip title={indexBuilding ? getMessage('buildingIndex') : getMessage('buildIndex')}>
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
              {/* 索引状态指示器 */}
              {indexStatus === 'completed' && (
                <Tooltip title={getMessage('indexBuiltSuccessfully')}>
                  <span className="mr-1 text-green-500 text-xs">✓</span>
                </Tooltip>
              )}
              {indexStatus === 'error' && (
                <Tooltip title={getMessage('indexBuildFailed')}>
                  <span className="mr-1 text-red-500 text-xs">✗</span>
                </Tooltip>
              )}
              {/* 声音开关按钮 */}
              <Tooltip title={soundEnabled ? getMessage('disableSound') : getMessage('enableSound')}>
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
        {/* 分隔线 */}
        <div className="h-[1px] bg-gray-700/50 my-1 w-full"></div>

        <div className={settings ? '' : 'hidden'}>
          {/* 提供者选择器区域 (RAG/MCPs) */}
          {!isCommandMode && <ProviderSelectors isWriteMode={isWriteMode} />}

          {/* 文件组选择器区域 */}
          {!isCommandMode && (
            <div className="w-full mt-1"> {/* Add margin top if needed */}
              <FileGroupSelect
                fileGroups={fileGroups}
                selectedGroups={selectedGroups}
                setSelectedGroups={setSelectedGroups}
                fetchFileGroups={fetchFileGroups}
                panelId={panelId}
              />
            </div>
          )}
        </div>
      </div>

      {/* 主内容区域（编辑器或命令面板） */}
      <div className={`px-1 py-0.5 overflow-hidden flex-1 flex flex-col ${isMaximized && !isInputAreaMaximized ? 'fixed inset-0 z-50 bg-gray-800' : ''} 
          scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800`}
        style={{ width: '100%' }}
      >
        {/* 编辑器/命令面板容器 */}
        <div className={`flex-1 overflow-hidden ${isInputAreaMaximized ? 'flex-grow h-full' : 'min-h-[100px]'}`}
          style={isInputAreaMaximized ? { display: 'flex', flexDirection: 'column' } : {}}
        >
          {isCommandMode ? (
            /* 命令面板模式 */
            <div className="w-full h-full bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
              <CommandPanel
                panelId={panelId}
              />
            </div>
          ) : (
            /* 编辑器模式 */
            <div className="w-full h-full">
              <EditorComponent
                isMaximized={isMaximized || isInputAreaMaximized}
                onEditorDidMount={handleEditorDidMount}
                onToggleMaximize={() => {
                  if (isInputAreaMaximized) {
                    return;
                  }
                  setIsMaximized((prev: boolean): boolean => !prev);
                }}
                panelId={panelId}
                isActive={isActive}
              />
            </div>
          )}
        </div>

        {/* 底部控制区域 */}
        <div className="flex flex-col mt-0 gap-0 flex-shrink-0">
          <div className="space-y-0 bg-gray-850 p-0.5 rounded-lg shadow-inner border border-gray-700/50">
            <div className="flex items-center justify-between px-0">
              {/* 模式选择区域 */}
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-medium text-white">{getMessage('mode')}</span>
                <Tooltip title={() => {
                  return <div className='text-[12px]'>{getMessage('switchModeTooltip')} ({navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + .)</div>
                }}>
                  <Select
                    size="small"
                    value={isCommandMode ? "command" : (isRuleMode ? "rule" : (isWriteMode ? "write" : "chat"))}
                    onChange={(value) => {
                      if (value === "rule") {
                        setIsRuleMode(true);
                        setIsWriteMode(false);
                        setIsCommandMode(false);
                      } else if (value === "command") {
                        setIsRuleMode(false);
                        setIsWriteMode(false);
                        setIsCommandMode(true);
                      } else {
                        setIsRuleMode(false);
                        setIsWriteMode(value === "write");
                        setIsCommandMode(false);
                      }
                    }}
                    options={[
                      { value: 'chat', label: 'Chat' },
                      { value: 'write', label: 'Write' },
                      { value: 'rule', label: 'Rule' },
                      { value: 'command', label: 'Command' },
                    ]}
                    style={{ width: 80 }}
                    className="text-xs mr-1"
                    popupMatchSelectWidth={false}
                  />
                </Tooltip>
                <Tooltip title={() => {
                  return <div className=' text-white text-[12px]'>
                    {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + L {getMessage('maximizeMinimizeTooltip')}

                  </div>
                }}>
                  <QuestionCircleOutlined className='text-white' />
                </Tooltip>
              </div>
              <div className='flex items-center space-x-2'>
                {/* Agent模式切换 */}
                <div className="flex items-center space-x-1 mr-1">
                  <button
                    className={`p-0.5 rounded-md transition-all duration-200
                    ${agenticActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => {
                      const newActive = !agenticActive;
                      setAgenticActive(newActive);
                      import('../../services/eventBus').then(({ default: eventBus }) => {
                        eventBus.publish(EVENTS.AGENTIC.MODE_CHANGED, new AgenticModeChangedEventData(newActive, panelId));
                      });
                    }}
                    title={getMessage('stepByStep')}
                  >
                    <span className={`text-xs ${agenticActive ? '' : 'opacity-50'}`}>{getMessage('agentButtonLabel')}</span>
                  </button>
                  <span className="text-[9px] text-gray-400 opacity-70 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    {getMessage('agentButtonLabelDesc')}
                  </span>
                </div>

                {/* 发送/停止按钮 */}
                <Tooltip title={() => {
                  return <div className=' text-white text-[12px]'>
                    {
                      sendLoading ? getMessage('clickToStop') : <>
                        {/* 快捷键提示 */}
                        <kbd className="px-0.5 py-0 mx-1 font-semibold bg-gray-800 border border-white-600 rounded shadow-sm">
                          {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + Enter
                        </kbd>
                        <span>{getMessage('toSend')}</span>
                      </>
                    }
                  </div>
                }}>
                  <button
                    className={`p-0.5 rounded-md transition-all duration-200
                    focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
                    ${sendLoading
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-blue-500 hover:text-blue-600'
                      }`}
                    onClick={sendLoading ? handleCancelGeneration : () => handleSendMessage()}
                    disabled={isCancelling}
                    title={sendLoading ? getMessage(isCancelling ? 'cancelling' : 'stop') : getMessage('send')}
                  >
                    {(() => {
                      let icon;
                      if (sendLoading) {
                        if (isCancelling) {
                          icon = (
                            <div className="relative">
                              <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          );
                        } else {
                          icon = (
                            <div className="relative">
                              <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          );
                        }
                      } else {
                        icon = (
                          <svg xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 transform rotate-45"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        );
                      }
                      return <div className="flex items-center justify-center">{icon}</div>;
                    })()}
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
