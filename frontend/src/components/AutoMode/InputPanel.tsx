import React, { useState, useRef } from 'react';
import { getMessage } from '../Sidebar/lang';
import ExpandableEditor from './ExpandableEditor';
import SimpleEditor from './SimpleEditor';
import { HistoryCommand } from './types';

interface InputPanelProps {
  projectName: string;
  isProcessing: boolean;
  autoSearchTerm: string;
  setAutoSearchTerm: (term: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectHistoryTask?: (task: HistoryCommand) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  projectName,
  isProcessing,
  autoSearchTerm,
  setAutoSearchTerm,
  onSubmit,
  onSelectHistoryTask
}) => {
  // 状态管理
  const [isExpandedEditor, setIsExpandedEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  
  // DOM 引用
  const autoSearchInputRef = useRef<any>(null);
  const editorRef = useRef<any>(null);

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
    setIsExpandedEditor(!isExpandedEditor);
    // 如果切换到扩展模式，将当前输入框内容同步到编辑器
    if (!isExpandedEditor) {
      setEditorContent(autoSearchTerm);
    } else {
      // 如果从扩展模式切换回来，将编辑器内容同步到输入框
      setAutoSearchTerm(editorContent);
    }
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
      setAutoSearchTerm(editorContent);
      setIsExpandedEditor(false);
      // 使用 setTimeout 确保状态更新后再提交
      setTimeout(() => {
        onSubmit(new Event('submit') as unknown as React.FormEvent);
      }, 0);
    }
  };

  // 处理简单编辑器提交
  const handleSimpleEditorSubmit = () => {
    if (autoSearchTerm.trim() && !isProcessing) {
      onSubmit(new Event('submit') as unknown as React.FormEvent);
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
          />
          
          {/* 按钮容器 - 使用flex布局调整位置 */}
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
            {/* 扩展编辑器按钮 */}
            <button
              type="button"
              className="p-1 mx-1 rounded-full transition-colors bg-gray-700 hover:bg-gray-600 z-10"
              onClick={toggleExpandedEditor}
              disabled={isProcessing}
              title={getMessage('expandEditor')}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </button>
            
            {/* 提交按钮 */}
            <button
              type="submit"
              className="p-1 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors z-10"
              disabled={isProcessing || !autoSearchTerm.trim()}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default InputPanel;
