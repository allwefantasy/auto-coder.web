import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AutoComplete, Card, Select, Switch, message, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

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

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  status?: 'sending' | 'sent' | 'error';
  timestamp: number;
}

interface ChatPanelProps {
  setPreviewFiles: (files: { path: string; content: string }[]) => void;
  setActivePanel: (panel: 'code' | 'filegroup' | 'preview') => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ setPreviewFiles, setActivePanel }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [config, setConfig] = useState<ConfigState>({
    human_as_model: false,
    skip_build_index: true
  });
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

  const [inputText, setInputText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);  

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
      status: 'sent',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);;
  };

  const pollEvents = async (requestId: string) => {
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
          const v = JSON.stringify({
            "value": ""
          })
          await response_event(v);
        }
      } catch (error) {
        console.error('Error polling events:', error);
        break;
      }

      // Add a small delay between polls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      message.warning('Please enter a message');
      return;
    }

    const messageId = addUserMessage(inputText);

    try {
      const response = await fetch('/api/coding', {
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
        updateMessageStatus(messageId, 'sent');
        // Start polling for events
        pollEvents(data.request_id);
        addBotMessage("代码修改完成。")
      }

    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Failed to send message');
      updateMessageStatus(messageId, 'error');

      // Add error message from bot
      addBotMessage('Sorry, there was an error processing your request. Please try again.');
    }
  };

    return (
      <div className="flex flex-col h-full">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
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
                    onChange={async (checked) => {
                      const response = await fetch('/api/conf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ human_as_model: checked })
                      });
                      if (response.ok) {
                        setConfig(prev => ({ ...prev, human_as_model: checked }));
                        message.success('Updated');
                      } else {
                        message.error('Failed to update');
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Tooltip title="Skip building index for better performance">
                    <span className="text-gray-300 text-xs">Skip Build Index</span>
                  </Tooltip>
                  <Switch
                    size="small"
                    checked={config.skip_build_index}
                    onChange={async (checked) => {
                      const response = await fetch('/api/conf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ skip_build_index: checked })
                      });
                      if (response.ok) {
                        setConfig(prev => ({ ...prev, skip_build_index: checked }));
                        message.success('Updated');
                      } else {
                        message.error('Failed to update');
                      }
                    }}
                  />
                </div>

                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Select file groups"
                  value={selectedGroups}
                  onChange={(values) => setSelectedGroups(values)}
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
          <div className="p-4 flex items-center space-x-2">
            <input
              type="text"
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
              onChange={handleInputChange}
            />
            <button
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              onClick={handleSendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
  );
};

export default ChatPanel;