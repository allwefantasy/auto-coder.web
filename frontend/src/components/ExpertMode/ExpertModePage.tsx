import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import Split from 'react-split';
import ChatPanel from '../Sidebar/ChatPanel';
import CodeEditorPanel from '../MainContent/CodeEditorPanel';
import FileGroupPanel from '../MainContent/FileGroupPanel';
import SettingsPanel from '../MainContent/SettingsPanel';
import HistoryPanel from '../MainContent/HistoryPanel';
import TerminalManager from '../Terminal/TerminalManager';
import OutputPanel from '../Terminal/OutputPanel';
import PreviewPanel from '../MainContent/PreviewPanel'; // Import static preview panel
import EditablePreviewPanel from '../MainContent/EditablePreviewPanel';
import TodoPanel from '../MainContent/TodoPanel';
import AskUserDialog from '../AutoMode/AskUserDialog'; // Import AskUserDialog component
import { getMessage } from '../Sidebar/lang';
import { FileMetadata } from '../../types/file_meta';
import './SplitStyles.css';
import eventBus, { EVENTS } from '../../services/eventBus';
import ModalDialog from '../Common/ModalDialog';

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
  
  // 弹出框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalFormat, setModalFormat] = useState<'markdown' | 'monaco'>('markdown');
  const [modalLanguage, setModalLanguage] = useState('plaintext');
  const [modalTitle, setModalTitle] = useState('内容预览');
  
  // AskUserDialog相关状态
  const [activeAskUserMessage, setActiveAskUserMessage] = useState<any | null>(null);
  const [currentEventFileId, setCurrentEventFileId] = useState<string | null>(null);
  
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
  
  // 监听ASK_USER事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.CHAT.NEW_MESSAGE, (message) => {
      // 处理用户询问类型的消息
      if (message.type === 'ASK_USER') {
        const askUserMessage = {
          ...message,
          id: message.id || `msg-${Date.now()}`,
          timestamp: Date.now()
        };
        setActiveAskUserMessage(askUserMessage);
      }
      
      // 如果消息包含event_file_id，保存它以便用于用户响应
      if (message.event_file_id && !currentEventFileId) {
        setCurrentEventFileId(message.event_file_id);
      }
    });
    
    return () => {
      unsubscribe();
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
      setModalTitle(data.title || '内容预览');
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
      // 可以通过eventBus发送错误消息
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
          onClose={() => setActiveAskUserMessage(null)}
        />
      )}
      
      <Split 
        className="flex-1 flex"
        sizes={[25, 75]}
        minSize={[180, 400]}
        gutterSize={3}
        snapOffset={20}
      >
        {/* Left Sidebar - Chat */}
        <div className="border-r border-gray-700 flex flex-col">
          <ChatPanel
            setPreviewFiles={setPreviewFiles}
            setActivePanel={setActivePanel}
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
              sizes={[75, 25]}
              minSize={[180, 80]}
              gutterSize={5}
              snapOffset={20}
              dragInterval={1}
              cursor="row-resize"
              className="split-vertical"
              onDragEnd={() => {
                // 触发resize事件以更新Terminal大小
                window.dispatchEvent(new Event('resize'));
              }}
            >
              {/* Upper Section - 顶部内容区域 */}
              <div className="flex flex-col overflow-hidden">
                {/* Panel Switch Buttons */}
                <div className="bg-gray-800 p-2 border-b border-gray-700">
                  <div className="flex space-x-2">
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 
                        ${activePanel === 'todo'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                        } flex items-center space-x-2`}
                      onClick={() => setActivePanel('todo')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span>{getMessage('todos')}</span>
                    </button>
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
                    {/* Static Preview Button */}
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300
                        ${activePanel === 'preview_static'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5'
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                        } flex items-center space-x-1`} // Reduced space for icon+text
                      onClick={() => setActivePanel('preview_static')}
                      title={getMessage('previewChangesStatic')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>{getMessage('previewChangesStatic')}</span>
                    </button>
                    {/* Editable Preview Button */}
                    <button
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300
                        ${activePanel === 'preview_editable'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 hover:from-purple-600 hover:to-pink-700 transform hover:-translate-y-0.5' // Different color scheme
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                        } flex items-center space-x-1`} // Reduced space for icon+text
                      onClick={() => setActivePanel('preview_editable')}
                      title={getMessage('previewChangesEditable')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      <span>{getMessage('previewChangesEditable')}</span>
                    </button>
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
                          className="absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          <div className="py-1">
                            <button
                              className={`w-full px-4 py-2 text-sm flex items-center space-x-2 ${
                                activePanel === 'clipboard'
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
                  <div className={`h-full ${activePanel === 'filegroup' ? 'block' : 'hidden'}`}>
                    <FileGroupPanel />
                  </div>
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
                  {/* Static Preview Panel */}
                  <div className={`h-full ${activePanel === 'preview_static' ? 'block' : 'hidden'}`}>
                    <PreviewPanel files={previewFiles} />
                  </div>
                  {/* Editable Preview Panel */}
                  <div className={`h-full ${activePanel === 'preview_editable' ? 'block' : 'hidden'}`}>
                    {/* Pass the same files prop */}
                    <EditablePreviewPanel files={previewFiles} />
                  </div>
                  <div className={`h-full ${activePanel === 'history' ? 'block' : 'hidden'}`}>
                    <HistoryPanel />
                  </div>
                  <div className={`h-full ${activePanel === 'settings' ? 'block' : 'hidden'}`}>
                    <SettingsPanel />
                  </div>
                  <div className={`h-full ${activePanel === 'todo' ? 'block' : 'hidden'}`}>
                    <TodoPanel />
                  </div>
                </div>
              </div>

              {/* Lower Section - Tool Panels */}
              <div className="border-t border-gray-700 flex flex-col overflow-hidden">
                {/* Tool Panel Navigation */}
                <div className="bg-[#1f1f1f] border-b border-gray-700 px-2">
                  <div className="flex items-center gap-1">
                    {['Output', 'Terminal'].map((tab, index) => (
                      <button
                        key={tab}
                        className={`px-2 py-0.5 text-xs rounded-t transition-colors ${activeToolPanel === tab.toLowerCase()
                            ? 'text-white bg-[#2d2d2d]'
                            : 'text-gray-400 hover:text-white'
                          }`}
                        onClick={() => setActiveToolPanel(tab.toLowerCase())}
                      >
                        {tab}
                      </button>
                    ))}
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
