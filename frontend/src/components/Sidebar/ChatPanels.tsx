import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import { FileMetadata } from '../../types/file_meta';
import { getMessage } from './lang';

// 定义单个聊天面板的配置接口
interface ChatTabConfig {
  id: string;
  name: string;
}

interface ChatPanelsProps {
  setPreviewFiles: (files: { path: string, content: string }[]) => void;
  setActivePanel: (panel: string) => void;
  setClipboardContent: (content: string) => void;
  clipboardContent: string;
  setRequestId: (id: string) => void;
  projectName: string;
  setSelectedFiles: (files: FileMetadata[]) => void;
}

const ChatPanels: React.FC<ChatPanelsProps> = ({
  setPreviewFiles,
  setActivePanel,
  setClipboardContent,
  clipboardContent,
  setRequestId,
  projectName,
  setSelectedFiles
}) => {
  // 默认聊天标签页配置
  const defaultTabs: ChatTabConfig[] = [
    { id: 'main', name: getMessage('mainChat') || '主聊天' },
    { id: 'secondary', name: getMessage('secondaryChat') || '辅助聊天' }
  ];
  
  const [tabs, setTabs] = useState<ChatTabConfig[]>(defaultTabs);
  const [activeTabId, setActiveTabId] = useState<string>(defaultTabs[0].id);
  const [isAddingTab, setIsAddingTab] = useState<boolean>(false);
  const [newTabName, setNewTabName] = useState<string>('');

  // 添加新标签页
  const handleAddTab = () => {
    if (newTabName.trim()) {
      const newTabId = `chat-${Date.now()}`;
      setTabs([...tabs, { id: newTabId, name: newTabName.trim() }]);
      setActiveTabId(newTabId);
      setNewTabName('');
      setIsAddingTab(false);
    }
  };

  // 删除标签页
  const handleRemoveTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return; // 至少保留一个标签页

    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // 如果关闭的是当前活动标签页，则切换到第一个标签页
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧标签栏 */}
      <div className="flex-shrink-0 w-10 bg-gray-900 border-r border-gray-700 flex flex-col">
        {/* 标签列表 */}
        <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col items-center py-2 gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`w-8 h-8 rounded-md flex items-center justify-center group relative ${
                activeTabId === tab.id 
                  ? 'bg-gray-800 text-blue-400 border-l-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
              onClick={() => setActiveTabId(tab.id)}
              title={tab.name}
            >
              {/* 显示标签名的第一个字符作为图标 */}
              <span className="text-xs font-medium">{tab.name.charAt(0).toUpperCase()}</span>
              
              {/* 悬浮显示删除按钮 */}
              {tabs.length > 1 && (
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 rounded-full text-gray-500 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemoveTab(tab.id, e)}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </button>
          ))}
        </div>
        
        {/* 添加新标签页按钮 */}
        <div className="p-2 flex justify-center border-t border-gray-700">
          {isAddingTab ? (
            <div className="absolute bottom-14 left-10 bg-gray-800 p-2 rounded shadow-lg border border-gray-700 z-10 flex flex-col gap-2">
              <input
                type="text"
                className="w-32 bg-gray-700 text-white text-xs px-2 py-1 rounded outline-none border border-gray-600 focus:border-blue-500"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTab()}
                placeholder={getMessage('newChatName') || "新聊天名称"}
                autoFocus
              />
              <div className="flex justify-between">
                <button 
                  className="text-green-500 hover:text-green-400 px-2 py-1 text-xs"
                  onClick={handleAddTab}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  className="text-red-500 hover:text-red-400 px-2 py-1 text-xs"
                  onClick={() => setIsAddingTab(false)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-6 h-6 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-800/50 flex items-center justify-center"
              onClick={() => setIsAddingTab(true)}
              title={getMessage('addNewChat') || "添加新聊天"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 右侧聊天面板内容 */}
      <div className="flex-1 overflow-hidden">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
          >
            <ChatPanel
              setPreviewFiles={setPreviewFiles}
              setActivePanel={setActivePanel}
              setClipboardContent={setClipboardContent}
              clipboardContent={clipboardContent}
              setRequestId={setRequestId}
              projectName={`${projectName}${tabs.length > 1 ? ` (${tab.name})` : ''}`}
              setSelectedFiles={setSelectedFiles}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatPanels; 