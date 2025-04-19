import React, { useState, useRef, useCallback } from 'react';
import { Input, Button, List, Card, Typography, message, Modal, Space, Radio, Tag, Tabs } from 'antd';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MessageOutlined, CodeOutlined, SortAscendingOutlined, SortDescendingOutlined, FileOutlined, UndoOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Editor, loader } from '@monaco-editor/react';
import DiffViewer from './DiffViewer';
import eventBus, { EVENTS } from '../../services/eventBus';
import { getMessage } from '../Sidebar/lang'; // Import getMessage

// 防止Monaco加载多次
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: { '*': 'zh-cn' }
  }
});

const { Text } = Typography;
const { TabPane } = Tabs;

interface Query {
    query: string;
    timestamp?: string;
    response?: string;
    urls?: string[];
    file_number: number;
    is_reverted?: boolean;
}

interface FileChange {
    path: string;
    change_type: string;
}

interface FileDiff {
    before_content: string;
    after_content: string;
    diff_content: string;
    file_status: string;
}

const HistoryPanel: React.FC = () => {
    const [queries, setQueries] = useState<Query[]>([]);
    const [isAscending, setIsAscending] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [contextModalVisible, setContextModalVisible] = useState<boolean>(false);
    const [currentUrls, setCurrentUrls] = useState<string[]>([]);
    const [viewingCommitId, setViewingCommitId] = useState<string | null>(null);

    // 添加滚动状态
    const [scrolled, setScrolled] = useState(false);
    
    // 添加撤销相关的状态
    const [revertConfirmation, setRevertConfirmation] = useState<{
        show: boolean;
        commitHash: string;
        commitMessage: string;
    }>({ show: false, commitHash: '', commitMessage: '' });
    const [revertLoading, setRevertLoading] = useState(false);
    const [revertError, setRevertError] = useState<string | null>(null);
    const [revertSuccess, setRevertSuccess] = useState<string | null>(null);
    
    const showDiff = (response: string | undefined) => {
        if (!response) {
            // Replace string
            message.info(getMessage('noAssociatedCodeChanges'));
            return;
        }
        setViewingCommitId(response);
    };

    const loadQueries = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/history/validate-and-load');
            if (response.data.success) {
                setQueries(response.data.queries);
            } else {
                // Replace string
                message.error(response.data.message || getMessage('loadHistoryFailed'));
            }
        } catch (error) {
            console.error('Error loading queries:', error);
            // Replace string
            message.error(getMessage('loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    // 组件加载时自动加载数据
    React.useEffect(() => {
        loadQueries();

        // 订阅编程任务完成事件
        const unsubscribe = eventBus.subscribe(EVENTS.CODING.TASK_COMPLETE, (data) => {
            console.log('Coding task completed, reloading queries', data);
            // 任务完成后自动加载最新的历史记录
            loadQueries();
        });

        // 组件卸载时取消订阅
        return () => {
            unsubscribe();
        };
    }, []);
    
    // 处理撤销按钮点击
    const handleRevertClick = (e: React.MouseEvent, commitHash: string, commitMessage: string) => {
        e.stopPropagation(); // 阻止事件冒泡
        setRevertConfirmation({
            show: true,
            commitHash: commitHash,
            commitMessage: commitMessage
        });
    };

    // 执行撤销操作
    const confirmRevert = async () => {
        try {
            setRevertLoading(true);
            setRevertError(null);
            setRevertSuccess(null);
            
            const response = await fetch(`/api/commits/${revertConfirmation.commitHash}/revert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                // Replace string
                throw new Error(errorData.detail || getMessage('revertCommitFailed'));
            }
            
            const result = await response.json();
            // Replace string
            setRevertSuccess(`${getMessage('revertCommitSuccessPrefix')}: ${result.new_commit_hash.substring(0, 7)}`);
            
            // 关闭确认对话框，但保留成功消息一段时间
            setRevertConfirmation(prev => ({ ...prev, show: false }));
            
            // 重新加载数据以更新状态
            loadQueries();
            
            setTimeout(() => {
                setRevertSuccess(null);
            }, 5000);
        } catch (err) {
            setRevertError(err instanceof Error ? err.message : '撤销提交失败');
            console.error('Failed to revert commit:', err);
        } finally {
            setRevertLoading(false);
        }
    };

    // 取消撤销操作
    const cancelRevert = () => {
        setRevertConfirmation({ show: false, commitHash: '', commitMessage: '' });
        setRevertError(null);
    };

    // 如果当前正在查看变更，则显示DiffViewer组件
    if (viewingCommitId) {
        return (
            <DiffViewer 
                commitId={viewingCommitId} 
                onClose={() => setViewingCommitId(null)} 
            />
        );
    }

    return (
        <div className="flex flex-col bg-[#111827] overflow-hidden" style={{ height: '650px' }}>
            <div className="flex justify-between items-center p-4 bg-[#1F2937] border-b border-[#374151] sticky top-0 z-10 shadow-md">
                <Space>
                    <Button
                        icon={isAscending ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                        onClick={() => {
                            setIsAscending(!isAscending);
                            setQueries([...queries].reverse());
                        }}
                    >
                        {/* Replace string */}
                        {isAscending ? getMessage('ascending') : getMessage('descending')}
                    </Button>
                    {/* Replace string */}
                    <Button type="primary" onClick={loadQueries} loading={loading}>
                        {getMessage('refresh')}
                    </Button>
                </Space>
            </div>

            {/* 撤销确认对话框 */}
            {revertConfirmation.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
                        {/* Replace string */}
                        <h3 className="text-xl font-semibold text-white mb-4">{getMessage('confirmRevertTitle')}</h3>
                        {/* Replace string */}
                        <p className="text-gray-300 mb-6">
                            {getMessage('confirmRevertMessage')}
                        </p>
                        <div className="bg-gray-900 p-3 rounded mb-6 border border-gray-700">
                            {/* Replace string */}
                            <p className="text-sm text-gray-400 mb-1">{getMessage('commitInfoLabel')}:</p>
                            <p className="text-white">{revertConfirmation.commitMessage}</p>
                            <p className="text-xs text-gray-500 mt-2">Commit: {revertConfirmation.commitHash.substring(0, 7)}</p>
                        </div>
                        
                        {revertError && (
                            <div className="bg-red-900 bg-opacity-25 text-red-400 p-3 rounded mb-4">
                                {revertError}
                            </div>
                        )}
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                                onClick={cancelRevert}
                                disabled={revertLoading}
                            >
                                {/* Replace string */}
                                {getMessage('cancel')}
                            </button>
                            <button
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center"
                                onClick={confirmRevert}
                                disabled={revertLoading}
                            >
                                {revertLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {/* Replace string */}
                                        {getMessage('processing')}...
                                    </>
                                ) : (
                                    // Replace string
                                    <>{getMessage('confirmRevertButton')}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 成功消息提示 */}
            {revertSuccess && (
                <div className="fixed top-4 right-4 bg-green-800 text-green-100 p-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{revertSuccess}</span>
                    </div>
                </div>
            )}

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
                                                    {/* Replace string */}
                                                    {getMessage('viewContext')}
                                                </Button>
                                            )}
                                            {item.response && !item.is_reverted && (
                                                <Button
                                                    icon={<UndoOutlined />}
                                                    type="link"
                                                    style={{ color: '#F87171' }}
                                                    onClick={(e) => handleRevertClick(e, item.response as string, item.query)}
                                                >
                                                    {/* Replace string */}
                                                    {getMessage('revert')}
                                                </Button>
                                            )}
                                            <Button
                                                icon={<CodeOutlined />}
                                                type="link"
                                                style={{ color: item.response ? '#60A5FA' : '#9CA3AF' }}
                                                onClick={() => showDiff(item.response)}
                                                disabled={!item.response}
                                            >
                                                {/* Replace string */}
                                                {getMessage('viewChanges')}
                                            </Button>
                                        </div>
                                    </div>
                                }
                            >
                                <div className={`${item.is_reverted ? 'border border-red-500 rounded-lg p-2 relative' : ''}`}>
                                    {item.is_reverted && (
                                        // Replace string
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {getMessage('reverted')}
                                        </div>
                                    )}
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
                                </div>
                            </Card>
                        </List.Item>
                    )}
                />

                {/* Context Files Modal */}
                <Modal
                    // Replace string
                    title={getMessage('contextFileListTitle')}
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
                            color: '#ffffff',
                        },
                        body: {
                            backgroundColor: '#1f2937',
                            color: '#ffffff',
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
