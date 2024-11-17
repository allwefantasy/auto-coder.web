import React from 'react';
import Editor from '@monaco-editor/react';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface PreviewPanelProps {
  files: { path: string; content: string }[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {files.length === 0 ? (
            <div className="w-full flex items-center justify-center text-gray-400">
              No changes to preview
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {files.map((file, index) => (
                <div key={file.path} className="flex-1 min-h-[400px] border-b border-gray-700 last:border-b-0">
                  <div className="bg-gray-800 px-4 py-2 text-gray-300 text-sm font-semibold">
                    {file.path}
                  </div>
                  <Editor
                    height="calc(100% - 36px)"
                    language={getLanguageByFileName(file.path)}
                    theme="vs-dark"
                    value={file.content}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;