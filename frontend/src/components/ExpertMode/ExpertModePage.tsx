import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react'; // Import Suspense and lazy
import { Editor } from '@monaco-editor/react';
import Split from 'react-split';
import { Tooltip } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import ChatPanels from '../Sidebar/ChatPanels';
import CodeEditorPanel from '../MainContent/CodeEditorPanel';
import FileGroupPanel from '../MainContent/FileGroupPanel';
import SettingsPanel from '../MainContent/SettingsPanel';
// Lazy load HistoryPanel
const HistoryPanel = lazy(() => import('../MainContent/HistoryPanel'));
import TerminalManager from '../Terminal/TerminalManager';
import OutputPanel from '../Terminal/OutputPanel';
import PreviewPanel from '../MainContent/PreviewPanel'; // Import static preview panel
import TodoPanel from '../MainContent/TodoPanel';
import AskUserDialog from '../AutoMode/AskUserDialog'; // Import AskUserDialog component
import { getMessage } from '../../lang';
import { FileMetadata } from '../../types/file_meta';
import './SplitStyles.css';
import eventBus, { EVENTS } from '../../services/eventBus';
import ModalDialog from '../Common/ModalDialog';
// 导入声音播放函数
import { playTaskComplete } from '../AutoMode/utils/SoundEffects';

// Define the possible panel types, including the new split preview types
type ActivePanelType = 'todo' | 'code' | 'filegroup' | 'preview_static' | 'preview_editable' | 'clipboard' | 'history' | 'settings';

interface ExpertModePageProps {
  projectName: string;
  activePanel: ActivePanelType;
  setActivePanel: (panel: ActivePanelType) => void;
  clipboardContent: string;
  setClipboardContent: (content: string) => void;
  previewFiles: { path: string, content: string }[];
  setPreviewFiles: (files: { path: string, content: string }[]) => void;
  requestId: string;
  setRequestId: (id: string) => void;
  selectedFiles: FileMetadata[];
  onSwitchToAutoMode: () => void;
  setSelectedFiles: (files: FileMetadata[]) => void;
}

