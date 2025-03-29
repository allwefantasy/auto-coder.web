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

// Mention 数据接口
interface MentionData {
  id: string;
  range: any; // monaco.Range
  type: 'file' | 'symbol';
  text: string;
  path: string;
  decorationId?: string;
  item: EnhancedCompletionItem;
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
  // 存储所有mention项的引用
  const mentionsRef = React.useRef<MentionData[]>([]);
  // 存储当前装饰IDs的引用
  const decorationsRef = React.useRef<string[]>([]);
  
  // 更新mention装饰
  const updateMentionDecorations = React.useCallback(() => {
    if (!editorRef.current) return;
    
    const decorations = mentionsRef.current.map(mention => ({
      range: mention.range,
      options: {
        inlineClassName: 'monaco-mention',
        hoverMessage: { value: `**${mention.type === 'file' ? '文件' : '符号'}**: ${mention.path}` },
        stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
      }
    }));
    
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);
    
    // 更新每个mention的decorationId
    mentionsRef.current.forEach((mention, index) => {
      mention.decorationId = decorationsRef.current[index];
    });
    
    // 通过 eventBus 发布 mentions 变化事件
    // eventBus.publish(EVENTS.EDITOR.MENTIONS_CHANGED, mentionsRef.current.map(m => ({
    //   type: m.type,
    //   text: m.text,
    //   path: m.path,
    // //   item: m.item
    // })));
  }, []);

  // 处理内容变化，更新mention位置
  const handleContentChange = React.useCallback(() => {
    if (!editorRef.current) return;
    
    // 检查每个mention是否仍然有效
    const model = editorRef.current.getModel();
    const validMentions = mentionsRef.current.filter(mention => {
      // 获取当前range中的文本
      const text = model.getValueInRange(mention.range);
      // 检查文本是否仍然是mention格式
      return text.startsWith('@') && text.includes(mention.text);
    });
    
    // 更新mentions列表
    mentionsRef.current = validMentions;
    // 更新装饰
    updateMentionDecorations();
  }, [updateMentionDecorations]);

  // 添加一个新的mention
  const addMention = React.useCallback((range: any, type: 'file' | 'symbol', text: string, path: string, item: EnhancedCompletionItem) => {
    const id = `mention-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 创建新的mention数据
    const mentionData: MentionData = {
      id,
      range,
      type,
      text,
      path,
      item
    };
    
    // 添加到mention列表
    mentionsRef.current.push(mentionData);
    
    // 更新装饰
    updateMentionDecorations();
    
    return mentionData;
  }, [updateMentionDecorations]);

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

    // ----- mention 相关处理 -----
        
    // 注册自定义命令，用于处理自动完成选择事件
    monaco.editor.registerCommand('editor.acceptedCompletion', function(...args: any[]) {
      // Monaco可能不会按预期传递编辑器实例，所以我们使用当前引用
      const currentEditor = editorRef.current;
      if (!currentEditor) return null;
      
      // 解析参数 - 不依赖于editor参数
      const [, ...restArgs] = args;
      let name: string, path: string, mentionType: 'file' | 'symbol', item: EnhancedCompletionItem;
      
      if (restArgs.length >= 3) {
        name = restArgs[0];
        path = restArgs[1]; 
        mentionType = restArgs[2] as 'file' | 'symbol';
        item = restArgs[3] || {} as EnhancedCompletionItem;
      } else {
        console.warn('Insufficient arguments for mention completion');
        return null;
      }
      
      // 获取当前光标位置
      const position = currentEditor.getPosition();
      const model = currentEditor.getModel();
      
      // 获取当前行文本
      const lineContent = model.getLineContent(position.lineNumber);
      
      // 找到@符号的位置
      let atSignColumn = position.column - 1;
      while (atSignColumn > 0 && lineContent.charAt(atSignColumn - 1) !== '@') {
        atSignColumn--;
      }
      
      // 创建一个range从@到当前位置
      const range = new monaco.Range(
        position.lineNumber,
        atSignColumn,
        position.lineNumber,
        position.column
      );
      
      // 添加新的mention
      addMention(range, mentionType, name, path, item);
      
      return null;
    });
    
    // 监听鼠标点击事件，处理点击mention
    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
        const position = e.target.position;
        
        // 检查点击位置是否在任何mention范围内
        for (const mention of mentionsRef.current) {
          if (mention.range.containsPosition(position)) {
            // 触发mention点击回调
            if (onMentionClick) {
              onMentionClick(mention.type, mention.text, mention.item);
            }
            break;
          }
        }
      }
    });
    
    // 监听内容变化更新mention
    editor.onDidChangeModelContent(() => {
      handleContentChange();
    });
        
    // 注册自动完成提供者
    if (!providerRegistered.current) {
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
          const prefix = textUntilPosition.charAt(word.startColumn - 2);
          const wordText = word.word;

          if (prefix === "@") {
            // 获取查询文本
            const query = wordText;
            
            // 并行获取文件和符号补全
            const [fileResponse, symbolResponse] = await Promise.all([
              fetch(`/api/completions/files?name=${encodeURIComponent(query)}`),
              fetch(`/api/completions/symbols?name=${encodeURIComponent(query)}`)
            ]);
            
            const [fileData, symbolData] = await Promise.all([
              fileResponse.json(),
              symbolResponse.json()
            ]);
            
            // 处理文件补全结果
            const fileSuggestions = fileData.completions.map((item: CompletionItem) => {
              const enhancedItem: EnhancedCompletionItem = {
                ...item,
                mentionType: 'file'
              };                            
              
              return {
                label: item.name,
                kind: monaco.languages.CompletionItemKind.File,
                insertText: item.name,
                detail: "文件",
                documentation: `路径: ${item.location || item.path}`,
                command: {
                  id: 'editor.acceptedCompletion',
                  title: '选择完成',
                  arguments: [item.name, item.path, 'file', enhancedItem]
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              };
            });
            
            // 处理符号补全结果
            const symbolSuggestions = symbolData.completions.map((item: CompletionItem) => {
              const enhancedItem: EnhancedCompletionItem = {
                ...item,
                mentionType: 'symbol'
              };
                            
              return {
                label: `${item.name}(${item.path})`,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: item.name,
                detail: "符号",
                documentation: `位置: ${item.path}`,
                command: {
                  id: 'editor.acceptedCompletion',
                  title: '选择完成',
                  arguments: [item.name, item.path, 'symbol', enhancedItem]
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              };
            });
            
            // 合并建议
            return {
              suggestions: [...fileSuggestions, ...symbolSuggestions],
              incomplete: true
            };
          }

          return { suggestions: [] };
        }
      });
      
      providerRegistered.current = true;
    }
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