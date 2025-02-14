import React from 'react';
import { Switch, Select, Button, Tooltip } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';
import { getMessage } from '../../lang';
import { ConfigState, FileGroup } from '../../types';

interface InputAreaProps {
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  config: ConfigState;
  updateConfig: (key: string, value: boolean | string) => Promise<void>;
  selectedGroups: string[];
  setSelectedGroups: (groups: string[]) => void;
  fileGroups: FileGroup[];
  fetchFileGroups: () => Promise<void>;
  isMaximized: boolean;
  setIsMaximized: (maximized: boolean) => void;
  isWriteMode: boolean;
  setIsWriteMode: (writeMode: boolean) => void;
  editorRef: React.RefObject<any>;
  handleEditorDidMount: (editor: any, monaco: any) => void;
  sendLoading: boolean;
  handleSendMessage: () => Promise<void>;
  handleRevert: () => Promise<void>;
  pendingRevert: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({
  showConfig,
  setShowConfig,
  config,
  updateConfig,
  selectedGroups,
  setSelectedGroups,
  fileGroups,
  fetchFileGroups,
  isMaximized,
  setIsMaximized,
  isWriteMode,
  setIsWriteMode,
  editorRef,
  handleEditorDidMount,
  sendLoading,
  handleSendMessage,
  handleRevert,
  pendingRevert
}) => {
  return (
    <div className="bg-gray-800 border-t border-gray-700">
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

            {/* Project Type Select */}
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
                onChange={(values)

ntdMessage.error('Failed to get last action information');
      addBotMessage(getMessage('getLastActionError'));
      console.error('Error getting last action:', error);
    }
  };

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      status: 'sending',
      timestamp: Date.now()
    };
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      if (newMessages.length > 0 && chatListName) {
        saveChatList(chatListName, newMessages);
      }
      return newMessages;
    });
    return newMessage.id;
  };

  const addBotMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'bot',
      content,
      timestamp: Date.now()
    };
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      if (newMessages.length > 0 && chatListName) {
        saveChatList(chatListName, newMessages);
      }
      return newMessages;
    });
    return newMessage.id;
  };

  const handleSendMessage = async () => {
    const trimmedText = editorRef.current?.getValue()?.trim();
    if (!trimmedText) {
      AntdMessage.warning('Please enter a message');
      return;
    }

    const messageId = addUserMessage(trimmedText);
    editorRef.current?.setValue("");

    if (pendingRevert) {
      const isConfirmed = ['confirm', '确认'].includes(trimmedText.toLowerCase());
      if (isConfirmed) {
        try {
          const response = await fetch('/api/revert', { method: 'POST' });
          if (!response.ok) throw new Error('Failed to revert changes');

          const data = await response.json();
          if (data.status) {
            AntdMessage.success('Changes reverted successfully');
            addBotMessage(getMessage('revertSuccess'));
          } else {
            AntdMessage.error(data.message);
            addBotMessage(getMessage('revertFailure', { message: data.message }));
          }

          setPreviewFiles([]);
          setActivePanel('code');
        } catch (error) {
          AntdMessage.error('Failed to revert changes');
          addBotMessage(getMessage('revertError'));
          console.error('Error reverting changes:', error);
        }
      } else {
        addBotMessage(getMessage('revertCancelled'));
      }
      setPendingRevert(false);
      updateMessageStatus(messageId, 'sent');
      return;
    }

    setSendLoading(true);

    try {
      const endpoint = isWriteMode ? '/api/coding' : '/api/chat';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedText })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      if (data.request_id) {
        updateMessageStatus(messageId, 'sent');
        setRequestId(data.request_id);
        
        if (isWriteMode) {
          const { final_status } = await pollEvents(data.request_id);
          if (final_status === 'completed') {
            addBotMessage(getMessage('codeModificationComplete'));
          } else {
            addBotMessage(getMessage('codeModificationFailed'));
          }
          setRequestId("");
        } else {
          const messageBotId = addBotMessage("");
          await pollStreamResult(data.request_id, (newText) => {
            setMessages(prev => prev.map(msg =>
              msg.id === messageBotId ? { ...msg, content: newText } : msg
            ));
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      AntdMessage.error('Failed to send message');
      updateMessageStatus(messageId, 'error');
      addBotMessage(getMessage('processingError'));
    } finally {
      setSendLoading(false);
    }
  };

  const updateMessageStatus = (messageId: string, status: 'sending' | 'sent' | 'error') => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status }
          : msg
      )
    );
  };

  const pollEvents = async (requestId: string) => {
    let final_status = 'completed';
    while (true) {
      try {
        const response = await fetch('/api/event/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId })
        });

        if (!response.ok) throw new Error('Failed to fetch events');

        const eventData = await response.json();
        if (!eventData) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        await handleEvent(eventData, requestId);
        
        if (eventData.event_type === 'code_end' || 
            eventData.event_type === 'code_error') {
          break;
        }
      } catch (error) {
        final_status = 'failed';
        console.error('Error polling events:', error);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { final_status };
  };

  const pollStreamResult = async (requestId: string, onUpdate: (text: string) => void) => {
    let status: 'running' | 'completed' | 'failed' = 'running';

    while (status === 'running') {
      try {
        const response = await fetch(`/api/result/${requestId}`);
        if (!response.ok) {
          status = 'failed';
          break;
        }

        const data = await response.json();
        status = data.status;

        if (config.human_as_model && !isWriteMode) {
          if ('value' in data.result && Array.isArray(data.result.value)) {
            const result = data.result.value.join('');
            if (status === 'completed') {
              setActivePanel('clipboard');
              setClipboardContent(result);
              onUpdate(getMessage("humanAsModelInstructions"));
              break;
            }
          }
        } else {
          if ('value' in data.result) {
            const result = Array.isArray(data.result.value) 
              ? data.result.value.join('') 
              : data.result.value;
            onUpdate(result);
          }
        }

        if (status === 'completed') break;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error polling result:', error);
        status = 'failed';
      }
    }
  };

  const handleEvent = async (eventData: any, requestId: string) => {
    const response_event = async (response: string) => {
      await fetch('/api/event/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          event: eventData,
          response: response
        })
      });
    };

    switch (eventData.event_type) {
      case 'code_start':
      case 'code_end':
        await response_event("proceed");
        break;

      case 'code_error':
        await response_event("proceed");
        break;

      case 'code_unmerge_result':
      case 'code_merge_result':
        await response_event("proceed");
        const blocks = JSON.parse(eventData.data);
        const previewData = blocks.map((block: any) => ({
          path: block.file_path,
          content: `<<<<<<< SEARCH(${block.similarity})\n${block.head}\n=======\n${block.update}\n>>>>>>> REPLACE`
        }));
        setPreviewFiles(previewData);
        setActivePanel('preview');
        break;

      // Add other event type handlers as needed
    }
  };

  return {
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
  };
};

export default useMessageHandling;