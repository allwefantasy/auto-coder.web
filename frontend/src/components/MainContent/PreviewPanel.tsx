import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import Iframe from 'react-iframe';
import { getLanguageByFileName } from '../../utils/fileUtils';
import { ReloadOutlined } from '@ant-design/icons';

interface PreviewPanelProps {
  files: { path: string; content: string }[];
}

const DEFAULT_URL = 'http://127.0.0.1:3000';
const MIN_PANE_WIDTH = 300;

const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(DEFAULT_URL);
  const [leftPaneWidth, setLeftPaneWidth] = useState('50%');
  const separatorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = container.offsetWidth / 2;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const containerWidth = container.offsetWidth;
      const delta = e.clientX - startX;
      const newWidth = Math.max(MIN_PANE_WIDTH, Math.min(startWidth + delta, containerWidth - MIN_PANE_WIDTH));
      const percentage = (newWidth / containerWidth) * 100;
      setLeftPaneWidth(`${percentage}%`);
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const separator = separatorRef.current;
    if (separator) {
      separator.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      if (separator) {
        separator.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
    };
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreviewUrl(e.target.value);
  };

  const handleRefresh = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.src = previewUrl;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="h-full flex">
          {/* Left Panel - Code Preview */}
          <div style={{ width: leftPaneWidth }} className="flex-none flex flex-col">
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

          
          {/* Resizer */}
          <div 
            ref={separatorRef}
            className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize flex-none"
          />

          {/* Right Panel - Web Preview */}
          <div className="flex-1 flex flex-col border-l border-gray-700">
            <div className="p-4 bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-gray-700 text-white rounded-md border border-gray-600 overflow-hidden">
                  {/* URL Bar with browser-like styling */}
                  <div className="flex items-center px-2 bg-gray-600">
                    <ReloadOutlined 
                      className="text-gray-300 hover:text-white cursor-pointer" 
                      onClick={handleRefresh}
                    />
                  </div>
                  <input
                    type="url"
                    value={previewUrl}
                    onChange={handleUrlChange}
                    className="flex-1 px-3 py-2 bg-transparent border-none outline-none"
                    placeholder="Enter URL to preview"
                  />
                </div>
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