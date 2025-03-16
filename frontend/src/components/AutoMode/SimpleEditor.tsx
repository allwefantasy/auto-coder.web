import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Editor, loader } from '@monaco-editor/react';
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
  onToggleExpand
}, ref) => {
  // 编辑器引用
  const editorRef = useRef<any>(null);
  
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
      onSubmit();
    });
    
    // 添加切换扩展编辑器的快捷键 (可选) (Ctrl/Cmd + L)
    if (onToggleExpand) {
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyL, () => {
        onToggleExpand();
      });
    }
    
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
    <div className="w-full h-9 rounded-full overflow-hidden bg-gray-800 border border-gray-700 shadow-lg pl-10 pr-16">
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
  );
});

export default SimpleEditor; 