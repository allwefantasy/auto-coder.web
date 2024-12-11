import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Markdown } from './Markdown';
import { Select, Switch, message as AntdMessage, Tooltip } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';
import { getMessage } from './lang';

const CONFIRMATION_WORDS = ['confirm', '确认'] as const;

interface FileGroup {
  id: string;
  name: string;
  files: string[];
}

interface CodeBlock {
  file_path: string;
  head: string;
  update: string;
  similarity: number;
}

interface UnmergeCodeBlock {
  file_path: string;
  head: string;
  update: string;
  similarity: number;
}

interface ConfigKey {
  key: string;
  type: string;
  description: string;
  default: any;
}

interface ConfigState {
  human_as_model: boolean;
  skip_build_index: boolean;
  project_type: string;
  extra_conf: { [key: string]: string };
  available_keys: ConfigKey[];
}

interface CodingEvent {
  event_type: string;
  data: string;
}

const INDEX_EVENT_TYPES = {
  BUILD_START: 'code_index_build_start',
  BUILD_END: 'code_index_build_end',
  FILTER_START: 'code_index_filter_start',
  FILTER_END: 'code_index_filter_end',
  FILTER_FILE_SELECTED: 'code_index_filter_file_selected'
} as const;

interface EventResponse {
  request_id: string;
  event: CodingEvent;
}

interface ResponseData {
  result: {
    value: string[] | string;
  };
  status: 'running' | 'completed' | 'failed';
}

interface PollResult {
  text: string;
  status: 'running' | 'completed' | 'failed';
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  status?: 'sending' | 'sent' | 'error';
  timestamp: number;
}

interface ChatPanelProps {
  setPreviewFiles: (files: { path: string; content: string }[]) => void;
  setActivePanel: (panel: 'code' | 'filegroup' | 'preview' | 'clipboard') => void;
  setClipboardContent: (content: string) => void;
  clipboardContent: string;
  setRequestId: (requestId: string) => void;
}

interface CompletionItem {
  name: string;
  path: string;
  display: string;
  location?: string;
}

