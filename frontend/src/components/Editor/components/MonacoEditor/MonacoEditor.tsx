import React, { useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import './MonacoEditor.css';

// Configure loader to use CDN
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

interface MonacoEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ code, language, onChange }) => {
  useEffect(() => {
    // 确保语言支持被加载
    if (language && language !== 'plaintext') {
      loader.init().then(monaco => {
        // 加载特定语言的支持
        import(`monaco-editor/esm/vs/basic-languages/${language}/${language}.contribution`).catch(err => {
          console.warn(`Failed to load language support for ${language}:`, err);
        });
      });
    }
  }, [language]);

  const handleEditorWillMount = (monaco: any) => {
    // 确保加载了所有常用语言的支持
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 配置编辑器实例
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      folding: true,
      automaticLayout: true,
      renderWhitespace: 'selection',
      wordWrap: 'on',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        verticalSliderSize: 10,
        horizontalSliderSize: 10,
        arrowSize: 30,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: 'currentDocument',
      parameterHints: {
        enabled: true,
        cycle: true,
      },
      bracketPairColorization: {
        enabled: true,
      },
      guides: {
        indentation: true,
        bracketPairs: true,
      },
    });
  };
  
  return (
    <div className="monaco-editor-container">
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={onChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        loading={<div className="loading">Loading editor...</div>}
      />      
    </div>
  );
};

export default MonacoEditor;
