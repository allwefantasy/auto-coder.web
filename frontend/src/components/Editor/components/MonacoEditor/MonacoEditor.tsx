import React from 'react';
import Editor from '@monaco-editor/react';
import './MonacoEditor.css';

interface MonacoEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ code, language, onChange }) => {
  return (
    <div className="monaco-editor-container">
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={onChange}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          folding: true,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default MonacoEditor;