interface CompletionData {
  completions: Array<CompletionItem>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ setPreviewFiles, setRequestId, setActivePanel, setClipboardContent, clipboardContent }) => {
  const handleNewChat = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newChatName = `chat_${timestamp}`;
    setChatListName(newChatName);
    setMessages([]);
    setChatLists(prev => [newChatName, ...prev]);
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [config, setConfig] = useState<ConfigState>({
    human_as_model: false,
    skip_build_index: true,
    project_type: "py",
    extra_conf: {},
    available_keys: []
  });
  const [chatLists, setChatLists] = useState<string[]>([]);
  const [chatListName, setChatListName] = useState<string>('');
  const [showChatListInput, setShowChatListInput] = useState(false);

  const [sendLoading, setSendLoading] = useState<boolean>(false);
  const editorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isWriteMode, setIsWriteMode] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [shouldSendMessage, setShouldSendMessage] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<boolean>(false);

  // 添加新的 useEffect 用于滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (shouldSendMessage) {
      handleSendMessage();
      setShouldSendMessage(false);
    }
  }, [shouldSendMessage]);

  useEffect(() => {
    // Fetch initial config
    fetch('/api/conf')
      .then(response => response.json())
      .then(data => {
        const { human_as_model, skip_build_index, project_type, ...extraConf } = data.conf;
        setConfig({
          human_as_model: human_as_model === "true",
          skip_build_index: skip_build_index === "true",
          project_type: project_type,
          extra_conf: extraConf,
          available_keys: []
        });
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        AntdMessage.error('Failed to fetch configuration');
      });
  }, []);

  useEffect(() => {
    // Fetch available configuration keys
    fetch('/api/conf/keys')
      .then(response => response.json())
      .then(data => {
        setConfig(prev => ({
          ...prev,
          available_keys: data.keys
        }));
      })
      .catch(error => {
        console.error('Error fetching configuration keys:', error);
        AntdMessage.error('Failed to fetch configuration keys');
      });
  }, []);

  useEffect(() => {
    fetchChatLists();
  }, []);

  const fetchChatLists = async () => {
    try {
      const response = await fetch('/api/chat-lists');
      const data = await response.json();

      // Automatically load the latest chat if there are any chats
      if (data.chat_lists && data.chat_lists.length > 0) {
        // The first chat in the list is the latest one since they're sorted by modification time
        setChatListName(data.chat_lists[0]);
        setChatLists(data.chat_lists);
        await loadChatList(data.chat_lists[0]);
      } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newChatName = `chat_${timestamp}`;
        setChatListName(newChatName);
        setChatLists([newChatName]);
      }
    } catch (error) {
      console.error('Error fetching chat lists:', error);
      AntdMessage.error('Failed to fetch chat lists');
    }
  };

  const saveChatList = async (name: string, newMessages: Message[] = []) => {
    console.log('save chat list:', name);
    console.log('messages:', newMessages);
    if (!name.trim()) {
      AntdMessage.error('Please enter a name for the chat list');
      return;
    }

    try {
      const response = await fetch('/api/chat-lists/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          messages: newMessages,
        }),
      });

      if (response.ok) {
        setShowChatListInput(false);
        setChatListName('');
        fetchChatLists();
      } else {
        console.error('Failed to save chat list', response.json());
      }
    } catch (error) {
      console.error('Error saving chat list:', error);
    }
  };

  const loadChatList = async (name: string) => {
    try {
      const response = await fetch(`/api/chat-lists/${name}`);
      const data = await response.json();
      data.messages.forEach((message: Message) => {
        if (message.role === 'user') {
          message.status = 'sent';
        }
      });
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading chat list:', error);
      AntdMessage.error('Failed to load chat list');
    }
  };

  const deleteChatList = async (name: string) => {
    try {
      const response = await fetch(`/api/chat-lists/${name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        AntdMessage.success('Chat list deleted successfully');
        fetchChatLists();
      } else {
        AntdMessage.error('Failed to delete chat list');
      }
    } catch (error) {
      console.error('Error deleting chat list:', error);
      AntdMessage.error('Failed to delete chat list');
    }
  };

  const updateConfig = async (key: string, value: boolean | string) => {
    try {
      const response = await fetch('/api/conf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: String(value) })
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      setConfig(prev => ({ ...prev, [key]: value }));
      AntdMessage.success('Configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      AntdMessage.error('Failed to update configuration');
    }
  };

  const [pendingResponseEvent, setPendingResponseEvent] = useState<{
    requestId: string;
    eventData: CodingEvent;
  } | null>(null);

  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  const fetchFileGroups = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    
    if (timeSinceLastFetch >= 30000) { // 30 seconds
      try {
        const response = await fetch('/api/file-groups');
        if (!response.ok) throw new Error('Failed to fetch file groups');
        const data = await response.json();
        setFileGroups(data.groups);
        setLastFetchTime(now);
      } catch (error) {
        console.error('Failed to load file groups');
      }
    }
  }, [lastFetchTime]);

  // Initial fetch
  useEffect(() => {
    fetchFileGroups();
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Add keyboard shortcut for maximize/minimize
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      setIsMaximized(prev => !prev);
    });

    // Add keyboard shortcut for submission
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      setShouldSendMessage(true);
    });

    // 注册自动补全提供者
    monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['@'],
      provideCompletionItems: async (model: any, position: any) => {
        // 获取当前行的文本内容
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        // 获取当前词和前缀
        const word = model.getWordUntilPosition(position);
        const prefix = textUntilPosition.charAt(word.startColumn - 2); // 获取触发字符
        const double_prefix = textUntilPosition.charAt(word.startColumn - 3); // 获取触发字符

        //获取当前词
        const wordText = word.word;

        console.log('prefix:', prefix, 'word:', wordText);

        if (prefix === "@" && double_prefix === "@") {
          // 符号补全
          const query = wordText;
          const response = await fetch(`/api/completions/symbols?name=${encodeURIComponent(query)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: CompletionItem) => ({
              label: item.display,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: item.path,
              detail: "",
              documentation: `Location: ${item.path}`,
            })),
            incomplete: true
          };
        } else if (prefix === "@") {
          // 文件补全
          const query = wordText;
          const response = await fetch(`/api/completions/files?name=${encodeURIComponent(query)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: CompletionItem) => ({
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

  const pollStreamResult = async (requestId: string, onUpdate: (text: string) => void): Promise<PollResult> => {
    let result = '';
    let status: 'running' | 'completed' | 'failed' = 'running';

    while (status === 'running') {
      try {
        const response = await fetch(`/api/result/${requestId}`);
        if (!response.ok) {
          status = 'failed';
          break;
        }

        const data: ResponseData = await response.json();
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

          if (status === 'running') {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }

        if ('value' in data.result && Array.isArray(data.result.value)) {
          const newText = data.result.value.join('');
          if (newText !== result) {
            result = newText;
            onUpdate(result);
          }
        } else if ('value' in data.result && typeof data.result.value === 'string') {
          if (data.result.value !== result) {
            result = data.result.value;
            onUpdate(result);
          }
        }

        if (status === 'completed') {
          break;
        }

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

  const runBothPolls = async (requestId: string, onUpdate: (text: string) => void) => {
    try {
      const [eventsResult, streamResult] = await Promise.all([
        pollEvents(requestId),
        pollStreamResult(requestId, onUpdate)
      ]);

      // 合并两个结果的状态
      const finalStatus = eventsResult.final_status === 'completed' && streamResult.status === 'completed'
        ? 'completed'
        : 'failed';

      return {
        status: finalStatus,
        content: streamResult.text,
        eventsContent: eventsResult.content
      };
    } catch (error) {
      console.error('Error in runBothPolls:', error);
      return {
        status: 'failed',
        content: 'Error running polls: ' + error,
        eventsContent: ''
      };
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
    let content = '';
    while (true) {
      try {
        const response = await fetch('/api/event/get', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ request_id: requestId })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const eventData: CodingEvent = await response.json();

        if (!eventData) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1s before polling again
          continue;
        }

        console.log('Received event:', eventData);

        const response_event = async (response: string) => {
          console.log('Response event:', response);
          await fetch('/api/event/response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              request_id: requestId,
              event: eventData,
              response: response
            })
          });
        };

        // Handle specific event types
        if (eventData.event_type === 'code_start') {
          await response_event("proceed");
        }

        if (eventData.event_type === 'code_end') {
          await response_event("proceed");
          break;
        }

        if (eventData.event_type === 'code_error') {
          await response_event("proceed");
          final_status = 'failed';
          content = eventData.data;
          break;
        }

        if (eventData.event_type === 'code_error') {
          await response_event("proceed");
          final_status = 'failed';
          content = eventData.data;
          break;
        }

        // Handle index build events
        if (eventData.event_type === INDEX_EVENT_TYPES.BUILD_START) {
          await response_event("proceed");
          addBotMessage(getMessage('indexBuildStart'));
        }

        if (eventData.event_type === INDEX_EVENT_TYPES.BUILD_END) {
          await response_event("proceed");
          addBotMessage(getMessage('indexBuildComplete'));
        }

        // Handle index filter events
        if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_START) {
          await response_event("proceed");
          addBotMessage(getMessage('filterStart'));
        }

        if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_END) {
          await response_event("proceed");
          addBotMessage(getMessage('filterComplete'));
        }

        if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_FILE_SELECTED) {
          await response_event("proceed");
          try {
            const fileData = JSON.parse(eventData.data) as [string, string][];
            const selectedFiles = fileData.map(([file, reason]) => file).join(', ');
            addBotMessage(getMessage('fileSelected', { file: selectedFiles }));
          } catch (e) {
            console.error('Failed to parse file selection data:', e);
          }
        }

        if (eventData.event_type === 'code_unmerge_result') {
          await response_event("proceed");
          const blocks = JSON.parse(eventData.data) as UnmergeCodeBlock[];
          console.log('Received unmerged code blocks:', blocks);

          // 更新 Preview Panel 数据
          const previewData = blocks.map(block => ({
            path: block.file_path,
            content: `<<<<<<< SEARCH(${block.similarity})\n${block.head}\n=======\n${block.update}\n>>>>>>> REPLACE`
          }));

          // 发送到 App 组件
          setPreviewFiles(previewData);
          setActivePanel('preview');
          final_status = 'failed';
          content = "Code block merge failed";
          break;

        }


        if (eventData.event_type === 'code_merge_result') {
          await response_event("proceed");
          const blocks = JSON.parse(eventData.data) as CodeBlock[];
          console.log('Received code blocks:', blocks);

          // 更新 Preview Panel 数据
          const previewData = blocks.map(block => ({
            path: block.file_path,
            content: `<<<<<<< SEARCH(${block.similarity})\n${block.head}\n=======\n${block.update}\n>>>>>>> REPLACE`
          }));

          // 发送到 App 组件
          setPreviewFiles(previewData);
          setActivePanel('preview');
        }

        if (eventData.event_type === 'code_generate_start') {
          await response_event("proceed");
          addBotMessage(getMessage('codeGenerateStart'));
        }

        if (eventData.event_type === 'code_generate_end') {
          await response_event("proceed");
          addBotMessage(getMessage('codeGenerateComplete'));
        }

        if (eventData.event_type === "code_rag_search_start") {
          await response_event("proceed");
          addBotMessage(getMessage('ragSearchStart'));
        }

        if (eventData.event_type === "code_rag_search_end") {
          await response_event("proceed");
          addBotMessage(getMessage('ragSearchComplete'));
        }

        if (eventData.event_type === 'code_human_as_model') {
          const result = JSON.parse(eventData.data)
          setActivePanel('clipboard');
          setClipboardContent(result.instruction);
          setPendingResponseEvent({
            requestId: requestId,
            eventData: eventData
          });
          addBotMessage(getMessage('copyInstructions'));
          setSendLoading(false)
        }
      } catch (error) {
        final_status = 'failed';
        content = 'Error polling events: ' + error;
        console.error('Error polling events:', error);
        break;
      }

      // Add a small delay between polls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { final_status, content };
  };


  const handleRevert = async () => {
    try {
      // First get the YAML content
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

      // Get the query from YAML content
      const query = yamlData.content.query;
      if (!query) {
        AntdMessage.error('No query found in the last action');
        addBotMessage(getMessage('noQueryFound'));
        return;
      }

      // Ask for confirmation
      addBotMessage(getMessage('revertConfirmation', { query }));
      setPendingRevert(true);

    } catch (error) {
      AntdMessage.error('Failed to get last action information');
      addBotMessage(getMessage('getLastActionError'));
      console.error('Error getting last action:', error);
    }
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
      const isConfirmed = CONFIRMATION_WORDS.includes(trimmedText.toLowerCase());
      if (isConfirmed) {
        try {
          const response = await fetch('/api/revert', {
            method: 'POST'
          });

          if (!response.ok) {
            throw new Error('Failed to revert changes');
          }

          const data = await response.json();
          if (data.status) {
            AntdMessage.success('Changes reverted successfully');
            addBotMessage(getMessage('revertSuccess'));
          } else {
            AntdMessage.error(data.message);
            addBotMessage(getMessage('revertFailure', { message: data.message }));
          }

          // Refresh preview panel if active
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

    // Original handleSendMessage logic
    if (pendingResponseEvent) {
      const isConfirmed = CONFIRMATION_WORDS.includes(trimmedText.toLowerCase());
      if (isConfirmed) {
        const { requestId, eventData } = pendingResponseEvent;
        const v = JSON.stringify({
          "value": clipboardContent
        });
        await fetch('/api/event/response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            event: eventData,
            response: v
          })
        });
        console.log('Response event:', JSON.stringify({
          request_id: requestId,
          event: eventData,
          response: v
        }));
      } else {
        const { requestId, eventData } = pendingResponseEvent;
        const v = JSON.stringify({
          "value": ""
        });
        await fetch('/api/event/response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            event: eventData,
            response: v
          })
        });
        console.log('Response event:', JSON.stringify({
          request_id: requestId,
          event: eventData,
          response: v
        }));
        addBotMessage(getMessage('cancelResponseEvent'));
      }
      updateMessageStatus(messageId, 'sent');
      setPendingResponseEvent(null);
      updateMessageStatus(messageId, 'sent');
      return;
    }

    setSendLoading(true);

    try {
      const endpoint = isWriteMode ? '/api/coding' : '/api/chat';
      console.log('Sending message to:', endpoint);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedText })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      if (data.request_id) {
        // Update original message status
        setRequestId(data.request_id);
        updateMessageStatus(messageId, 'sent');
        if (isWriteMode) {
          // Start polling for events
          const { final_status, content } = await pollEvents(data.request_id);
          if (final_status === 'completed') {
            addBotMessage(getMessage('codeModificationComplete'));
            setRequestId("");
          } else {
            addBotMessage(getMessage('codeModificationFailed', { content }));
            setRequestId("");
          }
        } else {
          const messageBotId = addBotMessage("");
          await pollStreamResult(data.request_id, (newText) => {
            if (newText === "") {
              newText = "typing...";
            }
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

      // Add error message from bot
      addBotMessage(getMessage('processingError'));
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900 relative">
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="absolute top-2 left-2 z-10 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors"
          title="New Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="space-y-4">
          {messages.map((message) => (
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                className={`max-w-[80%] rounded-lg p-2 relative group text-2xs ${message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300'
                  }`}
              >
                <Markdown>{message.content}</Markdown>
                {message.status === 'sending' && (
                  <div className="flex items-center text-2xs text-gray-400 mt-1">
                    <div className="mr-1">sending</div>
                    <div className="animate-bounce">•</div>
                    <div className="animate-bounce delay-100">•</div>
                    <div className="animate-bounce delay-200">•</div>
                  </div>
                )}
                {message.status === 'sent' && (
                  <div className="text-2xs text-green-400 mt-1">
                    ✓ sent
                  </div>
                )}
                {message.status === 'error' && (
                  <div className="flex items-center text-2xs text-red-400 mt-1">
                    <span className="mr-1">⚠</span>
                    failed to send
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area with integrated settings */}
      <div className="bg-gray-800 border-t border-gray-700">
        {/* Configuration and Groups Section */}
        <div className="px-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm font-semibold">Settings & Groups</span>
              <Switch
                size="small"
                checked={showConfig}
                onChange={setShowConfig}
                className="ml-2"
              />
            </div>
            <div className="text-gray-400 text-xs">
              Press {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + L to maximize/minimize input area
            </div>
          </div>

          {showConfig && (
            <div className="space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <Tooltip title="Enable to let human act as the model">
                  <span className="text-gray-300 text-xs">Human As Model</span>
                </Tooltip>
                <Switch
                  size="small"
                  checked={config.human_as_model}
                  onChange={(checked) => updateConfig('human_as_model', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Tooltip title="Skip building index for better performance">
                  <span className="text-gray-300 text-xs">Skip Build Index</span>
                </Tooltip>
                <Switch
                  size="small"
                  checked={config.skip_build_index}
                  onChange={(checked) => updateConfig('skip_build_index', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Tooltip title="Filter files by extensions (e.g. .py,.ts)">
                  <span className="text-gray-300 text-xs">Project Type</span>
                </Tooltip>
                <Select
                  mode="tags"
                  size="small"
                  style={{ width: '60%' }}
                  placeholder="e.g. .py,.ts"
                  value={config.project_type ? config.project_type.split(',') : []}
                  onChange={(values) => updateConfig('project_type', values.join(','))}
                  className="custom-select"
                  tokenSeparators={[',']}
                >
                  {['.py', '.ts', '.tsx', '.js', '.jsx'].map(ext => (
                    <Select.Option key={ext} value={ext}>
                      {ext}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* Custom Configuration */}
              <div className="space-y-2 mt-2">
                {/* Heading */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-xs font-medium">Custom Configuration</span>
                  <button
                    onClick={() => {
                      const newExtraConf = { ...config.extra_conf };
                      newExtraConf[`custom_key_${Object.keys(config.extra_conf).length}`] = '';
                      setConfig(prev => ({
                        ...prev,
                        extra_conf: newExtraConf
                      }));
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Add Config
                  </button>
                </div>

                {/* Config Items */}
                <div className="space-y-2">
                  {Object.entries(config.extra_conf).map(([key, value], index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Select
                        showSearch
                        size="small"
                        value={key}
                        style={{ width: '40%' }}
                        placeholder="Key"
                        className="custom-select"
                        onChange={(newKey) => {
                          const newExtraConf = { ...config.extra_conf };
                          delete newExtraConf[key];
                          newExtraConf[newKey] = value;
                          setConfig(prev => ({
                            ...prev,
                            extra_conf: newExtraConf
                          }));
                        }}
                        optionLabelProp="label"
                      >
                        {config.available_keys.map(configKey => (
                          <Select.Option
                            key={configKey.key}
                            value={configKey.key}
                            label={configKey.key}
                          >
                            <div className="flex justify-between items-center">
                              <span>{configKey.key}</span>
                              <span className="text-gray-400 text-xs">
                                {configKey.type}
                              </span>
                            </div>
                          </Select.Option>
                        ))}
                      </Select>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          const newExtraConf = { ...config.extra_conf };
                          newExtraConf[key] = e.target.value;
                          setConfig(prev => ({
                            ...prev,
                            extra_conf: newExtraConf
                          }));
                        }}
                        onBlur={() => {
                          if (key && config.extra_conf[key] !== '') {
                            updateConfig(key, config.extra_conf[key]);
                          }
                        }}
                        className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                        placeholder="Value"
                      />
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/conf/${key}`, {
                              method: 'DELETE'
                            });

                            if (!response.ok) {
                              throw new Error('Failed to delete configuration');
                            }

                            const newExtraConf = { ...config.extra_conf };
                            delete newExtraConf[key];
                            setConfig(prev => ({
                              ...prev,
                              extra_conf: newExtraConf
                            }));

                            AntdMessage.success('Configuration deleted successfully');
                          } catch (error) {
                            console.error('Error deleting configuration:', error);
                            AntdMessage.error('Failed to delete configuration');
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* File Groups Select - Now outside of showConfig condition */}
          <div className="px-4">
            <div className="h-[1px] bg-gray-700/50 my-3"></div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select file groups to work with"
            value={selectedGroups}
            onFocus={fetchFileGroups}
            onChange={(values) => {
              console.log('Selected groups:', values);
              setSelectedGroups(values);
              fetch('/api/file-groups/switch', {
                method: 'POST',
                body: JSON.stringify({ group_names: values })
              });
            }}
            optionLabelProp="label"
            className="custom-select"
          >
              {fileGroups.map(group => (
                <Select.Option
                  key={group.name}
                  value={group.name}
                  label={group.name}
                >
                  <div className="flex justify-between items-center">
                    <span>{group.name}</span>
                    <span className="text-gray-400 text-xs">
                      {group.files.length} files
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>

        {/* Message Input */}
        <div className={`p-4 flex flex-col space-y-2 ${isMaximized ? 'fixed inset-0 z-50 bg-gray-800' : ''}`}>
          <div className={`flex-1 ${isMaximized ? 'h-full' : 'min-h-[180px]'} border border-gray-700 rounded-lg overflow-hidden`}>
            <Editor
              height={isMaximized ? "100vh" : "180px"}
              defaultLanguage="markdown"
              theme="vs-dark"
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'off',
                folding: false,
                contextmenu: false,
                fontFamily: 'monospace',
                fontSize: 14,
                lineHeight: 1.5,
                padding: { top: 8, bottom: 8 },
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                acceptSuggestionOnEnter: 'smart',
                overviewRulerLanes: 0,
                overviewRulerBorder: false,
                fixedOverflowWidgets: true,
                suggest: {
                  insertMode: 'replace',
                  snippetsPreventQuickSuggestions: false,
                }
              }}
            />
          </div>
          <div className="flex flex-col mt-2 gap-2">
            {/* Bottom Actions Container */}
          <div className="space-y-3 bg-gray-850 p-3 rounded-lg shadow-inner border border-gray-700/50">
            {/* Mode and Shortcuts Row */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-4">
                {/* Mode Switch with Label */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-400">Mode:</span>
                  <Switch
                    size="small"
                    checked={isWriteMode}
                    onChange={setIsWriteMode}
                    checkedChildren="Write"
                    unCheckedChildren="Chat"
                    className="bg-gray-700 hover:bg-gray-600"
                  />
                </div>
                {/* Keyboard Shortcut */}
                <div className="flex items-center space-x-1.5">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-600 rounded shadow-sm">
                    {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + Enter
                  </kbd>
                  <span className="text-xs text-gray-500">to send</span>
                </div>
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between">
              {/* Left Side - Utility Actions */}
              <div className="flex items-center space-x-2">
                <Tooltip title="Clear event queue to resolve any stuck operations" placement="top">
                  <button
                    className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 
                    transition-all duration-200 flex items-center space-x-1.5 group shadow-sm
                    border border-gray-600/50 hover:border-gray-500"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/event/clear', {
                          method: 'POST'
                        });
                        if (!response.ok) {
                          throw new Error('Failed to clear events');
                        }
                        AntdMessage.success('Event queue cleared successfully');
                      } catch (error) {
                        console.error('Error clearing events:', error);
                        AntdMessage.error('Failed to clear event queue');
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" 
                         className="h-4 w-4 transform group-hover:rotate-180 transition-transform duration-300" 
                         fill="none" 
                         viewBox="0 0 24 24" 
                         stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-xs font-medium">Clear Events</span>
                  </button>
                </Tooltip>
              </div>

              {/* Right Side - Primary Actions */}
              <div className="flex items-center space-x-2">
                <Tooltip title="Undo last modification" placement="top">
                  <button
                    className="p-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600
                      transition-all duration-200 border border-gray-600/50 hover:border-gray-500
                      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
                      focus:ring-offset-gray-800 shadow-sm group"
                    onClick={handleRevert}
                  >
                    <UndoOutlined className="text-lg group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                </Tooltip>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white 
                    rounded-md font-medium transition-all duration-200
                    hover:from-blue-700 hover:to-indigo-700 
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
                    focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-md hover:shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30
                    border border-indigo-500/50 hover:border-indigo-400
                    transform hover:-translate-y-0.5"
                  onClick={handleSendMessage}
                  disabled={sendLoading}
                >
                  <div className="flex items-center space-x-2">
                    {sendLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send</span>
                        <svg xmlns="http://www.w3.org/2000/svg" 
                             className="h-4 w-4 transform rotate-45 group-hover:translate-x-0.5" 
                             fill="none" 
                             viewBox="0 0 24 24" 
                             stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default ChatPanel;