import React from 'react';
import CodeEditor from '../Editor/CodeEditor';
import { FileMetadata } from '../../types/file_meta';

interface CodeEditorPanelProps {
  selectedFiles?: FileMetadata[];
}

const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({ selectedFiles }) => {
  return <CodeEditor selectedFiles={selectedFiles} />;
};

export default CodeEditorPanel;