import React, { useState, useRef } from 'react';
import { getMessage } from '../Sidebar/lang';
import ExpandableEditor from './ExpandableEditor';
import SimpleEditor from './SimpleEditor';

interface InputPanelProps {
  projectName: string;
  isProcessing: boolean;
  autoSearchTerm: string;
  setAutoSearchTerm: (term: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  projectName,
  isProcessing,
  autoSearchTerm,
  setAutoSearchTerm,
  onSubmit
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
      <form onSubmit={onSubmit} className="w-full relative mb-6">
        <div className="w-full relative">
          {/* 使用 SimpleEditor 替换原有的输入框 */}
          <SimpleEditor
            ref={autoSearchInputRef}
            value={autoSearchTerm}
            onChange={setAutoSearchTerm}
            onSubmit={handleSimpleEditorSubmit}
            disabled={isProcessing}
            placeholder={`${getMessage('searchIn')} ${projectName || getMessage('yourProject')}`}
            onToggleExpand={toggleExpandedEditor}
          />
          
          {/* 扩展编辑器按钮 */}
          <button
            type="button"
            className="absolute right-14 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors bg-gray-700 hover:bg-gray-600 z-10"
            onClick={toggleExpandedEditor}
            disabled={isProcessing}
            title={getMessage('expandEditor')}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          
          {/* 提交按钮 - 位于输入框右侧的搜索图标 */}
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors z-10"
            disabled={isProcessing || !autoSearchTerm.trim()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>
    </>
  );
};

export default InputPanel;
