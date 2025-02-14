import React from 'react';
import { ChatPanelProps } from '../types';
import useChatState from './hooks/useChatState';
import useConfigState from './hooks/useConfigState';
import useMessageHandling from './hooks/useMessageHandling';
import ChatMessages from './components/ChatMessages';
import InputArea from './components/InputArea';

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  setPreviewFiles, 
  setRequestId, 
  setActivePanel, 
  setClipboardContent, 
  clipboardContent 
}) => {
  const {
    messages,
    setMessages,
    chatLists,
    setChatLists,
    chatListName,
    setChatListName,
    showChatListInput,
    setShowChatListInput,
    handleNewChat,
    saveChatList,
    loadChatList,
    deleteChatList,
    fetchChatLists
  } = useChatState();

  const {
    showConfig,
    setShowConfig,
    config,
    setConfig,
    selectedGroups,
    setSelectedGroups,
    fileGroups,
    updateConfig,
    fetchFileGroups
  } = useConfigState();

  const {
    sendLoading,
    isWriteMode,
    setIsWriteMode,
    isMaximized,
    setIsMaximized,
    editorRef,
    handleEditorDidMount,
    handleSendMessage,
    pendingRevert,
    setPendingRevert,
    handleRevert
  } = useMessageHandling({
    messages,
    setMessages,
    config,
    setActivePanel,
    setPreviewFiles,
    setRequestId,
    setClipboardContent,
    clipboardContent,
    chatListName,
    saveChatList
  });

  return (
    <div className="flex flex-col h-full">
      <ChatMessages 
        messages={messages} 
        handleNewChat={handleNewChat}
      />
      <InputArea
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        config={config}
        updateConfig={updateConfig}
        selectedGroups={selectedGroups}
        setSelectedGroups={setSelectedGroups}
        fileGroups={fileGroups}
        fetchFileGroups={fetchFileGroups}
        isMaximized={isMaximized}
        setIsMaximized={setIsMaximized}
        isWriteMode={isWriteMode}
        setIsWriteMode={setIsWriteMode}
        editorRef={editorRef}
        handleEditorDidMount={handleEditorDidMount}
        sendLoading={sendLoading}
        handleSendMessage={handleSendMessage}
        handleRevert={handleRevert}
        pendingRevert={pendingRevert}
      />
    </div>
  );
};

export default ChatPanel;