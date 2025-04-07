import React, { useState, useRef } from 'react';
import { getMessage } from '../Sidebar/lang';
import ExpandableEditor from './ExpandableEditor';
import SimpleEditor from './SimpleEditor';
import { HistoryCommand } from './types';
import { autoCommandService } from '../../services/autoCommandService';

interface InputPanelProps {
  projectName: string;
  isProcessing: boolean;
  autoSearchTerm: string;
  setAutoSearchTerm: (term: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectHistoryTask?: (task: HistoryCommand) => void;
  currentEventFileId?: string | null;
}

const InputPanel: React.FC<InputPanelProps> = ({
  projectName,
  isProcessing,
  autoSearchTerm,
  setAutoSearchTerm,
  onSubmit,
  onSelectHistoryTask,
  currentEventFileId
}) => {
  // 状态管理
  const [isExpandedEditor, setIsExpandedEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  // 添加取消任务的加载状态
  const [isCancelling, setIsCancelling] = useState(false);
  
  // DOM 引用
  const autoSearchInputRef = useRef<any>(null);
  const editorRef = useRef<any>(null);

  // 监听任务完成事件
  React.useEffect(() => {
    const handleTaskComplete = (isError: boolean) => {
      // 任务完成(包括错误)时重置取消加载状态
      setIsCancelling(false);
    };

    // 添加任务完成事件监听器
    autoCommandService.on('taskComplete', handleTaskComplete);

    // 清理函数
    return () => {
      autoCommandService.off('taskComplete', handleTaskComplete);
    };
  }, []);
  
  // 添加调试日志，检查 InputPanel 接收到的属性
  // React.useEffect(() => {
  //   console.log('InputPanel Debug Info:');
  //   console.log('- isProcessing:', isProcessing);
  //   console.log('- currentEventFileId:', currentEventFileId);
  // }, [isProcessing, currentEventFileId]);

  // 处理编辑器挂载
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    // 设置初始内容
    if (autoSearchTerm) {
      setEditorContent(autoSearchTerm);
    }
    
    // 聚焦编辑器
    editor.focus();
  };

  // 切换到扩展编辑器模式
  const toggleExpandedEditor = () => {
    // 如果切换到扩展模式，将当前输入框内容同步到编辑器
    if (!isExpandedEditor) {
      setEditorContent(autoSearchTerm);
    } else {
      // 如果从扩展模式切换回来，将编辑器内容同步到输入框
      setAutoSearchTerm(editorContent);
    }
    // 切换编辑器状态 - 放在后面确保内容同步先完成
    setIsExpandedEditor(!isExpandedEditor);
  };

  // 处理编辑器内容变更
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };

  // 从编辑器提交内容
  const handleEditorSubmit = () => {
    if (editorContent.trim()) {
      // 先更新状态并关闭编辑器
      setAutoSearchTerm(editorContent);
      setIsExpandedEditor(false);
      
      // 使用 setTimeout 确保状态更新完成后再提交
      setTimeout(() => {
        // 创建一个简单的事件对象
        const formEvent = new Event('submit') as unknown as React.FormEvent;
        
        // 直接修改 autoSearchTerm 的值为当前编辑器内容，确保在提交时使用最新的内容
        // 这是一个直接的方法，确保在提交时 autoSearchTerm 已经更新
        (window as any).lastEditorContent = editorContent;
        
        // 调用提交函数
        onSubmit(formEvent);
      }, 50);
    }
  };

  // 处理简单编辑器提交
  const handleSimpleEditorSubmit = () => {
    if (autoSearchTerm.trim() && !isProcessing) {
      // 创建一个简单的 FormEvent 对象
      const formEvent = new Event('submit') as unknown as React.FormEvent;
      onSubmit(formEvent);
    }
  };

  // 处理取消任务
  const handleCancelTask = async (eventFileId: string) => {
    // 设置取消中状态
    setIsCancelling(true);
    
    try {
      const response = await fetch('/api/auto-command/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_file_id: eventFileId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel task: ${response.statusText}`);
      }
      
      // 取消请求已发送，但不要重置isCancelling状态
      // 它将在收到autoCommandService的任务完成事件时重置
      console.log(`Task ${eventFileId} cancellation request sent`);
    } catch (error) {
      console.error('Error cancelling task:', error);
      // 发生错误时重置取消状态
      setIsCancelling(false);
      // 显示错误提示
      alert(`Failed to cancel task: ${error}`);
    }
  };

  return (
    <>
      {/* 扩展编辑器模态框 */}
      {isExpandedEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-4 border border-gray-700 flex flex-col h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-white">{getMessage('expandedEditor')}</h3>
              <button 
                onClick={toggleExpandedEditor}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden border border-gray-700 rounded-md mb-3">
              <div className="h-full w-full">
                <ExpandableEditor
                  initialContent={autoSearchTerm}
                  onContentChange={handleEditorChange}
                  onEditorReady={handleEditorDidMount}
                  onSubmit={handleEditorSubmit}
                  onToggleCollapse={toggleExpandedEditor}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="px-5 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                onClick={toggleExpandedEditor}
              >
                {getMessage('cancel')}
              </button>
              <button
                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleEditorSubmit}
                disabled={!editorContent.trim()}
              >
                {getMessage('submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 聊天表单 - 使用 SimpleEditor 组件 */}
      <form onSubmit={onSubmit} className="w-full relative mb-4 max-w-3xl mx-auto px-3 sm:px-0">
        <div className="w-full relative">
          {/* 机器人图标 - 左侧 */}
          <div className="absolute left-3.5 top-0 bottom-0 flex items-center z-10">
            <svg className="w-4 h-4 text-purple-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z" />
            </svg>
          </div>
          
          {/* 使用 SimpleEditor 替换原有的输入框 */}
          <SimpleEditor
            ref={autoSearchInputRef}
            value={autoSearchTerm}
            onChange={setAutoSearchTerm}
            onSubmit={handleSimpleEditorSubmit}
            disabled={isProcessing}
            placeholder={`${getMessage('searchIn')} ${projectName || getMessage('yourProject')}`}
            onToggleExpand={toggleExpandedEditor}
            onSelectHistoryTask={onSelectHistoryTask}
            isProcessing={isProcessing}
            currentEventFileId={currentEventFileId}
            onCancelTask={handleCancelTask}
            isCancelling={isCancelling}
          />
        </div>
      </form>
    </>
  );
};

export default InputPanel;
