import React from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { CompletionItem, EnhancedCompletionItem } from './types';
import eventBus, { EVENTS } from '../../services/eventBus';
// 导入 monaco 编辑器类型
import * as monaco from 'monaco-editor';

// 移除冲突的类型声明，使用 monaco-editor 包提供的类型
// declare global {
//   interface Window {
//     MonacoEnvironment: {
//       getWorkerUrl: (moduleId: string, label: string) => string;
//     };
//   }
// }

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

// CSS 样式定义 - 将在组件加载时注入
const mentionStyles = `
.monaco-mention {
  background-color: rgba(73, 156, 255, 0.2);
  border-radius: 3px;
  padding: 2px 4px;
  font-weight: bold;
  color: #499cff;
  cursor: pointer;
}

.monaco-mention-widget {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin: 0 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.mention-widget {
  background-color: rgba(73, 156, 255, 0.2);
  color: #499cff;
  border: 1px solid rgba(73, 156, 255, 0.4);
}
`;

interface EditorComponentProps {
  isMaximized: boolean;
  onEditorDidMount: (editor: any, monaco: any) => void;
  onShouldSendMessage: () => void;
  /** 编辑器的初始值 */
  defaultValue?: string;
  /** 编辑器值改变时的回调 */
  onChange?: (value: string | undefined) => void;
  /** 切换编辑器最大化/最小化状态 */
  onToggleMaximize: () => void;
  /** 当点击 mention 项时的回调 */
  onMentionClick?: (type: 'file' | 'symbol', text: string, item?: EnhancedCompletionItem) => void;
}

/**
 * 代码编辑器组件
 * 提供了代码编辑、自动完成等功能
 */
