import React from 'react';
import { Editor } from '@monaco-editor/react';
import { CompletionItem } from './types';

// 配置 Monaco 编辑器的加载方式
import loader from '@monaco-editor/loader';

// 设置 Monaco 编辑器的 CDN 或本地路径
// 如果在 Docker 中，最好使用本地路径
loader.config({
  paths: {
    // 使用打包在应用程序中的 Monaco 资源
    vs: '/monaco-editor/min/vs'
  }
});

// 添加 Monaco 环境类型声明
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl: (moduleId: string, label: string) => string;
    };
  }
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
  onToggleMaximize
}) => {
  // 配置 Monaco 的全局环境，在组件渲染前设置
  React.useEffect(() => {
    // 配置 Monaco 环境，防止外部加载
    window.MonacoEnvironment = {
      getWorkerUrl: function (moduleId, label) {
        // 使用 Monaco 编辑器内置的 Worker
        if (label === 'json') {
          return './json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return './css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return './html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
          return './ts.worker.js';
        }
        return './editor.worker.js';
      }
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
            suggestions: data.completions.map((item: CompletionItem) => ({
              label: item.display,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: item.path,
              detail: "",
              documentation: `Location: ${item.path}`,
            })),
            incomplete: true
          };
        } else if (prefix === "@") {
          // 文件补全
          const query = wordText;
          const response = await fetch(`/api/completions/files?name=${encodeURIComponent(query)}`);
          const data = await response.json();
          return {
            suggestions: data.completions.map((item: CompletionItem) => ({
              label: item.display,
              kind: monaco.languages.CompletionItemKind.File,
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
    <div className={`flex-1 ${isMaximized ? 'h-full' : 'min-h-[180px]'} border border-gray-700 rounded-lg overflow-hidden`}>
      <Editor
        height={isMaximized ? "100vh" : "180px"}
        defaultLanguage="markdown"
        defaultValue={defaultValue}
        onChange={onChange}
        theme="vs-dark"
        onMount={handleEditorDidMount}
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
