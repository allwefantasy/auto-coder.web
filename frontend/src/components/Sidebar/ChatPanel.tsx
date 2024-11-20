import React, { useState, useEffect, useRef } from 'react';
import { Select, Switch, message as AntdMessage, Tooltip, Modal } from 'antd';
import { UndoOutlined, ExpandAltOutlined } from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';

interface FileGroup {
  id: string;
  name: string;
  files: string[];
}

interface CodeBlock {
  file_path: string;
  new_block: string;
  old_block: string;
}

interface ConfigState {
  human_as_model: boolean;
  skip_build_index: boolean;
}

interface CodingEvent {
  event_type: string;
  data: string;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [config, setConfig] = useState<ConfigState>({
    human_as_model: false,
    skip_build_index: true
  });
  const [inputText, setInputText] = useState<string>('');
  const [sendLoading, setSendLoading] = useState<boolean>(false);
  const editorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isWriteMode, setIsWriteMode] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [maximizedEditorRef, setMaximizedEditorRef] = useState<any>(null);

  useEffect(() => {
    // Fetch initial config
    fetch('/api/conf')
      .then(response => response.json())
      .then(data => {
        setConfig({
          human_as_model: data.conf.human_as_model === "true",
          skip_build_index: data.conf.skip_build_index === "true"
        });
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        AntdMessage.error('Failed to fetch configuration');
      });
  }, []);

  const updateConfig = async (key: string, value: boolean) => {
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

  const fetchFileGroups = async () => {
    try {
      const response = await fetch('/api/file-groups');
      if (!response.ok) throw new Error('Failed to fetch file groups');
      const data = await response.json();
      setFileGroups(data.groups);
    } catch (error) {
      console.error('Failed to load file groups');
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFileGroups();
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

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
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const addBotMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'bot',
      content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
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

  const updateMessageStatus = (messageId: string, status: 'sending' | 'sent' | 'error') => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status }
          : msg
      )
    );
  };

  const handleEditorChange = (value: string | undefined) => {
    setInputText(value || '');
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

        if (eventData.event_type === 'code_merge_result') {
          await response_event("proceed");
          const blocks = JSON.parse(eventData.data) as CodeBlock[];
          console.log('Received code blocks:', blocks);

          // 更新 Preview Panel 数据
          const previewData = blocks.map(block => ({
            path: block.file_path,
            content: `<<<<<<< SEARCH\n${block.old_block}\n=======\n${block.new_block}\n>>>>>>> REPLACE`
          }));

          // 发送到 App 组件
          setPreviewFiles(previewData);
          setActivePanel('preview');
        }

        if (eventData.event_type === 'code_human_as_model') {
          const result = JSON.parse(eventData.data)
          setActivePanel('clipboard');
          setClipboardContent(result.instruction);
          setPendingResponseEvent({
            requestId: requestId,
            eventData: eventData
          });
          addBotMessage("请复制右侧的文本,然后将结果复制黏贴会右侧。黏贴完请回复 '确认'");
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
      const response = await fetch('/api/revert', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to revert changes');
      }

      const data = await response.json();
      AntdMessage.success('Changes reverted successfully');

      // Refresh preview panel if active
      setPreviewFiles([]);
      setActivePanel('code');

    } catch (error) {
      AntdMessage.error('Failed to revert changes');
      console.error('Error reverting changes:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      AntdMessage.warning('Please enter a message');
      return;
    }

    const messageId = addUserMessage(inputText);
    setInputText("");


    if (inputText.trim() === '确认' && pendingResponseEvent) {
      updateMessageStatus(messageId, 'sent');
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
      setPendingResponseEvent(null);
      setInputText("");
      return;
    }

    setSendLoading(true);

    try {
      const endpoint = isWriteMode ? '/api/coding' : '/api/chat';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: inputText })
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
            addBotMessage("代码修改完成。请查看右侧修改预览面板。如果不满意，在发送按钮左侧点击撤销最近修改");
            setRequestId("");
          } else {
            addBotMessage("代码修改失败：" + content);
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
      addBotMessage('Sorry, there was an error processing your request. Please try again.');
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        <div className="space-y-4">
          {messages.map((message) => (
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 relative group ${message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300'
                  }`}
              >
                <div className="break-words">{message.content}</div>
                {message.status === 'sending' && (
                  <div className="flex items-center text-xs text-gray-400 mt-1">
                    <div className="mr-1">sending</div>
                    <div className="animate-bounce">•</div>
                    <div className="animate-bounce delay-100">•</div>
                    <div className="animate-bounce delay-200">•</div>
                  </div>
                )}
                {message.status === 'sent' && (
                  <div className="text-xs text-green-400 mt-1">
                    ✓ sent
                  </div>
                )}
                {message.status === 'error' && (
                  <div className="flex items-center text-xs text-red-400 mt-1">
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm font-semibold">Settings & Groups</span>
            <Switch
              size="small"
              checked={showConfig}
              onChange={setShowConfig}
              className="ml-2"
            />
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

              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Select file groups"
                value={selectedGroups}
                onChange={(values) => {
                  setSelectedGroups(values);
                  fetch('/api/file-groups/switch', {
                    method: 'POST',
                    body: JSON.stringify({ group_names: values })
                  });
                }}
                optionLabelProp="label"
                className="custom-select mt-2"
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
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 flex flex-col space-y-2">
          <div className="flex-1 min-h-[180px] border border-gray-700 rounded-lg overflow-hidden">
            <Editor
              height="180px"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={inputText}
              onChange={handleEditorChange}
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
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400">
                Press {navigator.platform.indexOf('Mac') === 0 ? '⌘' : 'Ctrl'} + Enter to send
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  size="small"
                  checked={isWriteMode}
                  onChange={setIsWriteMode}
                  checkedChildren="Write"
                  unCheckedChildren="Chat"
                  className="bg-gray-600"
                />
                <button
                  className="flex items-center p-2 bg-gray-600 text-white rounded-md
                    hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
                    focus:ring-offset-gray-900 transition-colors
                    shadow-lg shadow-gray-500/20"
                  onClick={() => setIsMaximized(true)}
                  title="最大化编辑"
                >
                  <ExpandAltOutlined style={{ fontSize: '18px' }} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center p-2 bg-gray-600 text-white rounded-md
                  hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
                  focus:ring-offset-gray-900 transition-colors
                  shadow-lg shadow-gray-500/20"
                onClick={handleRevert}
                title="撤销最近一次提交"
              >
                <UndoOutlined style={{ fontSize: '18px' }} />
              </button>
              <button
                className="flex items-center px-4 py-2 bg-indigo-600 text-sm text-white rounded-md font-medium 
                  hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
                  focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-indigo-500/20"
                onClick={handleSendMessage}
                disabled={sendLoading}
              >
                {sendLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Maximized Editor Modal */}
      <Modal
        title="高级编辑"
        open={isMaximized}
        onCancel={() => setIsMaximized(false)}
        footer={null}
        width="80%"
        style={{ 
          top: '50%', 
          transform: 'translateY(-50%)',
          maxWidth: '1200px'
        }}
        bodyStyle={{ 
          height: '70vh',
          padding: '20px'
        }}
      >
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <Editor
              height="calc(100vh - 250px)"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={inputText}
              onChange={handleEditorChange}
              onMount={(editor) => setMaximizedEditorRef(editor)}
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
          <div className="flex justify-end mt-4 gap-2">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              onClick={() => setIsMaximized(false)}
            >
              取消
            </button>
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              onClick={() => {
                handleSendMessage();
                setIsMaximized(false);
              }}
            >
              发送
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatPanel;