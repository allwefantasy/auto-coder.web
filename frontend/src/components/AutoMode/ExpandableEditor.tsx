import React from 'react';
import { Editor, loader } from '@monaco-editor/react';
// 导入 monaco 编辑器类型
import * as monaco from 'monaco-editor';
import { getMessage } from '../../lang';
// 导入 CompletionItem 类型
interface CompletionItem {
  display: string;
  path: string;
  location?: string;
}

// Configure Monaco Editor loader
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

interface ExpandableEditorProps {
  /** Initial content of the editor */
  initialContent: string;
  /** Callback when editor content changes */
  onContentChange: (content: string | undefined) => void;
  /** Callback when editor is mounted */
  onEditorReady: (editor: any, monaco: any) => void;
  /** Callback when submit button is pressed */
  onSubmit: () => void;
  /** Callback to toggle back to simple editor mode */
  onToggleCollapse?: () => void;
}

/**
 * ExpandableEditor component for AutoMode
 * A specialized editor for handling large text inputs in the AutoMode context
 */
const ExpandableEditor: React.FC<ExpandableEditorProps> = ({
  initialContent,
  onContentChange,
  onEditorReady,
  onSubmit,
  onToggleCollapse
}) => {
  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Add keyboard shortcut for submission
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit();
    });
    
    // Add keyboard shortcut for toggling back to simple editor
    if (onToggleCollapse) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
        onToggleCollapse();
      });
    }
    
    // 注册自动完成提供者 - 支持 @文件 和 @@符号
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
              kind: monaco.languages.CompletionItemKind.Function,
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
    
    // Notify parent component that editor is ready
    onEditorReady(editor, monaco);
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        defaultValue={initialContent}
        onChange={onContentChange}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        loading={<div className="flex items-center justify-center h-full">{getMessage('expandableEditor.loading')}</div>}
        beforeMount={(monaco) => {
          // Configure Monaco environment to use local worker
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
          lineNumbers: 'on',
          folding: true,
          fontSize: 14,
          tabSize: 2,
          automaticLayout: true,
          contextmenu: true,
          scrollbar: {
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12
          },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          acceptSuggestionOnEnter: 'smart',
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

export default ExpandableEditor;
