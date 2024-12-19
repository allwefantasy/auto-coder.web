import React, { useState } from 'react';
import { Input, Button, List, Card, Typography, message, Modal, Space, Radio, Tag } from 'antd';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MessageOutlined, CodeOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

interface Query {
    query: string;
    timestamp?: string;
    response?: string;
    urls?: string[];
    file_number: number;
}

const HistoryPanel: React.FC = () => {
    const [queries, setQueries] = useState<Query[]>([]);
    const [isAscending, setIsAscending] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [diffModalVisible, setDiffModalVisible] = useState<boolean>(false);
    const [currentDiff, setCurrentDiff] = useState<{ diff: string, file_changes?: Array<{ path: string, change_type: string }> }>({ diff: '' });
    const [contextModalVisible, setContextModalVisible] = useState<boolean>(false);
    const [currentUrls, setCurrentUrls] = useState<string[]>([]);

    // 添加滚动状态
    const [scrolled, setScrolled] = useState(false);

    const showDiff = async (response: string | undefined) => {
        if (!response) return;

        try {
            const encodedResponseId = encodeURIComponent(response);
            const diffResponse = await axios.get(`/api/history/commit-diff/${encodedResponseId}`);

            if (diffResponse.data.success) {
                setCurrentDiff({
                    diff: diffResponse.data.diff,
                    file_changes: diffResponse.data.file_changes
                });
                if (diffResponse.data.file_changes) {
                    setQueries(prevQueries => prevQueries.map(q => {
                        if (q.response === response) {
                            return { ...q, file_changes: diffResponse.data.file_changes };
                        }
                        return q;
                    }));
                }
                setDiffModalVisible(true);
            } else {
                message.error(diffResponse.data.message || '获取diff失败');
            }
        } catch (error) {
            console.error('Error fetching diff:', error);
            message.error('获取diff失败');
        }
    };

    const loadQueries = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/history/validate-and-load');
            if (response.data.success) {
                setQueries(response.data.queries);
            } else {
                message.error(response.data.message || '加载历史记录失败');
            }
        } catch (error) {
            console.error('Error loading queries:', error);
            message.error('加载失败');
        } finally {
            setLoading(false);
        }
    };

    // 组件加载时自动加载数据
    React.useEffect(() => {
        loadQueries();
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#111827] overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-[#1F2937] border-b border-[#374151] sticky top-0 z-10 shadow-md">
                <Space>
                    <Button
                        icon={isAscending ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                        onClick={() => {
                            setIsAscending(!isAscending);
                            setQueries([...queries].reverse());
                        }}
                    >
                        {isAscending ? '升序' : '降序'}
                    </Button>
                    <Button type="primary" onClick={loadQueries} loading={loading}>
                        刷新
                    </Button>
                </Space>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <List
                    dataSource={queries}
                    renderItem={(item) => (
                        <List.Item className="border-b border-[#374151] last:border-b-0">
                            <Card
                                className="w-full bg-[#1F2937] border-[#374151] hover:bg-[#2D3748] transition-colors duration-200"
                                title={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <MessageOutlined style={{ marginRight: '8px', color: '#9CA3AF' }} />
                                            <Text style={{ color: '#E5E7EB' }}>
                                                {`${item.file_number}_chat_action.yml`}
                                            </Text>

                                            {item.timestamp && (
                                                <Text style={{ marginLeft: '10px', fontSize: '12px', color: '#9CA3AF' }}>
                                                    {item.timestamp}
                                                </Text>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            {item.urls && item.urls.length > 0 && (
                                                <Button
                                                    icon={<MessageOutlined />}
                                                    type="link"
                                                    style={{ color: '#60A5FA' }}
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
                                                    style={{ color: '#60A5FA' }}
                                                    onClick={() => showDiff(item.response)}
                                                >
                                                    查看变更
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                }
                            >
                                <div style={{
                                    backgroundColor: '#111827',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    color: '#E5E7EB',
                                    border: '1px solid #374151',
                                    maxWidth: '100%',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word'
                                }}>
                                    {item.query}
                                </div>
                            </Card>
                        </List.Item>
                    )}
                />

                <Modal
                    title="Commit Diff"
                    open={diffModalVisible}
                    onCancel={() => setDiffModalVisible(false)}
                    width={800}
                    footer={null}
                    className="dark-theme-modal"
                    styles={{
                        content: {
                            backgroundColor: '#1f2937',
                            padding: '20px',
                        },
                        header: {
                            backgroundColor: '#1f2937',
                            borderBottom: '1px solid #374151',
                        },
                        body: {
                            backgroundColor: '#1f2937',
                        },
                        mask: {
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        },
                    }}
                >
                    <div>
                        {currentDiff.file_changes && currentDiff.file_changes.length > 0 && (
                            <div style={{
                                marginBottom: '16px',
                                padding: '8px',
                                background: '#1a1a1a',
                                borderRadius: '4px'
                            }}>
                                {currentDiff.file_changes.map((change, index) => (
                                    <Tag
                                        key={index}
                                        color={change.change_type === 'added' ? '#52c41a' : '#1890ff'}
                                        style={{ marginBottom: '8px', marginRight: '8px', color: '#ffffff' }}
                                    >
                                        <Space>
                                            {change.change_type === 'added' ? <span className="text-white">+</span> : <span className="text-white">M</span>}
                                            <Text style={{ color: '#ffffff' }}>{change.path}</Text>
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

                {/* Context Files Modal */}
                <Modal
                    title="上下文文件列表"
                    open={contextModalVisible}
                    onCancel={() => setContextModalVisible(false)}
                    width={600}
                    footer={null}
                    className="dark-theme-modal"
                    styles={{
                        content: {
                            backgroundColor: '#1f2937',
                            padding: '20px',
                        },
                        header: {
                            backgroundColor: '#1f2937',
                            borderBottom: '1px solid #374151',
                        },
                        body: {
                            backgroundColor: '#1f2937',
                        },
                        mask: {
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        },
                    }}
                >
                    <List
                        dataSource={currentUrls}
                        className="dark-theme-list max-h-96 overflow-y-auto"
                        renderItem={(url) => (
                            <List.Item
                                className="text-gray-200 border-gray-700"
                            >
                                <div className="flex items-center w-full">
                                    <Text style={{ color: '#E5E7EB' }}>{url}</Text>
                                </div>
                            </List.Item>
                        )}
                    />
                </Modal>
            </div>
        </div>
    );
};

export default HistoryPanel;
