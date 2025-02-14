import { useState, useRef } from 'react';
import { Message, ConfigState } from '../../types';
import { message as AntdMessage } from 'antd';
import { getMessage } from '../../lang';

interface UseMessageHandlingProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  config: ConfigState;
  setActivePanel: (panel: string) => void;
  setPreviewFiles: (files: any[]) => void;
  setRequestId: (id: string) => void;
  setClipboardContent: (content: string) => void;
  clipboardContent: string;
  chatListName: string;
  saveChatList: (name: string, messages: Message[]) => Promise<void>;
}

const useMessageHandling = ({
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
}: UseMessageHandlingProps) => {
  const [sendLoading, setSendLoading] = useState(false);
  const [isWriteMode, setIsWriteMode] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [pendingRevert, setPendingRevert] = useState(false);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      setIsMaximized(prev => !prev);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleSendMessage();
    });

    // Register completion provider
    monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['@'],
      provideCompletionItems: async (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const word = model.getWordUntilPosition(position);
        const prefix = textUntilPosition.charAt(word.startColumn - 2);
        const double_prefix = textUntilPosition.charAt(word.startColumn - 3);
        const wordText = word.word;

        if (prefix === "@" && double_prefix === "@") {
          const response = await fetch(`/api/completions/symbols?name=${encodeURIComponent(wordText)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: any) => ({
              label: item.display,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: item.path,
              detail: "",
              documentation: `Location: ${item.path}`,
            })),
            incomplete: true
          };
        } else if (prefix === "@") {
          const response = await fetch(`/api/completions/files?name=${encodeURIComponent(wordText)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: any) => ({
              label: item.display,
              kind: monaco.languages.CompletionItemKind.File,
              insertText: item.path,
              detail: "",
              documentation: `Location: ${item.location}`,
            })),
            incomplete: true
          };
        }

        return { suggestions: [] };
      },
    });
  };

  const handleRevert = async () => {
    try {
      const yamlResponse = await fetch('/api/last-yaml');
      if (!yamlResponse.ok) {
        throw new Error('Failed to get last action information');
      }

      const yamlData = await yamlResponse.json();
      if (!yamlData.status) {
        AntdMessage.error(yamlData.message);
        addBotMessage(yamlData.message);
        return;
      }

      const query = yamlData.content.query;
      if (!query) {
        AntdMessage.error('No query found in the last action');
        addBotMessage(getMessage('noQueryFound'));
        return;
      }

      addBotMessage(getMessage('revertConfirmation', { query }));
      setPendingRevert(true);

    } catch (error) {
      A

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

    // Handle revert confirmation
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
        setRequestId(data.request_id);
        if (!isWriteMode) {
          const messageBotId = addBotMessage("");
          await pollStreamResult(data.request_id, (newText) => {
            setMessages(prev => prev.map(msg =>
              msg.id === messageBotId ? { ...msg, content: newText || "typing..." } : msg
            ));
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      AntdMessage.error('Failed to send message');
      addBotMessage(getMessage('processingError'));
    } finally {
      setSendLoading(false);
    }
  };

  const pollStreamResult = async (requestId: string, onUpdate: (text: string) => void) => {
    let result = '';
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
            const newText = data.result.value.join('');
            if (newText !== result) {
              result += newText;
            }
          }
          if (status === 'completed') {
            setActivePanel('clipboard');
            setClipboardContent(result);
            onUpdate(getMessage("humanAsModelInstructions"));
            break;
          }
        } else {
          if ('value' in data.result) {
            const newText = Array.isArray(data.result.value) 
              ? data.result.value.join('') 
              : data.result.value;
            if (newText !== result) {
              result = newText;
              onUpdate(result);
            }
          }
        }

        if (status === 'completed') break;
        if (status === 'running') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error polling result:', error);
        status = 'failed';
      }
    }

    return { text: result, status };
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