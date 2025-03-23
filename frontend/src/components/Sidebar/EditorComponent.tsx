import React from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { CompletionItem } from './types';
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
.monaco-file-mention {
  background-color: rgba(73, 156, 255, 0.2);
  border-radius: 3px;
  padding: 2px 4px;
  font-weight: bold;
  color: #499cff;
  cursor: pointer;
}

.monaco-symbol-mention {
  background-color: rgba(255, 162, 73, 0.2);
  border-radius: 3px;
  padding: 2px 4px;
  font-weight: bold;
  color: #ff9c33;
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

.file-mention-widget {
  background-color: rgba(73, 156, 255, 0.2);
  color: #499cff;
  border: 1px solid rgba(73, 156, 255, 0.4);
}

.symbol-mention-widget {
  background-color: rgba(255, 162, 73, 0.2);
  color: #ff9c33;
  border: 1px solid rgba(255, 162, 73, 0.4);
}
`;

// 扩展 CompletionItem 类型，添加 mentionType 字段
interface EnhancedCompletionItem extends CompletionItem {
  mentionType: 'file' | 'symbol';
}

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
  onMentionClick
}) => {
  React.useEffect(() => {
    // 在组件挂载时注入样式
    const styleElement = document.createElement('style');
    styleElement.textContent = mentionStyles;
    document.head.appendChild(styleElement);

    return () => {
      // 在组件卸载时移除样式
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 首先通知父组件编辑器已经挂载
    onEditorDidMount(editor, monaco);
    
    // 添加键盘快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      // 通过回调通知父组件切换最大化/最小化状态
      onToggleMaximize();
    });

    // 添加提交快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onShouldSendMessage();
    });

    // mention 块装饰器实现
    let fileMentionDecorations: string[] = [];
    let symbolMentionDecorations: string[] = [];
    
    // 添加映射存储，用于存储 mention 文本与 CompletionItem 的映射关系
    const mentionItemsMap = new Map<string, EnhancedCompletionItem>();
    
    // 添加标志位和防抖机制，避免递归调用
    let isUpdatingDecorations = false;
    let decorationUpdateScheduled = false;
    
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
        
        // 文件 mention 正则表达式 - 匹配 @file 格式，但不是 @@
        const fileMentionRegex = /(?<!\@)@([a-zA-Z0-9_\-\/\.]+)/g;
        // 符号 mention 正则表达式 - 匹配 @@symbol 格式
        const symbolMentionRegex = /@@([a-zA-Z0-9_\-\/\.]+)/g;
        
        const fileMatches = [];
        const symbolMatches = [];
        
        let fileMatch;
        while ((fileMatch = fileMentionRegex.exec(text)) !== null) {
          // 确保不是 @@ 的开头
          if (text.charAt(fileMatch.index - 1) !== '@') {
            const startPos = model.getPositionAt(fileMatch.index);
            const endPos = model.getPositionAt(fileMatch.index + fileMatch[0].length);
            
            fileMatches.push({
              range: new monaco.Range(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column
              ),
              text: fileMatch[0],
              name: fileMatch[1]
            });
          }
        }
        
        let symbolMatch;
        while ((symbolMatch = symbolMentionRegex.exec(text)) !== null) {
          const startPos = model.getPositionAt(symbolMatch.index);
          const endPos = model.getPositionAt(symbolMatch.index + symbolMatch[0].length);
          
          symbolMatches.push({
            range: new monaco.Range(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column
            ),
            text: symbolMatch[0],
            name: symbolMatch[1]
          });
        }
        
        // 更新文件 mention 装饰器
        fileMentionDecorations = editor.deltaDecorations(fileMentionDecorations, fileMatches.map(match => ({
          range: match.range,
          options: {
            inlineClassName: 'monaco-file-mention',
            hoverMessage: { value: `文件: ${match.name}` },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        })));
        
        // 更新符号 mention 装饰器
        symbolMentionDecorations = editor.deltaDecorations(symbolMentionDecorations, symbolMatches.map(match => ({
          range: match.range,
          options: {
            inlineClassName: 'monaco-symbol-mention',
            hoverMessage: { value: `符号: ${match.name}` },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        })));
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
      
      // 检查点击的位置是否在文件 mention 范围内
      for (let i = 0; i < fileMentionDecorations.length; i++) {
        const range = editor.getModel().getDecorationRange(fileMentionDecorations[i]);
        if (range && range.containsPosition(position)) {
          const mentionText = model.getValueInRange(range);
          // 移除 @ 前缀
          const fileName = mentionText.substring(1);
          
          // 检查是否有对应的 CompletionItem
          const completionItem = mentionItemsMap.get(fileName);
          
          if (onMentionClick) {
            onMentionClick('file', fileName, completionItem);
          } else {
            // 默认行为：打开文件或显示文件信息
            console.log('文件被点击:', fileName, completionItem);
            // 这里可以添加默认的文件打开逻辑
          }
          return;
        }
      }
      
      // 检查点击的位置是否在符号 mention 范围内
      for (let i = 0; i < symbolMentionDecorations.length; i++) {
        const range = editor.getModel().getDecorationRange(symbolMentionDecorations[i]);
        if (range && range.containsPosition(position)) {
          const mentionText = model.getValueInRange(range);
          // 移除 @@ 前缀
          const symbolName = mentionText.substring(2);
          
          // 检查是否有对应的 CompletionItem
          const completionItem = mentionItemsMap.get(symbolName);
          
          if (onMentionClick) {
            onMentionClick('symbol', symbolName, completionItem);
          } else {
            // 默认行为：显示符号信息或跳转到符号定义
            console.log('符号被点击:', symbolName, completionItem);
            // 这里可以添加默认的符号导航逻辑
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
    monaco.languages.registerCompletionItemProvider('markdown', {
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

        //获取当前词
        const wordText = word.word;

        console.log('prefix:', prefix, 'word:', wordText);

        if (prefix === "@" && double_prefix === "@") {
          // 符号补全
          const query = wordText;
          const response = await fetch(`/api/completions/symbols?name=${encodeURIComponent(query)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: CompletionItem) => {
              // 创建增强版 CompletionItem 并存储到映射中
              const enhancedItem: EnhancedCompletionItem = {
                ...item,
                mentionType: 'symbol'
              };
              
              // 在处理完成项时，记录这个项目（用路径作为键）
              mentionItemsMap.set(item.path, enhancedItem);
              
              return {
                label: item.display,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: item.path,
                detail: "",
                documentation: `Location: ${item.path}`,
                // 添加自定义 CSS 类用于后续样式应用
                additionalTextEdits: [],
                command: {
                  id: 'editor.action.triggerSuggest',
                  title: 'Re-trigger completions...',
                  arguments: []
                },
                // 添加一个后处理钩子，在插入完成后触发装饰器更新
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              };
            }),
            incomplete: true
          };
        } else if (prefix === "@") {
          // 文件补全
          const query = wordText;
          const response = await fetch(`/api/completions/files?name=${encodeURIComponent(query)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: CompletionItem) => {
              // 创建增强版 CompletionItem 并存储到映射中
              const enhancedItem: EnhancedCompletionItem = {
                ...item,
                mentionType: 'file'
              };
              
              // 在处理完成项时，记录这个项目（用路径作为键）
              mentionItemsMap.set(item.path, enhancedItem);
              
              return {
                label: item.display,
                kind: monaco.languages.CompletionItemKind.File,
                insertText: item.path,
                detail: "",
                documentation: `Location: ${item.location}`,
                // 添加自定义 CSS 类用于后续样式应用
                additionalTextEdits: [],
                command: {
                  id: 'editor.action.triggerSuggest',
                  title: 'Re-trigger completions...',
                  arguments: []
                },
                // 添加一个后处理钩子，在插入完成后触发装饰器更新
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              };
            }),
            incomplete: true
          };
        }

        return { suggestions: [] };
      },
      
      // 添加自动完成选择事件处理
      onDidAccept: (completionItem: any) => {
        // 当选择了一个自动完成项时，更新装饰器
        debouncedUpdateDecorations();
      }
    });
    
    // 监听自动完成项选择事件，确保在选择后立即应用样式 - 使用防抖
    editor.onDidChangeCursorSelection(() => {
      debouncedUpdateDecorations();
    });
  };

  return (
    <div className={`flex-1 ${isMaximized ? 'h-full' : 'h-full'} border-0 rounded-lg overflow-hidden w-full`} style={{ height: isMaximized ? '100%' : '150px' }}>
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
  );
};

export default EditorComponent;
