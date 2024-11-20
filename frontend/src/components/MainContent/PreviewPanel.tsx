import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import Iframe from 'react-iframe';
import Split from 'react-split';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface PreviewPanelProps {
  files: { path: string; content: string }[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  const [activeFileIndex, setActiveFileIndex] = React.useState(0);
  const [showWebPreview, setShowWebPreview] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState('http://127.0.0.1:3000');

  useEffect(() => {
    setShowWebPreview(true);
  }, []);

  const handleRefresh = () => {
    setPreviewUrl(prev => prev);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <Split 
          className="h-full flex split"
          sizes={[50, 50]}
          minSize={200}
          gutterStyle={(dimension) => ({
            backgroundColor: '#4a5568',
            width: '4px',
            cursor: 'col-resize'
          })}
          gutter={() => {
            const gutter = document.createElement('div')
            gutter.className = 'gutter bg-gray-600 hover:bg-indigo-500 transition-colors'
            return gutter
          }}
        >
          {/* Left Panel - Code Preview */}
          <div className="flex-1 flex flex-col">
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

          {/* Right Panel - Web Preview */}
          <div className="flex flex-col border-l border-gray-700">
            <div className="flex items-center p-2 bg-gray-800 border-b border-gray-700">
              <div className="flex-1 flex items-center gap-2 px-2 bg-gray-700 rounded-lg">
                <div className="flex space-x-2 p-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <input
                  type="url"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  className="flex-1 bg-transparent text-white px-2 py-1 focus:outline-none"
                  placeholder="Enter URL"
                />
                <button
                  onClick={() => setShowWebPreview(true)}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1">
              <Iframe
              url={previewUrl}
              width="100%"
              height="100%"
              className="border-0"
              display="block"
              position="relative"
              allowFullScreen
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;