const EditorComponent: React.FC<EditorComponentProps> = ({
  isMaximized,
  onEditorDidMount,
  onShouldSendMessage,
  defaultValue = '',
  onChange,
  onToggleMaximize,
  onMentionClick,  
}) => {
  // 添加一个ref来跟踪提供者是否已经注册
  const providerRegistered = React.useRef(false);
  // 添加一个ref来存储editor的引用
  const editorRef = React.useRef<any>(null);
  // 添加一个ref来存储编辑器容器的引用
  const editorContainer = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    // 在组件挂载时注入样式
    const styleElement = document.createElement('style');
    styleElement.textContent = mentionStyles;
    document.head.appendChild(styleElement);

    // 添加事件监听，当收到编辑器获得焦点事件时，让编辑器获得焦点
    const unsubscribe = eventBus.subscribe(EVENTS.EDITOR.FOCUS, () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    });

    return () => {
      // 在组件卸载时移除样式
      document.head.removeChild(styleElement);
      // 取消事件订阅
      unsubscribe();
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 存储editor引用
    editorRef.current = editor;
    
    // 首先通知父组件编辑器已经挂载
    onEditorDidMount(editor, monaco);
    
    // 添加键盘快捷键 - 修改为触发InputArea全屏
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      // 触发InputArea全屏事件
      eventBus.publish(EVENTS.UI.TOGGLE_INPUT_FULLSCREEN);
      return null;
    });

    // 添加提交快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onShouldSendMessage();
    });

    // 添加聚焦文件组选择快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      // 触发自定义事件
      eventBus.publish(EVENTS.FILE_GROUP_SELECT.FOCUS);
      return null;
    });

    // 注册自定义命令，用于处理自动完成选择事件
    monaco.editor.registerCommand('editor.acceptedCompletion', (editor: any, name: string, path: string, mentionType: 'file' | 'symbol') => {
      console.log(`用户选择了自动完成项: ${path}, 类型: ${mentionType}`);
      
      // 从临时存储中获取完整项信息
      const item = temporaryCompletionItems.get(path);
      if (item) {
        // 将选中项添加到正式映射中
        mentionItemsMap.set(path, item);        
        // 通知父组件映射已更新
        notifyMentionMapChange();
      }
      
      // 立即更新装饰器
      updateDecorations();
      
      // 返回 null 表示命令执行完成
      return null;
    });

    // mention 块装饰器实现
    let mentionDecorations: string[] = [];
    
    // 添加映射存储，用于存储 mention 文本与 CompletionItem 的映射关系
    const mentionItemsMap = new Map<string, EnhancedCompletionItem>();
    const temporaryCompletionItems = new Map<string, EnhancedCompletionItem>();
    
    // 添加标志位和防抖机制，避免递归调用
    let isUpdatingDecorations = false;
    let decorationUpdateScheduled = false;
    
    // 定义一个函数，用于通知映射变化
    const notifyMentionMapChange = () => {
      if (onMentionMapChange) {
        // 将 Map 转换为数组传递给回调
        const mentionItems = Array.from(mentionItemsMap.values());
        console.log('notifyMentionMapChange:', mentionItems);
        onMentionMapChange(mentionItems);
      }
    };
    
    // 更新装饰器函数
    const updateDecorations = () => {
      // 如果正在更新，则只标记需要再次更新，避免递归调用
      if (isUpdatingDecorations) {
        decorationUpdateScheduled = true;
        return;
      }
      
      // 设置标志，表示正在更新装饰器
      isUpdatingDecorations = true;
      
      try {
        const model = editor.getModel();
        if (!model) return;
        
        const text = model.getValue();
        
        // 统一的 mention 正则表达式 - 匹配 @reference 格式
        const mentionRegex = /@([a-zA-Z0-9_\-\/\.\(\)]+)/g;
        
        const matches = [];
        
        // 用于跟踪当前文本中存在的所有 mention
        const currentMentions = new Set<string>();
        
        // 记录是否有新的 mention 被检测到但不在映射中        
        let mapChanged = false;
        
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          const startPos = model.getPositionAt(match.index);
          const endPos = model.getPositionAt(match.index + match[0].length);
          
          // 将此 mention 添加到当前存在的集合中
          const mentionName = match[1];
          currentMentions.add(mentionName);            
          
          matches.push({
            range: new monaco.Range(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column
            ),
            text: match[0],
            name: mentionName
          });
        }
        
        // 从 mentionItemsMap 中删除不在 currentMentions 中的键
        Array.from(mentionItemsMap.keys()).forEach(key => {
          if (!currentMentions.has(key)) {
            mentionItemsMap.delete(key);
            mapChanged = true;
          }
        });
        
        // 更新 mention 装饰器
        mentionDecorations = editor.deltaDecorations(mentionDecorations, matches.map(match => ({
          range: match.range,
          options: {
            inlineClassName: 'monaco-mention',
            hoverMessage: { value: `引用: ${match.name}` },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        })));
                              
        // 如果映射发生了变化，通知父组件
        if (mapChanged) {
          notifyMentionMapChange();
        }
        
      } finally {
        // 标记为不再更新装饰器
        isUpdatingDecorations = false;
        
        // 如果在更新过程中有新的更新请求，则安排一个异步更新
        if (decorationUpdateScheduled) {
          decorationUpdateScheduled = false;
          setTimeout(updateDecorations, 0);
        }
      }
    };
    
    // 使用防抖函数包装更新装饰器的调用
    const debouncedUpdateDecorations = (() => {
      let timeout: NodeJS.Timeout | null = null;
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          timeout = null;
          updateDecorations();
        }, 100); // 100ms 的防抖延迟
      };
    })();
    
    // 添加点击处理
    editor.onMouseDown((e: monaco.editor.IEditorMouseEvent) => {
      if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
        return;
      }
      
      const model = editor.getModel();
      if (!model) return;
      
      // 获取点击位置的文本
      const position = e.target.position;
      if (!position) return;
      
      // 检查点击的位置是否在 mention 范围内
      for (let i = 0; i < mentionDecorations.length; i++) {
        const range = editor.getModel().getDecorationRange(mentionDecorations[i]);
        if (range && range.containsPosition(position)) {
          const mentionText = model.getValueInRange(range);
          // 移除 @ 前缀
          const reference = mentionText.substring(1);
          
          // 检查是否有对应的 CompletionItem
          const completionItem = mentionItemsMap.get(reference) || temporaryCompletionItems.get(reference);
          
          if (onMentionClick && completionItem) {
            onMentionClick(completionItem.mentionType, reference, completionItem);
          } else {
            // 默认行为：打开引用或显示信息
            console.log('引用被点击:', reference, completionItem);
          }
          return;
        }
      }
    });
    
    // 监听内容变化，更新装饰器 - 使用防抖
    editor.onDidChangeModelContent(() => {
      debouncedUpdateDecorations();
    });
    
    // 初始化装饰器 - 直接调用，因为此时还没有其他事件监听器
    updateDecorations();    
    
    // 注册自动完成提供者
    if (!providerRegistered.current) {
      monaco.languages.registerCompletionItemProvider('markdown', {
        triggerCharacters: ['@'],
        provideCompletionItems: async (model: any, position: any) => {
          // 在每次请求开始时清空临时存储，防止重复项累积
          temporaryCompletionItems.clear();
          
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

          //获取当前词
          const wordText = word.word;

          console.log('prefix:', prefix, 'word:', wordText);

          if (prefix === "@") {
            // 获取查询文本
            const query = wordText;
            console.log(`请求自动完成，查询: "${query}"`);
            
            // 获取文件补全
            const fileResponse = await fetch(`/api/completions/files?name=${encodeURIComponent(query)}`);
            const fileData = await fileResponse.json();
            
            // 获取符号补全
            const symbolResponse = await fetch(`/api/completions/symbols?name=${encodeURIComponent(query)}`);
            const symbolData = await symbolResponse.json();
            
            console.log(`接收到自动完成结果: 文件 ${fileData.completions.length} 项, 符号 ${symbolData.completions.length} 项`);
            
            // 将文件补全结果映射为建议项
            const fileSuggestions = fileData.completions.map((item: CompletionItem) => {
              // 创建增强版 CompletionItem
              const enhancedItem: EnhancedCompletionItem = {
                ...item,
                mentionType: 'file'
              };
              
              // 存储到临时映射中
              temporaryCompletionItems.set(item.path, enhancedItem);
              
              return {
                label: item.name,
                kind: monaco.languages.CompletionItemKind.File,
                insertText: item.path,
                detail: "文件",
                documentation: `路径: ${item.location || item.path}`,
                command: {
                  id: 'editor.acceptedCompletion',
                  title: '选择完成',
                  arguments: [item.name, item.path, 'file']
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              };
            });
            
            // 将符号补全结果映射为建议项
            const symbolSuggestions = symbolData.completions.map((item: CompletionItem) => {
              // 创建增强版 CompletionItem
              const enhancedItem: EnhancedCompletionItem = {
                ...item,
                mentionType: 'symbol'
              };
              
              // 存储到临时映射中
              temporaryCompletionItems.set(item.path, enhancedItem);
              
              return {
                label: `${item.name}(${item.path})`,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${item.name}(${item.path})`,
                detail: "符号",
                documentation: `位置: ${item.path}`,
                command: {
                  id: 'editor.acceptedCompletion',
                  title: '选择完成',
                  arguments: [item.name, item.path, 'symbol']
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              };
            });
            
            // 合并文件和符号建议
            return {
              suggestions: [...fileSuggestions, ...symbolSuggestions],
              incomplete: true
            };
          }

          return { suggestions: [] };
        }
      });
      
      // 标记为提供者已经注册
      providerRegistered.current = true;
    }
    
    // 不再需要通过键盘事件或光标位置变化来间接检测自动完成选择
    // 因为我们现在使用 command 机制直接获取选择事件
    
  };

  return (
    <div className="w-full relative h-full flex flex-col">
      <div
        ref={editorContainer}
        className={`editor-container w-full border border-gray-700 rounded-md overflow-hidden ${
          isMaximized ? 'h-full flex-grow' : 'h-[200px]'
        }`}
        style={{ width: '100%' }}
      >
        <Editor
          height="100%"
          defaultLanguage="markdown"
          defaultValue={defaultValue}
          onChange={onChange}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          // 禁用自动检测和加载远程资源
          loading={<div className="flex items-center justify-center h-full">加载编辑器中...</div>}
          // 确保使用本地资源
          beforeMount={(monaco) => {
            // 设置 Monaco 环境，使用本地 worker
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
            contextmenu: false,
            fontFamily: 'monospace',
            fontSize: 14,
            lineHeight: 1.5,
            padding: { top: 8, bottom: 8 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            acceptSuggestionOnEnter: 'smart',
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            fixedOverflowWidgets: true,
            suggest: {
              insertMode: 'replace',
              snippetsPreventQuickSuggestions: false,
            }
          }}
        />
      </div>
    </div>
  );
};

export default EditorComponent;