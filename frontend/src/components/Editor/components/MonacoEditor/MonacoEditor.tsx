import React, { useEffect, useRef, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { getMessage } from '../../../../lang';
import './MonacoEditor.css';

// 配置loader使用本地路径
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


// 定义Monaco主题以确保语法高亮正常工作
const defineMonacoThemes = (monaco: any) => {

  const common = [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'da70d6' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'regexp', foreground: 'D16969' },
    { token: 'operator', foreground: 'D4D4D4' },
    { token: 'namespace', foreground: '4EC9B0' },
    { token: 'type.identifier', foreground: '4EC9B0' },
    { token: 'function', foreground: 'ffd700' },
    { token: 'variable', foreground: '179fff' },
    { token: 'variable.predefined', foreground: '4FC1FF' },
    { token: 'class', foreground: '4EC9B0' },
    { token: 'interface', foreground: '4EC9B0' },
    { token: 'enum', foreground: '4EC9B0' },
  ]

  monaco.editor.defineTheme('customVsDarkTheme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      ...common
    ],
    colors: {
      'editor.foreground': '#D4D4D4',
      'editor.background': '#1E1E1E',
      'editorCursor.foreground': '#AEAFAD',
      'editor.lineHighlightBackground': '#2D2D30',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
    }
  });

  // vue 主题
  monaco.editor.defineTheme('vue-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      ...common,
      { token: 'tag.template', foreground: '#41B883' },
      { token: 'tag.html', foreground: '#E5C07B' },          // HTML 标签 黄色
      { token: 'meta.style', foreground: '#C678DD' },        // <style> 区域
      { token: 'meta.script', foreground: '#61AFEF' }        // <script> 区域
    ],
    colors: {
      'editor.foreground': '#D4D4D4',
      'editor.background': '#1E1E1E',
      'editorCursor.foreground': '#AEAFAD',
      'editor.lineHighlightBackground': '#2D2D30',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
    }
  });
};


interface MonacoEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ code, language, onChange }) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [isMonacoMounted, setIsMonacoMounted] = useState(false);

  // 加载语言支持的函数
  const loadLanguageSupport = () => {
    if (!language || language === 'plaintext' || !monacoRef.current) return;

    console.log(`${getMessage('dev.monacoEditor.attemptingLoad')} ${language}`);

    try {
      // 检查语言是否已经注册
      const languages = monacoRef.current.languages.getLanguages();

      const updateOption = (_language:string,_theme:string = 'customVsDarkTheme') => {
        if (editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            monacoRef.current.editor.setModelLanguage(model, _language);
            if(_theme) monacoRef.current.editor.setTheme(_theme);
            // 触发重新渲染
            setTimeout(() => {
              editorRef.current.updateOptions({});
              // editorRef.current.setValue(code)
            }, 100);
          }
        }
      }

      if (language === 'vue') {
        updateOption('html','vue-theme')
        return
      }

      const isLanguageSupported = languages.some((lang: any) =>
        lang.id === language || (lang.aliases && lang.aliases.includes(language))
      );
      
      if (isLanguageSupported) {
        console.log(getMessage('dev.monacoEditor.languageSupported', { language }));

        // 即使语言已支持，也要确保应用到模型
        updateOption(language)
        return;
      }

      // 通过script标签加载语言支持
      const script = document.createElement('script');
      script.src = `/monaco-editor/min/vs/basic-languages/${language}/${language}.js`;
      script.async = true;
      script.onload = () => {
        console.log(`${getMessage('monacoEditor.languageSupportLoaded')}: ${language}`);
        // 如果编辑器已加载，更新语言模式
        updateOption(language)
      };
      script.onerror = (err) => {
        console.warn(getMessage('monacoEditor.languageSupportFailed', { language }), err);
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error(getMessage('monacoEditor.errorLoadingLanguage'), error);
    }
  };

  // 监听language变化，并且确保Monaco已经挂载
  useEffect(() => {
    if (isMonacoMounted) {
      loadLanguageSupport();
    }
  }, [language, isMonacoMounted]);

  const handleEditorWillMount = (monaco: any) => {
    console.log(getMessage('dev.monacoEditor.willMount'));
    monacoRef.current = monaco;

    // 定义主题
    defineMonacoThemes(monaco);

    // 禁用所有语言的语法校验
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true
    });

    // 全局禁用诊断功能
    monaco.languages.onLanguage('*', () => {
      monaco.languages.setLanguageConfiguration('*', {
        // 设置空的验证规则
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
      });
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    console.log(getMessage('dev.monacoEditor.didMount'));
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsMonacoMounted(true);

    // 设置一个手动创建的模型，确保语言被正确应用
    const model = editor.getModel();
    if (model && language) {
      monaco.editor.setModelLanguage(model, language);
    }

    // 在编辑器挂载后立即尝试加载语言支持
    loadLanguageSupport();

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
        theme="customVsDarkTheme"
        value={code}
        onChange={onChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        loading={<div className="loading">{getMessage('monacoEditor.loading')}</div>}
        options={{
          fontLigatures: true,
          contextmenu: true,
          fixedOverflowWidgets: true,
          colorDecorators: true,
          // 禁用各种验证和提示
          formatOnType: false,
          formatOnPaste: false,
          parameterHints: { enabled: false }
        }}
      />
    </div>
  );
};

export default MonacoEditor;
