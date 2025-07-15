import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { Message as ServiceMessage, HistoryCommand } from './types';
import { uploadImage } from '../../services/api';
import { getMessage } from '../../lang';
// 导入 monaco 编辑器类型
import * as monaco from 'monaco-editor';

// 定义 CompletionItem 类型用于自动完成
interface CompletionItem {
  display: string;
  path: string;
  location?: string;
}

// 配置 Monaco Editor loader
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn'
    }
  }
});

export interface SimpleEditorProps {
  /** 输入框的当前值 */
  value: string;
  /** 输入框的占位符 */
  placeholder?: string;
  /** 当值变化时的回调 */
  onChange: (value: string) => void;
  /** 当按下提交快捷键时的回调 */
  onSubmit: () => void;
  /** 是否禁用输入 */
  disabled?: boolean;
  /** 切换到扩展编辑器的回调 */
  onToggleExpand?: () => void;
  /** 选择历史任务的回调 */
  onSelectHistoryTask?: (task: HistoryCommand) => void;
  /** 当前是否有任务在处理中 */
  isProcessing?: boolean;
  /** 当前正在运行的事件文件ID */
  currentEventFileId?: string | null;
  /** 取消当前任务的回调 */
  onCancelTask?: (eventFileId: string) => void;
  /** 是否正在取消任务 */
  isCancelling?: boolean;
}

/**
 * 简单编辑器组件，支持 @ 和 @@ 自动完成功能
 * 专为聊天输入框设计，轻量且高效
 */