const ExpertModePage: React.FC<ExpertModePageProps> = ({
  projectName,
  activePanel,
  setActivePanel,
  clipboardContent,
  setClipboardContent,
  previewFiles,
  setPreviewFiles,
  requestId,
  setRequestId,
  selectedFiles,
  onSwitchToAutoMode,
  setSelectedFiles
}) => {
  const [activeToolPanel, setActiveToolPanel] = useState<string>('terminal');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [isFull, setFull] = useState(false);

  // 新增状态：跟踪分割面板的尺寸和折叠状态
  const [splitSizes, setSplitSizes] = useState([75, 25]);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(false);

  // 弹出框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalFormat, setModalFormat] = useState<'markdown' | 'monaco'>('markdown');
  const [modalLanguage, setModalLanguage] = useState('plaintext');
  const [modalTitle, setModalTitle] = useState(getMessage('contentPreview'));

  // AskUserDialog相关状态
  const [activeAskUserMessage, setActiveAskUserMessage] = useState<any | null>(null);
  const [currentEventFileId, setCurrentEventFileId] = useState<string | null>(null);

  // 处理编辑器全屏切换
  const toggleFullscreen = () => {
    setFull(!isFull)
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  // 处理拖拽变化，检查终端区域是否被拖到底部
  const handleSplitChange = (sizes: any) => {
   
    setSplitSizes(sizes);
    // 如果下方面板的大小小于等于8%，认为已经拖到底部
    const isMinimized = sizes[1] <= 3;
    setIsTerminalMinimized(isMinimized);

    // 触发resize事件以更新Terminal大小
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  };

  // 切换终端区域展开/收起状态
  const toggleTerminalExpand = () => {
    if (isTerminalMinimized) {
      // 展开：恢复到默认大小
      setSplitSizes([75, 25]);
      setIsTerminalMinimized(false);
    } else {
      // 收起：设置为最小高度
      setSplitSizes([98, 2]);
      setIsTerminalMinimized(true);
    }

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  };

  // 添加对requestId变化的监听，更新currentEventFileId
  useEffect(() => {
    if (requestId) {
      setCurrentEventFileId(requestId);
      console.log('ExpertModePage: Updated currentEventFileId from requestId:', requestId);
    }
  }, [requestId]);

  // 更新modalTitle的初始化，确保使用多语言
  useEffect(() => {
    setModalTitle(getMessage('contentPreview'));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.tools-dropdown-container') && showToolsDropdown) {
        setShowToolsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolsDropdown]);

  // Listen for panel activation events
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.UI.ACTIVATE_PANEL, (panelName) => {
      if (panelName === 'history') {
        setActivePanel('history');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setActivePanel]);

  // 监听消息事件，只通过 eventBus 接收消息
  useEffect(() => {
    // 订阅新消息事件，包括 ASK_USER 和带有 event_file_id 的消息
    const unsubscribeNewMessage = eventBus.subscribe(EVENTS.CHAT.NEW_MESSAGE, (message: any) => {
      console.log('ExpertModePage: Received message via eventBus:', message.type);

      // 处理用户询问类型的消息
      if (message.type === 'ASK_USER') {
        const askUserMessage = {
          ...message,
          id: message.id || `msg-${Date.now()}`,
          timestamp: Date.now()
        };
        setActiveAskUserMessage(askUserMessage);
        // 弹窗出现时播放声音
        try {
          playTaskComplete();
        } catch (e) {
          // 忽略播放声音异常，避免影响主流程
        }
        console.log('ExpertModePage: Set activeAskUserMessage from eventBus');
      }

      // 从消息中提取 event_file_id
      if (message.event_file_id && !currentEventFileId) {
        setCurrentEventFileId(message.event_file_id);
        console.log('ExpertModePage: Set currentEventFileId from message:', message.event_file_id);
      }

      // 从消息元数据中提取 event_file_id
      if (message.metadata?.event_file_id && !currentEventFileId) {
        setCurrentEventFileId(message.metadata.event_file_id);
        console.log('ExpertModePage: Set currentEventFileId from message metadata:', message.metadata.event_file_id);
      }
    });

    return () => {
      unsubscribeNewMessage();
    };
  }, [currentEventFileId]);

  // 订阅显示弹出框事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.UI.SHOW_MODAL, (data: {
      content: string;
      format: 'markdown' | 'monaco';
      language?: string;
      title?: string;
    }) => {
      setModalContent(data.content);
      setModalFormat(data.format);
      setModalLanguage(data.language || 'plaintext');
      setModalTitle(data.title || getMessage('contentPreview'));
      setModalOpen(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 处理用户对ASK_USER事件的响应
  const handleUserResponse = async (response: string, eventId?: string) => {
    if (!eventId) {
      console.error('Cannot respond to event: No event ID provided');
      return;
    }

    if (!currentEventFileId) {
      console.error('Cannot respond to event: No event file ID available');
      return;
    }

    // 如果匹配事件ID，关闭活动的ASK_USER对话框
    if (activeAskUserMessage?.eventId === eventId) {
      setActiveAskUserMessage(null);
    }

    try {
      console.log('ExpertModePage: Sending response to event:', {
        event_id: eventId,
        event_file_id: currentEventFileId,
        response: response
      });

      // 将响应发送回服务器
      const result = await fetch('/api/auto-command/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          event_file_id: currentEventFileId,
          response: response
        })
      });

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(`Failed to send response: ${errorData.detail || result.statusText}`);
      }

      console.log('Response sent successfully to event:', eventId);
    } catch (error) {
      console.error('Error sending response to server:', error);
      // 通过eventBus发送错误消息
      eventBus.publish(EVENTS.CHAT.NEW_MESSAGE, {
        type: 'ERROR',
        content: `Failed to send your response to the server: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const toggleToolsDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowToolsDropdown(!showToolsDropdown);
  };

  return (
    <>
      {/* 用户询问对话框 - 当需要用户输入时显示的模态框 */}
      {activeAskUserMessage && (
        <AskUserDialog
          message={activeAskUserMessage}
          onResponse={handleUserResponse}
          onClose={() => { }}
        />
      )}

      <Split
        className="flex-1 flex"
        sizes={[32, 68]}
        minSize={[0, 400]}
        gutterSize={3}
        snapOffset={100}
      >
        {/* Left Sidebar - Chat */}
        <div className="border-r border-gray-700 flex flex-col">
          <ChatPanels
            setPreviewFiles={setPreviewFiles}
            setActivePanel={setActivePanel as any}
            setClipboardContent={setClipboardContent}
            clipboardContent={clipboardContent}
            setRequestId={setRequestId}
            projectName={projectName}
            setSelectedFiles={setSelectedFiles}
          />
        </div>

        {/* Right Content Area */}
        <div className="relative flex flex-col flex-grow h-full w-full overflow-hidden">
          <div className="absolute inset-0">
            <Split
              direction="vertical"
              sizes={splitSizes}
              minSize={[180, 20]}
              gutterSize={5}
              snapOffset={100}
              dragInterval={1}
              cursor="row-resize"
              className="split-vertical"
              onDragEnd={handleSplitChange}
            >
              {/* Upper Section - 顶部内容区域 */}
              <div className="flex flex-col overflow-hidden">
                {/* Panel Switch Buttons */}
                <div className="bg-gray-800 p-2 border-b border-gray-700">
                  <div className="flex space-x-2">
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                        ${activePanel === 'history'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                        } flex items-center space-x-2`}
                      onClick={() => setActivePanel('history')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{getMessage('devHistory')}</span>
                    </button>
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                        ${activePanel === 'code'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                        } flex items-center space-x-2`}
                      onClick={() => setActivePanel('code')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>{getMessage('codeViewer')}</span>
                    </button>
                    {/* Static Preview Button - 预览功能已屏蔽 */}
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 opacity-50 cursor-not-allowed
                        bg-gray-800/60 text-gray-500 flex items-center space-x-1`} // Reduced space for icon+text
                      onClick={() => {
                        // 预览功能已屏蔽 - 不执行任何操作
                        console.log('预览功能已被屏蔽');
                      }}
                      title="预览功能暂时不可用"
                      disabled
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>{getMessage('previewChangesStatic')}</span>
                    </button>
                    {/* Editable Preview Button moved to More dropdown */}
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300
                        ${activePanel === 'filegroup'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                        } flex items-center space-x-2`}
                      onClick={() => setActivePanel('filegroup')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span>{getMessage('fileGroups')}</span>
                    </button>
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                        ${activePanel === 'settings'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                        } flex items-center space-x-2`}
                      onClick={() => setActivePanel('settings')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{getMessage('settings')}</span>
                    </button>
                    <div className="relative tools-dropdown-container">
                      <button
                        className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                          ${activePanel === 'clipboard'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                            : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                          } flex items-center space-x-2`}
                        onClick={toggleToolsDropdown}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>{getMessage('more')}</span>
                      </button>
                      {showToolsDropdown && (
                        <div
                          className="absolute z-[9999] mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                          style={{ zIndex: 9999 }}
                        >
                          <div className="py-1">
                            <button
                              className={`w-full px-4 py-2 text-sm flex items-center space-x-2 ${activePanel === 'clipboard'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-700'
                                }`}
                              onClick={() => {
                                setActivePanel('clipboard');
                                setShowToolsDropdown(false);
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span>{getMessage('clipboard')}</span>
                            </button>

                            <button
                              className={`w-full px-4 py-2 text-sm flex items-center space-x-2 ${activePanel === 'todo'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-700'
                                }`}
                              onClick={() => {
                                setActivePanel('todo');
                                setShowToolsDropdown(false);
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              <span>{getMessage('todos')}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className={`h-full ${activePanel === 'code' ? 'block' : 'hidden'}`}>
                    <CodeEditorPanel selectedFiles={selectedFiles} />
                  </div>
                  {activePanel === 'filegroup' ? <div className={`h-full`}>
                    <FileGroupPanel />
                  </div> : null}
                  <div className={`h-full ${activePanel === 'clipboard' ? 'block' : 'hidden'}`}>
                    <div className="h-full p-4">
                      <Editor
                        theme="vs-dark"
                        height="100%"
                        value={clipboardContent}
                        onChange={(value) => setClipboardContent(value || '')}
                        defaultLanguage="plaintext"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                  {/* Static Preview Panel - 预览功能已屏蔽 */}
                  <div className={`h-full ${activePanel === 'preview_static' ? 'block' : 'hidden'}`}>
                    <div className="h-full flex items-center justify-center bg-gray-900">
                      <div className="text-center text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} />
                        </svg>
                        <p className="text-lg font-medium mb-2">预览功能暂时不可用</p>
                        <p className="text-sm">该功能正在维护中，请稍后再试</p>
                      </div>
                    </div>
                    {/* 原始预览组件已屏蔽 */}
                    {/* <PreviewPanel files={previewFiles} /> */}
                  </div>
=======
                  <div className={`h-full ${activePanel === 'history' ? 'block' : 'hidden'}`}>
                    {/* Wrap HistoryPanel with Suspense for lazy loading */}
                    <Suspense fallback={<div className='p-4 text-gray-400 text-center'>{getMessage('loadingHistory')}</div>}>
                      <HistoryPanel />
                    </Suspense>
                  </div>
                  <div className={`h-full ${activePanel === 'settings' ? 'block' : 'hidden'}`}>
                    <SettingsPanel />
                  </div>
                  <div className={`h-full ${activePanel === 'todo' ? 'block' : 'hidden'}`}>
                    <TodoPanel />
                  </div>
                </div>
              </div>

              {/* 输出，终端区域*/}
              <div className={`border-t border-gray-700 flex flex-col overflow-hidden ${isFull ? 'fixed left-0 top-0 w-full !h-full z-[9999] p-0' : ''}`}>
                {/* Tool Panel Navigation */}
                <div className="bg-[#1f1f1f] border-b border-gray-700 px-2">
                  <div className="flex items-center justify-between gap-1">
                    <div>
                      {[
                        { key: 'output', label: getMessage('output') },
                        { key: 'terminal', label: getMessage('terminal') }
                      ].map((tab, index) => (
                        <button
                          key={tab.key}
                          className={`px-2 py-0.5 text-xs rounded-t transition-colors ${activeToolPanel === tab.key
                            ? 'text-white bg-[#2d2d2d]'
                            : 'text-gray-400 hover:text-white'
                            }`}
                          onClick={() => setActiveToolPanel(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}

                    </div>

                    <div className='flex items-center pr-2'>
                      {/* 全屏切换按钮 - 当终端区域被最小化时隐藏 */}
                      {!isTerminalMinimized && (
                        <Tooltip  placement='topLeft' title={isFull ? getMessage('exitFullscreen') : getMessage('fullscreenMode')}>
                          <button
                            onClick={toggleFullscreen}
                            className="mr-1 p-0.5 rounded-md transition-all duration-200  text-white hover:bg-gray-700"
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
                              {isFull ? (
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
                      )}

                      {/* 展开/收起箭头按钮 */}
                      <Tooltip placement='topLeft' title={isTerminalMinimized ? getMessage('expandTerminal') : getMessage('collapseTerminal')}>
                        <button
                          onClick={toggleTerminalExpand}
                          className="ml-2 mr-1 p-0 rounded-md transition-all duration-200 text-white hover:bg-gray-700"
                        >
                          {isTerminalMinimized ? (
                            <UpOutlined style={{ fontSize: '14px' }} />
                          ) : (
                            <DownOutlined style={{ fontSize: '14px' }} />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Tool Panel Content */}
                <div className="flex-1 bg-[#2d2d2d] overflow-auto">
                  {/* Output Panel */}
                  <div className={`h-full ${activeToolPanel === 'output' ? 'block' : 'hidden'}`}>
                    <OutputPanel requestId={requestId} />
                  </div>

                  {/* Terminal Panel */}
                  <div className={`h-full ${activeToolPanel === 'terminal' ? 'block' : 'hidden'}`}>
                    <TerminalManager />
                  </div>
                </div>
              </div>
            </Split>
          </div>
        </div>
      </Split>

      {/* 弹出框组件 */}
      <ModalDialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        content={modalContent}
        format={modalFormat}
        language={modalLanguage}
        title={modalTitle}
      />
    </>
  );
};

export default ExpertModePage;