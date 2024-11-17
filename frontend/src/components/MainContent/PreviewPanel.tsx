import React from 'react';
import Editor from '@monaco-editor/react';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface PreviewPanelProps {
  files: { path: string; content: string }[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  const [activeFileIndex, setActiveFileIndex] = React.useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {files.length === 0 ? (
            <div className="w-full flex items-center justify-center text-gray-400">
              No changes to preview
            </div>
          ) : (
            <>
              <div className="flex bg-gray-800">
                {files.map((file, index) => (
                  <button
                    key={file.path}
                    className={`px-4 py-2 text-sm ${
                      index === activeFileIndex ? 'bg-gray-700 text-white' : 'text-gray-300'
                    }`}
                    onClick={() => setActiveFileIndex(index)}
                  >
                    {file.path}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getLanguageByFileName(files[activeFileIndex].path)}
                  theme="vs-dark"
                  value={files[activeFileIndex].content}
                  options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: 'on',
                    folding: true,
                    automaticLayout: true,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;