const SimpleEditor = forwardRef<any, SimpleEditorProps>(({
  value,
  placeholder = '',
  onChange,
  onSubmit,
  disabled = false,
  onToggleExpand,
  onSelectHistoryTask,
  isProcessing = false,
  currentEventFileId,
  onCancelTask,
  isCancelling = false
}, ref) => {
  // 编辑器引用
  const editorRef = useRef<any>(null);
  
  // 历史命令状态
  const [showHistory, setShowHistory] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [taskHistory, setTaskHistory] = useState<HistoryCommand[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = async (file: File) => {
    try {
      // 添加上传中状态反馈
      const editor = editorRef.current;
      if (editor) {
        const position = editor.getPosition();
        const loadingId = editor.executeEdits('', [{
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: `![${getMessage('simpleEditor.imageUploading')}...]()  `,
          forceMoveMarkers: true
        }]);

        // 上传图片
        const response = await uploadImage(file);
        // console.log('Image upload response:', response);
        if (response.success) {
          // 获取当前光标位置
          const currentPosition = editor.getPosition();

          // 查找上传中文本的位置
          const model = editor.getModel();
          const content = model.getValue();
          const loadingTextPos = content.indexOf('![上传中...]()');

          if (loadingTextPos !== -1) {
            // 计算行和列
            let line = 1;
            let col = 1;
            for (let i = 0; i < loadingTextPos; i++) {
              if (content[i] === '\n') {
                line++;
                col = 1;
              } else {
                col++;
              }
            }

            // 替换上传中文本
            editor.executeEdits('', [{
              range: new monaco.Range(
                line,
                col,
                line,
                col + '![上传中...]()'.length
              ),
              text: `<_image_>${response.path}</_image_>`,
              forceMoveMarkers: true
            }]);
          } else {
            // 如果找不到上传中文本，则在当前位置插入
            editor.executeEdits('', [{
              range: new monaco.Range(
                currentPosition.lineNumber,
                currentPosition.column,
                currentPosition.lineNumber,
                currentPosition.column
              ),
              text: `<_image_>${response.path}</_image_>`,
              forceMoveMarkers: true
            }]);
          }
        } else {
          console.error('Image upload failed:', response);
        }
      }
    } catch (error) {
      console.error('Image upload failed:', error);

      // 显示错误信息
      const editor = editorRef.current;
      if (editor) {
        const position = editor.getPosition();
        editor.executeEdits('', [{
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
              text: ` [${getMessage('simpleEditor.imageUploadFailed')}] `,
          forceMoveMarkers: true
        }]);
      }
    }
  };
  
  // 加载历史命令
  useEffect(() => {
    const loadCommandHistory = async () => {
      try {
        // 尝试从 localStorage 加载历史命令
        const savedHistory = localStorage.getItem('commandHistory');
        if (savedHistory) {
          setCommandHistory(JSON.parse(savedHistory));
        }
        
        // 从服务器加载任务历史
        await loadTaskHistory();
      } catch (error) {
        console.error(getMessage('dev.simpleEditor.loadCommandHistory'), error);
      }
    };
    
    loadCommandHistory();
  }, []);
  
  // 加载任务历史
  const loadTaskHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch('/api/auto-command/history');
      if (response.ok) {
        const data = await response.json();
        setTaskHistory(data.tasks || []);
      }
    } catch (error) {
      console.error(getMessage('dev.simpleEditor.loadTaskHistory'), error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // 添加调试日志，检查取消按钮所需的条件
  // useEffect(() => {
  //   console.log('SimpleEditor Debug Info:');
  //   console.log('- isProcessing:', isProcessing);
  //   console.log('- currentEventFileId:', currentEventFileId);
  //   console.log('- onCancelTask exists:', !!onCancelTask);
  //   console.log('- Should show cancel button:', isProcessing && currentEventFileId && onCancelTask);
  // }, [isProcessing, currentEventFileId, onCancelTask]);
  
  // 当历史弹窗打开时刷新数据
  useEffect(() => {
    if (showHistory) {
      loadTaskHistory();
    }
  }, [showHistory]);
  
  // 保存命令到历史
  const saveCommandToHistory = (command: string) => {
    if (command.trim() === '') return;
    
    setCommandHistory(prev => {
      // 移除重复命令
      const filtered = prev.filter(cmd => cmd !== command);
      // 将新命令放在最前面，最多保存20条历史记录
      const newHistory = [command, ...filtered].slice(0, 20);
      // 保存到 localStorage
      localStorage.setItem('commandHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };
  
  // 选择历史命令
  const selectHistoryCommand = (command: string) => {
    onChange(command);
    setShowHistory(false);
    // 聚焦编辑器
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };
  
  // 选择任务历史
  const selectTaskHistory = (command: HistoryCommand) => {
    onChange(command.query);
    setShowHistory(false);
    // 如果提供了历史任务选择回调，则调用它
    if (onSelectHistoryTask) {
      onSelectHistoryTask(command);
    }
    // 聚焦编辑器
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };
  
  // 监听点击外部关闭历史列表
  useEffect(() => {
    // 添加粘贴图片支持
    const handlePaste = async (e: ClipboardEvent) => {
      // 只处理当编辑器获得焦点时的粘贴事件
      if (document.activeElement !== editorRef.current &&
        !editorRef.current?.contains(document.activeElement)) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            // 阻止默认粘贴行为
            e.preventDefault();

            // 获取图片文件
            const file = items[i].getAsFile();
            if (file) {
              await handleImageUpload(file);
              break;
            }
          }
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    
    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // 添加粘贴事件监听器到document
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // 移除粘贴事件监听
      document.removeEventListener('paste', handlePaste);
    };
  }, [showHistory]);
  
  // 提交时保存命令到历史
  const handleSubmitWithHistory = () => {
    saveCommandToHistory(value);
    onSubmit();
  };
  
  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    },
    editor: editorRef.current
  }));

  // 编辑器挂载处理
  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor;
    
    // 设置初始值和占位符
    if (!value && placeholder) {
      editor.updateOptions({
        padding: { top: 12, bottom: 12 },
      });
    }
    
    // 添加提交快捷键 (Ctrl/Cmd + Enter)
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      if (value.trim()) {
        saveCommandToHistory(value);
      }
      onSubmit();
    });
    
    // 添加切换扩展编辑器的快捷键 (可选) (Ctrl/Cmd + L)
    if (onToggleExpand) {
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyL, () => {
        onToggleExpand();
      });
    }

     // 添加粘贴事件监听器到编辑器实例
    editor.onDidPaste(() => {
      // 编辑器已经处理了粘贴，我们只需要检查是否有图片
      setTimeout(() => {
        // 延迟检查，确保系统粘贴事件已处理
        const clipboardItems = navigator.clipboard && navigator.clipboard.read ?
          navigator.clipboard.read().catch(() => null) : null;

        if (clipboardItems) {
          clipboardItems.then(items => {
            if (items) {  // 添加null检查
              for (const item of items) {
                // 检查是否有图片类型
                if (item.types && item.types.some(type => type.startsWith('image/'))) {
                  const imageType = item.types.find(type => type.startsWith('image/'));
                  if (imageType) {
                    item.getType(imageType).then(blob => {
                      const file = new File([blob], "pasted-image.png", { type: imageType });
                      handleImageUpload(file);
                    }).catch(e => console.error("获取图片失败:", e));
                  }
                }
              }
            }
          }).catch(e => console.error("读取剪贴板失败:", e));
        }
      }, 0);
    });

    
    // 注册自动完成提供者 - 支持 @文件 和 @@符号
    monacoInstance.languages.registerCompletionItemProvider('markdown', {
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

        // 获取当前词
        const wordText = word.word;

        console.log('prefix:', prefix, 'word:', wordText);

        if (prefix === "@" && double_prefix === "@") {
          // 符号补全 (@@)
          const query = wordText;
          const response = await fetch(`/api/completions/symbols?name=${encodeURIComponent(query)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: CompletionItem) => ({
              label: item.display,
              kind: monacoInstance.languages.CompletionItemKind.Function,
              insertText: item.path,
              detail: "",
              documentation: `Location: ${item.path}`,
            })),
            incomplete: true
          };
        } else if (prefix === "@") {
          // 文件补全 (@)
          const query = wordText;
          const response = await fetch(`/api/completions/files?name=${encodeURIComponent(query)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: CompletionItem) => ({
              label: item.display,
              kind: monacoInstance.languages.CompletionItemKind.File,
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

  return (
    <div className="w-full h-9 rounded-full overflow-hidden bg-gray-800 border border-gray-700 shadow-lg pl-16 pr-16">
      {/* 机器人图标（保持现有样式） */}
      <div className="absolute left-3.5 top-0 bottom-0 flex items-center z-10">
        <svg className="w-4 h-4 text-purple-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z" />
        </svg>
      </div>
      
      {/* 历史命令按钮 - 始终显示在原位置，不再与取消按钮切换 */}
      <div className="absolute left-10 top-0 bottom-0 flex items-center z-10">
        <button
          type="button"
          className="p-1 rounded-full text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
          onClick={() => setShowHistory(!showHistory)}
          title={getMessage('simpleEditor.history.commands')}
          disabled={isProcessing || isCancelling}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3" />
          </svg>
        </button>
        
        {/* 历史命令下拉列表 */}
        {showHistory && (
          <div
            ref={historyRef} 
            className="absolute left-0 top-full mt-2 w-96 max-h-80 overflow-y-auto bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20"
          >
            <div className="py-1 border-b border-gray-700">
              <div className="px-4 py-2 text-sm text-gray-300 font-semibold flex justify-between items-center">
                <span>{getMessage('simpleEditor.history.tasks')}</span>
                {isLoadingHistory ? (
                  <span className="text-xs text-gray-400">{getMessage('simpleEditor.loading')}</span>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-blue-400 hover:text-blue-300 focus:outline-none"
                    onClick={loadTaskHistory}
                  >
                    {getMessage('simpleEditor.refresh')}
                  </button>
                )}
              </div>
            </div>
            
            {/* 任务历史列表 */}
            {taskHistory.length > 0 ? (
              <div className="mb-4">
                <ul className="py-1">
                  {taskHistory.map((task) => (
                    <li key={task.id} className="px-3 py-2 hover:bg-gray-700 cursor-pointer">
                      <button
                        type="button"
                        className="w-full text-left flex flex-col"
                        onClick={() => selectTaskHistory(task)}
                      >
                        <span className="text-sm text-gray-200 truncate">{task.query}</span>
                        <div className="flex items-center text-xs mt-1">
                          <span className={`px-1.5 py-0.5 rounded ${
                            task.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                          }`}>
                            {task.status === 'completed' ? getMessage('simpleEditor.status.completed') : getMessage('simpleEditor.status.error')}
                          </span>
                          <span className="text-gray-400 ml-2">
                            {new Date(task.timestamp).toLocaleString()}
                          </span>
                          <span className="text-gray-400 ml-2">
                            {(task.messages?.length || 0)} {getMessage('simpleEditor.messages')}
                          </span>
                          {task.event_file_id && (
                            <span className="text-blue-400 ml-2 flex items-center">
                              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 9h5.5L13 3.5V9M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4c0-1.11.89-2 2-2m9 16v-2H6v2h9m3-4v-2H6v2h12z" />
                              </svg>
                              {getMessage('simpleEditor.recoverable')}
                            </span>
                          )}                          
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                {isLoadingHistory ? getMessage('simpleEditor.loadingHistory') : getMessage('simpleEditor.noHistory')}
              </div>
            )}
            
            <div className="py-1 border-t border-gray-700">
              <div className="px-4 py-2 text-sm text-gray-300 font-semibold flex justify-between items-center">
                <span>{getMessage('simpleEditor.history.recent')}</span>
                {commandHistory.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:text-red-300 focus:outline-none"
                    onClick={() => {
                      if (window.confirm(getMessage('simpleEditor.clearHistoryConfirm'))) {
                        setCommandHistory([]);
                        localStorage.removeItem('commandHistory');
                      }
                    }}
                  >
                    {getMessage('simpleEditor.clearHistory')}
                  </button>
                )}
              </div>
            </div>
            
            {/* 本地命令历史列表 */}
            {commandHistory.length > 0 ? (
              <ul className="py-1">
                {commandHistory.map((cmd, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 truncate"
                      onClick={() => selectHistoryCommand(cmd)}
                    >
                      {cmd}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                {getMessage('simpleEditor.noLocalHistory')}
              </div>
            )}
          </div>
        )}
      </div>
      <div ref={editorRef} className="w-full h-full">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={value}
          onChange={(newValue) => onChange(newValue || '')}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          loading={null}
          beforeMount={(monacoInstance) => {
            // 配置 Monaco 环境，使用本地 worker
            window.MonacoEnvironment = {
              getWorkerUrl: (workerId: string, label: string): string => {
                return `/monaco-editor/min/vs/base/worker/workerMain.js`;
              }
            };
          }}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'off',
            folding: false,
            fontSize: 12,
            lineHeight: 16,
            automaticLayout: true,
            contextmenu: false,
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            glyphMargin: false,
            renderLineHighlight: 'none',
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            acceptSuggestionOnEnter: 'smart',
            fixedOverflowWidgets: true,
            padding: { top: 8, bottom: 8 },
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'hidden',
              useShadows: false,
              alwaysConsumeMouseWheel: false
            },
            suggest: {
              insertMode: 'replace',
              snippetsPreventQuickSuggestions: false,
            },
            readOnly: disabled
          }}
        />
      </div>
      
      {/* 按钮容器 - 放置提交按钮或取消按钮 */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
        {/* 扩展编辑器按钮 */}
        <button
          type="button"
          className="p-1 mx-1 rounded-full transition-colors bg-gray-700 hover:bg-gray-600 z-10"
          onClick={onToggleExpand}
          disabled={isProcessing}
          title={getMessage('simpleEditor.expandEditor')}
        >
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        
        {/* 根据状态切换提交按钮/取消按钮 */}
        {isProcessing && currentEventFileId && onCancelTask ? (
          // 取消按钮 - 在任务处理中显示
          <button
            type="button"
            className={`p-1 rounded-full transition-colors z-10 ${
              isCancelling 
                ? "bg-gray-600 text-gray-300" 
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            onClick={() => {
              if (!isCancelling && onCancelTask && currentEventFileId) {
                if (window.confirm(getMessage('simpleEditor.cancelTaskConfirm'))) {
                  onCancelTask(currentEventFileId);
                }
              }
            }}
            disabled={isCancelling}
            title={isCancelling ? getMessage('simpleEditor.cancellingTask') : getMessage('simpleEditor.cancelTask')}
          >
            {isCancelling ? (
              // 加载动画
              <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              // 取消图标
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        ) : (
          // 提交按钮 - 默认状态
          <button
            type="button"
            className="p-1 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors z-10"
            onClick={onSubmit}
            disabled={isProcessing || !value.trim()}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

export default SimpleEditor; 
                         