import React, { useState, useEffect } from 'react';
import { List, Card, Typography, Button, Space, Tag, Modal, message } from 'antd';
import { MessageOutlined, CodeOutlined, FolderOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const { Text } = Typography;

interface Query {
  query: string;
  timestamp?: string;
  response?: string;
  urls?: string[];
  file_number: number;
}

interface FileChange {
  path: string;
  change_type: string;
}

const HistoryPanel: React.FC = () => {
  const [queries, setQueries] = useState<Query[]>([]);
  const [diffModalVisible, setDiffModalVisible] = useState<boolean>(false);
  const [currentDiff, setCurrentDiff] = useState<{diff: string, file_changes?: FileChange[]}>({diff: ''});
  const [contextModalVisible, setContextModalVisible] = useState<boolean>(false);
  const [currentUrls, setCurrentUrls] = useState<string[]>([]);

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      const response = await fetch('/api/last-history');
      if (response.ok) {
        const data = await response.json();
        setQueries(data.queries || []);
      } else {
        message.error('加载历史记录失败');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      message.error('加载历史记录失败');
    }
  };

  const showDiff = async (response: string | undefined) => {
    if (!response) return;

    try {
      const resp = await fetch(`/api/history-diff/${response}`);
      const data = await resp.json();
      
      if (data.success) {
        setCurrentDiff({
          diff: data.diff,
          file_changes: data.file_changes
        });
        setDiffModalVisible(true);
      } else {
        message.error(data.message || '获取diff失败');
      }
    } catch (error) {
      console.error('Error fetching diff:', error);
      message.error('获取diff失败');
    }
  };

  return (
    <div className="p-4">
      <List
        dataSource={queries}
        renderItem={(item) => (
          <List.Item>
            <Card 
              style={{ width: '100%' }}
              title={
                <div className="flex justify-between items-center">
                  <div>
                    <MessageOutlined className="mr-2" />
                    {`${item.file_number}_chat_action.yml`}
                    {item.timestamp && (
                      <Text type="secondary" className="ml-2 text-sm">
                        {item.timestamp}
                      </Text>
                    )}
                  </div>
                  <Space>
                    {item.urls && item.urls.length > 0 && (
                      <Button
                        icon={<FolderOutlined />}
                        type="link"
                        onClick={() => {
                          setCurrentUrls(item.urls || []);
                          setContextModalVisible(true);
                        }}
                      >
                        查看上下文
                      </Button>
                    )}
                    {item.response && (
                      <Button 
                        icon={<CodeOutlined />} 
                        type="link"
                        onClick={() => showDiff(item.response)}
                      >
                        查看变更
                      </Button>
                    )}
                  </Space>
                </div>
              }
            >
              <pre className="whitespace-pre-wrap break-words bg-gray-100 p-3 rounded">
                {item.query}
              </pre>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="文件上下文"
        open={contextModalVisible}
        onCancel={() => setContextModalVisible(false)}
        width={600}
        footer={null}
      >
        <List
          dataSource={currentUrls}
          renderItem={(url) => (
            <List.Item>
              <Text copyable>{url}</Text>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="Commit Diff"
        open={diffModalVisible}
        onCancel={() => setDiffModalVisible(false)}
        width={800}
        footer={null}
      >
        <div>
          {currentDiff.file_changes && currentDiff.file_changes.length > 0 && (
            <div className="mb-4 p-2 bg-gray-100 rounded">
              {currentDiff.file_changes.map((change, index) => (
                <Tag 
                  key={index} 
                  color={change.change_type === 'added' ? 'green' : 'blue'}
                  className="mb-2 mr-2"
                >
                  <Space>
                    {change.change_type === 'added' ? <span>+</span> : <span>M</span>}
                    <Text>{change.path}</Text>
                  </Space>
                </Tag>
              ))}
            </div>
          )}
          <SyntaxHighlighter
            language="diff"
            style={vscDarkPlus}
            customStyle={{
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '500px'
            }}
          >
            {currentDiff.diff}
          </SyntaxHighlighter>
        </div>
      </Modal>
    </div>
  );
};

export default HistoryPanel;