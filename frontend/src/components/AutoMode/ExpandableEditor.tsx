import React from 'react';
import { Editor, loader } from '@monaco-editor/react';

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
}

/**
 * ExpandableEditor component for AutoMode
 * A specialized editor for handling large text inputs in the AutoMode context
 */
const ExpandableEditor: React.FC<ExpandableEditorProps> = ({
  initialContent,
  onContentChange,
  onEditorReady,
  onSubmit
}) => {
  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Add keyboard shortcut for submission
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit();
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
        loading={<div className="flex items-center justify-center h-full">加载编辑器中...</div>}
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
          }
        }}
      />
    </div>
  );
};

export default ExpandableEditor;
