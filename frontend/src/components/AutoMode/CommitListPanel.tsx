import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMessage } from '../../lang';
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

interface Commit {
  id: string;
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
  stats: {
    insertions: number;
    deletions: number;
    files_changed: number;
  };
}

interface FileChange {
  filename: string;
  status: string;
  changes?: {
    insertions: number;
    deletions: number;
  };
}

interface FileDiff {
  before_content: string;
  after_content: string;
  diff_content: string;
  file_status: string;
}

interface CommitListPanelProps {
  projectName: string;
}

const CommitListPanel: React.FC<CommitListPanelProps> = ({ projectName }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [commitDetails, setCommitDetails] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
  const [fileDiffLoading, setFileDiffLoading] = useState(false);
  const [fileDiffError, setFileDiffError] = useState<string | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split');
  // 添加最大化状态，用于跟踪当前哪个视图被最大化
  const [maximizedView, setMaximizedView] = useState<'before' | 'after' | 'diff' | null>(null);
  
  // 使用refs来保存编辑器实例
  const beforeEditorRef = useRef<any>(null);
  const afterEditorRef = useRef<any>(null);
  const diffEditorRef = useRef<any>(null);
  
  // 重新定义容器refs和状态变量
  const containerRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState("400px");
  const [editorWidth, setEditorWidth] = useState("100%");
  
  // 防抖函数
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function(...args: any[]) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // 使用useCallback包装updateEditorDimensions以避免不必要的重新创建
  const updateEditorDimensions = useCallback(debounce(() => {
    if (containerRef.current && editorContainerRef.current) {
      const containerRect = editorContainerRef.current.getBoundingClientRect();
      const topOffset = containerRect.top;
      const windowHeight = window.innerHeight;
      const availableHeight = windowHeight - topOffset - 40; // 40px是底部边距
      
      // 保证最小高度300px，最大不超过可用高度
      const newHeight = Math.max(300, Math.min(availableHeight, 600));
      setEditorHeight(`${newHeight}px`);
      
      // 设置宽度为容器宽度
      setEditorWidth(`${containerRect.width}px`);
    }
  }, 100), []);

  useEffect(() => {
    fetchCommits();
    
    // 初始化时计算一次
    updateEditorDimensions();
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateEditorDimensions);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', updateEditorDimensions);
      // 清除编辑器实例
      beforeEditorRef.current = null;
      afterEditorRef.current = null;
      diffEditorRef.current = null;
    };
  }, [updateEditorDimensions]);

  const fetchCommits = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/commits');
      
      if (!response.ok) {
        throw new Error(`Error fetching commits: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCommits(data.commits);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Failed to fetch commits:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommitDetails = async (hash: string) => {
    try {
      setCommitDetails(null);
      const response = await fetch(`/api/commits/${hash}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching commit details: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCommitDetails(data);
    } catch (err) {
      console.error('Failed to fetch commit details:', err);
    }
  };

  const fetchFileDiff = async (hash: string, filePath: string) => {
    try {
      setFileDiffLoading(true);
      setFileDiffError(null);
      setFileDiff(null);
      
      // 清除编辑器实例，防止内存泄漏
      beforeEditorRef.current = null;
      afterEditorRef.current = null;
      diffEditorRef.current = null;
      
      // 稍微延迟，确保DOM已更新
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const response = await fetch(`/api/commits/${hash}/file?file_path=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching file diff: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFileDiff(data);
      
      // 获取差异后重新计算编辑器尺寸
      setTimeout(updateEditorDimensions, 50);
    } catch (err) {
      setFileDiffError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Failed to fetch file diff:', err);
    } finally {
      setFileDiffLoading(false);
    }
  };

  const handleCommitClick = (hash: string) => {
    if (selectedCommit === hash) {
      setSelectedCommit(null);
      setCommitDetails(null);
      setSelectedFile(null);
      setFileDiff(null);
      
      // 清除所有编辑器实例
      beforeEditorRef.current = null;
      afterEditorRef.current = null;
      diffEditorRef.current = null;
      
      // 清除最大化状态
      clearMaximizedView();
    } else {
      setSelectedCommit(hash);
      fetchCommitDetails(hash);
      setSelectedFile(null);
      setFileDiff(null);
      
      // 清除最大化状态
      clearMaximizedView();
    }
  };

  // 清除最大化状态
  const clearMaximizedView = () => {
    setMaximizedView(null);
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
      clearMaximizedView();
    } else {
      setSelectedFile(filePath);
      if (selectedCommit) {
        fetchFileDiff(selectedCommit, filePath);
      }
      
      // 清除最大化状态
      clearMaximizedView();
    }
  };

  // 编辑器挂载处理函数，使用useCallback避免重新创建
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

  // 格式化日期为更友好的格式
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // 修改renderFileDiffView函数
  const renderFileDiffView = () => {
    if (!selectedFile || !fileDiff) return null;
    
    const language = getLanguageForFile(selectedFile);
    const diffKey = `diff-${selectedCommit}-${selectedFile}-${diffViewMode}`;
    const beforeKey = `before-${selectedCommit}-${selectedFile}`;
    const afterKey = `after-${selectedCommit}-${selectedFile}`;
    
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
            // 设置状态后重新计算尺寸
            setTimeout(updateEditorDimensions, 50);
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
        <div ref={editorContainerRef} className="bg-gray-900 rounded-lg border border-gray-700" style={{ height: editorHeight, width: editorWidth, overflow: 'hidden' }}>
          <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
            <span>{getMessage('diffView')}</span>
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
            loading={<div className="flex items-center justify-center h-full text-gray-400">Loading diff view...</div>}
          />
        </div>
      );
    }
    
    // 分割视图模式
    return (
      <div ref={editorContainerRef} className="grid grid-cols-3 gap-2" style={{ height: editorHeight, width: editorWidth }}>
        {/* 根据最大化状态决定是否显示各个视图 */}
        {(maximizedView === null || maximizedView === 'before') && (
          <div className={`bg-gray-900 rounded-lg border border-gray-700 ${maximizedView === 'before' ? 'col-span-3' : ''}`} style={{ overflow: 'hidden' }}>
            <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
              <span>{getMessage('beforeChange')} ({fileDiff.file_status === 'added' ? getMessage('newFile') : selectedFile})</span>
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
              loading={<div className="flex items-center justify-center h-full text-gray-400">Loading...</div>}
            />
          </div>
        )}
        
        {/* 更改后代码 */}
        {(maximizedView === null || maximizedView === 'after') && (
          <div className={`bg-gray-900 rounded-lg border border-gray-700 ${maximizedView === 'after' ? 'col-span-3' : ''}`} style={{ overflow: 'hidden' }}>
            <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
              <span>{getMessage('afterChange')} ({fileDiff.file_status === 'deleted' ? getMessage('fileDeleted') : selectedFile})</span>
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
              loading={<div className="flex items-center justify-center h-full text-gray-400">Loading...</div>}
            />
          </div>
        )}
        
        {/* 差异视图 */}
        {(maximizedView === null || maximizedView === 'diff') && (
          <div className={`bg-gray-900 rounded-lg border border-gray-700 ${maximizedView === 'diff' ? 'col-span-3' : ''}`} style={{ overflow: 'hidden' }}>
            <div className="py-1 px-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-300 flex justify-between items-center">
              <span>{getMessage('diffView')}</span>
              <MaximizeButton viewType="diff" />
            </div>
            <Editor
              key={`diff-inline-${selectedCommit}-${selectedFile}`}
              height="calc(100% - 26px)"
              width="100%"
              defaultLanguage="diff"
              value={fileDiff.diff_content || ''}
              theme="vs-dark"
              onMount={handleDiffEditorDidMount}
              options={editorOptions}
              loading={<div className="flex items-center justify-center h-full text-gray-400">Loading...</div>}
            />
          </div>
        )}
      </div>
    );
  };

  if (loading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error && commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 text-red-400">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-lg font-medium mb-2">Error Loading Commits</p>
        <p className="text-sm">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white transition-colors"
          onClick={fetchCommits}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-white">
          {getMessage('commitHistory', { project: projectName })}
        </h2>
        <button 
          onClick={fetchCommits}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium mb-2">No Commit History</p>
          <p className="text-sm">This repository has no commits yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2">
          {commits.map((commit) => (
            <div key={commit.hash} className="mb-4">
              <div 
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedCommit === commit.hash 
                    ? 'bg-gray-700 border-l-4 border-indigo-500' 
                    : 'bg-gray-800 hover:bg-gray-750'
                }`}
                onClick={() => handleCommitClick(commit.hash)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-white font-medium mb-2 flex-1 mr-2">{commit.message}</h3>
                  <span className="text-xs font-mono text-gray-400 whitespace-nowrap">{commit.short_hash}</span>
                </div>
                
                <div className="flex items-center text-xs text-gray-400 mt-2">
                  <span>{commit.author}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(commit.date)}</span>
                </div>
                
                <div className="flex items-center mt-3 text-xs">
                  <span className="flex items-center text-green-400 mr-3">
                    <span className="font-mono mr-1">+{commit.stats.insertions}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </span>
                  <span className="flex items-center text-red-400 mr-3">
                    <span className="font-mono mr-1">-{commit.stats.deletions}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </span>
                  <span className="text-gray-400">
                    {commit.stats.files_changed} file{commit.stats.files_changed !== 1 ? 's' : ''} changed
                  </span>
                </div>
              </div>
              
              {/* 提交详情展开区域 */}
              {selectedCommit === commit.hash && commitDetails && (
                <div className="mt-2 pl-4 border-l-2 border-gray-700">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white text-sm font-medium">Changed Files</h4>
                      
                      {/* 视图切换按钮 */}
                      {selectedFile && fileDiff && !fileDiffLoading && (
                        <div className="flex space-x-2">
                          <button
                            className={`px-2 py-1 text-xs rounded ${diffViewMode === 'split' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            onClick={() => {
                              setDiffViewMode('split');
                              // 设置模式后重新计算尺寸
                              setTimeout(updateEditorDimensions, 50);
                            }}
                          >
                            {getMessage('splitView')}
                          </button>
                          <button
                            className={`px-2 py-1 text-xs rounded ${diffViewMode === 'unified' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            onClick={() => {
                              setDiffViewMode('unified');
                              // 设置模式后重新计算尺寸
                              setTimeout(updateEditorDimensions, 50);
                            }}
                          >
                            {getMessage('unifiedView')}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* 文件列表 */}
                    <div className="space-y-2 mb-4">
                      {commitDetails.files.map((file: FileChange, index: number) => (
                        <div 
                          key={index} 
                          className={`text-sm py-2 px-3 rounded cursor-pointer ${
                            selectedFile === file.filename 
                              ? 'bg-gray-700 border-l-2 border-indigo-500' 
                              : 'hover:bg-gray-750'
                          }`}
                          onClick={() => handleFileClick(file.filename)}
                        >
                          <div className="flex items-center">
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              file.status === 'added' ? 'bg-green-500' :
                              file.status === 'modified' ? 'bg-yellow-500' :
                              file.status === 'deleted' ? 'bg-red-500' : 'bg-blue-500'
                            }`}></span>
                            <span className={`font-mono ${
                              file.status === 'deleted' ? 'line-through text-gray-500' : 'text-gray-300'
                            }`}>
                              {file.filename}
                            </span>
                          </div>
                          <div className="flex text-xs mt-1 ml-4">
                            {file.changes && (
                              <>
                                {file.changes.insertions > 0 && (
                                  <span className="text-green-400 mr-3">+{file.changes.insertions}</span>
                                )}
                                {file.changes.deletions > 0 && (
                                  <span className="text-red-400">-{file.changes.deletions}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* 文件差异加载状态 */}
                    {fileDiffLoading && (
                      <div className="flex items-center justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      </div>
                    )}
                    
                    {/* 文件差异错误信息 */}
                    {fileDiffError && (
                      <div className="text-red-400 text-sm p-4 bg-red-900 bg-opacity-25 rounded-lg">
                        <p className="font-medium">Error loading file diff:</p>
                        <p>{fileDiffError}</p>
                      </div>
                    )}
                    
                    {/* 文件差异视图 */}
                    {selectedFile && fileDiff && !fileDiffLoading && !fileDiffError && renderFileDiffView()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommitListPanel; 