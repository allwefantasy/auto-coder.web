import React, { useState, useRef, useCallback } from 'react';
import { Input, Button, List, Card, Typography, message, Modal, Space, Radio, Tag, Tabs } from 'antd';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MessageOutlined, CodeOutlined, SortAscendingOutlined, SortDescendingOutlined, FileOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Editor, loader } from '@monaco-editor/react';

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
    const [diffModalVisible, setDiffModalVisible] = useState<boolean>(false);
    const [currentDiff, setCurrentDiff] = useState<{ diff: string, file_changes?: Array<FileChange> }>({ diff: '' });
    const [contextModalVisible, setContextModalVisible] = useState<boolean>(false);
    const [currentUrls, setCurrentUrls] = useState<string[]>([]);

    // 添加滚动状态
    const [scrolled, setScrolled] = useState(false);
    
    // 新增状态
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
    const [fileDiffLoading, setFileDiffLoading] = useState(false);
    const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split');
    const [maximizedView, setMaximizedView] = useState<'before' | 'after' | 'diff' | null>(null);
    const [currentResponse, setCurrentResponse] = useState<string | null>(null);
    
    // 编辑器引用
    const beforeEditorRef = useRef<any>(null);
    const afterEditorRef = useRef<any>(null);
    const diffEditorRef = useRef<any>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const showDiff = async (response: string | undefined) => {
        if (!response) return;
        setCurrentResponse(response);
        setSelectedFile(null);
        setFileDiff(null);
        setMaximizedView(null);

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

    // 获取文件差异详情
    const fetchFileDiff = async (filePath: string) => {
        if (!currentResponse) return;
        
        try {
            setFileDiffLoading(true);
            setFileDiff(null);
            
            // 清除编辑器实例，防止内存泄漏
            beforeEditorRef.current = null;
            afterEditorRef.current = null;
            diffEditorRef.current = null;
            
            const encodedResponseId = encodeURIComponent(currentResponse);
            const response = await axios.get(`/api/history/file-diff/${encodedResponseId}?file_path=${encodeURIComponent(filePath)}`);
            
            if (response.data.success) {
                setFileDiff(response.data.file_diff);
            } else {
                message.error(response.data.message || '获取文件差异失败');
            }
        } catch (error) {
            console.error('Error fetching file diff:', error);
            message.error('获取文件差异失败');
        } finally {
            setFileDiffLoading(false);
        }
    };

    const handleFileClick = (filePath: string) => {
        if (selectedFile === filePath) {
            setSelectedFile(null);
            setFileDiff(null);
            
            // 清除所有编辑器实例
            beforeEditorRef.current = null;
            afterEditorRef.current = null;
            diffEditorRef.current = null;
            
            // 清除最大化状态
            setMaximizedView(null);
        } else {
            setSelectedFile(filePath);
            fetchFileDiff(filePath);
            
            // 清除最大化状态
            setMaximizedView(null);
        }
    };

    // 编辑器挂载处理函数
    const handleBeforeEditorDidMount = useCallback((editor: any) => {
        beforeEditorRef.current = editor;
    }, []);
    
    const handleAfterEditorDidMount = useCallback((editor: any) => {
        afterEditorRef.current = editor;
    }, []);
    
    const handleDiffEditorDidMount = useCallback((editor: any) => {
        diffEditorRef.current = editor;
    }, []);

    // 确定文件的语言类型，用于 Monaco Editor 语法高亮
    const getLanguageForFile = (filename: string): string => {
        const extension = filename.split('.').pop()?.toLowerCase();
        const extensionMap: {[key: string]: string} = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'md': 'markdown',
            'yml': 'yaml',
            'yaml': 'yaml',
            'xml': 'xml',
            'sh': 'shell',
            'bash': 'shell',
            'txt': 'plaintext'
        };
        
        return extensionMap[extension || ''] || 'plaintext';
    };

    // 清除最大化状态
    const clearMaximizedView = () => {
        setMaximizedView(null);
    };

    // 渲染文件差异视图
    const renderFileDiffView = () => {
        if (!selectedFile || !fileDiff) return null;
        
        const language = getLanguageForFile(selectedFile);
        const diffKey = `diff-${currentResponse}-${selectedFile}-${diffViewMode}`;
        const beforeKey = `before-${currentResponse}-${selectedFile}`;
        const afterKey = `after-${currentResponse}-${selectedFile}`;
        
        // 基本编辑器选项
        const editorOptions = {
            readOnly: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            lineNumbers: 'on' as const,
            wordWrap: 'on' as const,
            automaticLayout: true,
            scrollbar: {
                vertical: 'visible' as const,
                horizontal: 'visible' as const,
                verticalScrollbarSize: 14,
                horizontalScrollbarSize: 14
            }
        };
        
        // 最大化/正常化按钮
        const MaximizeButton = ({ viewType }: { viewType: 'before' | 'after' | 'diff' }) => {
            const isMaximized = maximizedView === viewType;
            
            return (
                <button
                    className="ml-2 text-gray-400 hover:text-white transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMaximizedView(isMaximized ? null : viewType);
                    }}
                    title={isMaximized ? "恢复正常视图" : "最大化视图"}
                >
                    {isMaximized ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                    )}
                </button>
            );
        };
        
        if (diffViewMode === 'unified') {
            // 统一视图模式 - 只显示差异
            return (
                <div ref={editorContainerRef} className="bg-gray-900 rounded-lg border border-gray-700" style={{ height: '500px', width: '100%', overflow: 'hidden' }}>
                    <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
                        <span>差异视图</span>
                        <MaximizeButton viewType="diff" />
                    </div>
                    <Editor
                        key={diffKey}
                        height="calc(100% - 26px)"
                        width="100%"
                        defaultLanguage="diff"
                        value={fileDiff.diff_content || ''}
                        theme="vs-dark"
                        onMount={handleDiffEditorDidMount}
                        options={editorOptions}
                        loading={<div className="flex items-center justify-center h-full text-gray-400">加载中...</div>}
                    />
                </div>
            );
        }
        
        // 分割视图模式
        return (
            <div ref={editorContainerRef} className="grid grid-cols-3 gap-2" style={{ height: '500px', width: '100%' }}>
                {/* 根据最大化状态决定是否显示各个视图 */}
                {(maximizedView === null || maximizedView === 'before') && (
                    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${maximizedView === 'before' ? 'col-span-3' : ''}`} style={{ overflow: 'hidden' }}>
                        <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
                            <span>修改前 ({fileDiff.file_status === 'added' ? '新文件' : selectedFile})</span>
                            <MaximizeButton viewType="before" />
                        </div>
                        <Editor
                            key={beforeKey}
                            height="calc(100% - 26px)"
                            width="100%"
                            defaultLanguage={language}
                            value={fileDiff.before_content || ''}
                            theme="vs-dark"
                            onMount={handleBeforeEditorDidMount}
                            options={editorOptions}
                            loading={<div className="flex items-center justify-center h-full text-gray-400">加载中...</div>}
                        />
                    </div>
                )}
                
                {/* 更改后代码 */}
                {(maximizedView === null || maximizedView === 'after') && (
                    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${maximizedView === 'after' ? 'col-span-3' : ''}`} style={{ overflow: 'hidden' }}>
                        <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
                            <span>修改后 ({fileDiff.file_status === 'deleted' ? '文件已删除' : selectedFile})</span>
                            <MaximizeButton viewType="after" />
                        </div>
                        <Editor
                            key={afterKey}
                            height="calc(100% - 26px)"
                            width="100%"
                            defaultLanguage={language}
                            value={fileDiff.after_content || ''}
                            theme="vs-dark"
                            onMount={handleAfterEditorDidMount}
                            options={editorOptions}
                            loading={<div className="flex items-center justify-center h-full text-gray-400">加载中...</div>}
                        />
                    </div>
                )}
                
                {/* 差异视图 */}
                {(maximizedView === null || maximizedView === 'diff') && (
                    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${maximizedView === 'diff' ? 'col-span-3' : ''}`} style={{ overflow: 'hidden' }}>
                        <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
                            <span>差异视图</span>
                            <MaximizeButton viewType="diff" />
                        </div>
                        <Editor
                            key={`diff-inline-${currentResponse}-${selectedFile}`}
                            height="calc(100% - 26px)"
                            width="100%"
                            defaultLanguage="diff"
                            value={fileDiff.diff_content || ''}
                            theme="vs-dark"
                            onMount={handleDiffEditorDidMount}
                            options={editorOptions}
                            loading={<div className="flex items-center justify-center h-full text-gray-400">加载中...</div>}
                        />
                    </div>
                )}
            </div>
        );
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
                                            <Button
                                                icon={<CodeOutlined />}
                                                type="link"
                                                style={{ color: item.response ? '#60A5FA' : '#9CA3AF' }}
                                                onClick={() => {
                                                    if (item.response) {
                                                        showDiff(item.response);
                                                    } else {
                                                        message.info('该消息没有关联的代码变更');
                                                    }
                                                }}
                                                disabled={!item.response}
                                            >
                                                查看变更
                                            </Button>
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
                    title="代码变更详情"
                    open={diffModalVisible}
                    onCancel={() => {
                        setDiffModalVisible(false);
                        setSelectedFile(null);
                        setFileDiff(null);
                        setMaximizedView(null);
                    }}
                    width={1000}
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
                    <div className="flex flex-col h-full">
                        <Tabs type="card" className="dark-tabs">
                            <TabPane tab="文件列表" key="1">
                                <div className="mb-4">
                                    {/* 文件列表视图 */}
                                    <div className="space-y-2 mb-4">
                                        {currentDiff.file_changes && currentDiff.file_changes.length > 0 ? (
                                            currentDiff.file_changes.map((file, index) => (
                                                <div 
                                                    key={index} 
                                                    className={`text-sm py-2 px-3 rounded cursor-pointer ${
                                                        selectedFile === file.path 
                                                            ? 'bg-gray-700 border-l-2 border-indigo-500' 
                                                            : 'hover:bg-gray-750 bg-gray-800'
                                                    }`}
                                                    onClick={() => handleFileClick(file.path)}
                                                >
                                                    <div className="flex items-center">
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                                            file.change_type === 'added' ? 'bg-green-500' :
                                                            file.change_type === 'modified' ? 'bg-yellow-500' :
                                                            file.change_type === 'deleted' ? 'bg-red-500' : 'bg-blue-500'
                                                        }`}></span>
                                                        <span className={`font-mono ${
                                                            file.change_type === 'deleted' ? 'line-through text-gray-500' : 'text-gray-300'
                                                        }`}>
                                                            {file.path}
                                                        </span>
                                                        <FileOutlined className="ml-2 text-gray-400" />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-400 py-8">
                                                <p>没有文件变更信息</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* 文件差异加载状态 */}
                                {fileDiffLoading && (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                    </div>
                                )}
                                
                                {/* 视图模式切换按钮 */}
                                {selectedFile && fileDiff && !fileDiffLoading && (
                                    <div className="flex justify-end mb-3">
                                        <Radio.Group 
                                            value={diffViewMode} 
                                            onChange={(e) => setDiffViewMode(e.target.value)}
                                            buttonStyle="solid"
                                        >
                                            <Radio.Button value="split">分割视图</Radio.Button>
                                            <Radio.Button value="unified">统一视图</Radio.Button>
                                        </Radio.Group>
                                    </div>
                                )}
                                
                                {/* 文件差异视图 */}
                                {selectedFile && fileDiff && !fileDiffLoading && renderFileDiffView()}
                            </TabPane>
                            <TabPane tab="原始差异" key="2">
                                <SyntaxHighlighter
                                    language="diff"
                                    style={vscDarkPlus}
                                    customStyle={{
                                        padding: '12px',
                                        borderRadius: '4px',
                                        overflow: 'auto',
                                        maxHeight: '600px'
                                    }}
                                >
                                    {currentDiff.diff}
                                </SyntaxHighlighter>
                            </TabPane>
                        </Tabs>
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
