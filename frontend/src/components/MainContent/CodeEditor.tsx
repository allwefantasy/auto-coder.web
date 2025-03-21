import React from 'react';
import { CodeEditor as Editor } from '../Editor';

interface CodeEditorProps {
  selectedFile?: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ selectedFile }) => {
  return <Editor selectedFile={selectedFile} />;
};

export default CodeEditor;