import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import Iframe from 'react-iframe';
import Split from 'react-split';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import './PreviewPanel.css';
import { getLanguageByFileName } from '../../utils/fileUtils';
import { getMessage } from '../../lang';
import axios from 'axios';

interface PreviewPanelProps {
  files: { path: string; content: string }[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  const [activeFileIndex, setActiveFileIndex] = React.useState(0);
  const [showWebPreview, setShowWebPreview] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState('http://127.0.0.1:3000');
  const [debouncedPreviewUrl, setDebouncedPreviewUrl] = React.useState('');
  const [isUrlFocused, setIsUrlFocused] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  useEffect(() => {
    // 获取保存的预览URL
    const fetchPreviewUrl = async () => {
      try {
        const response = await axios.get('/api/config/ui/preview-url');
        if (response.data && response.data.preview_url) {
          setPreviewUrl(response.data.preview_url);
        }
      } catch (error) {
        console.error('Failed to fetch preview URL:', error);
      }
    };
    
    fetchPreviewUrl();
    setShowWebPreview(true);
  }, []);

  // 使用防抖来保存URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPreviewUrl(previewUrl);
    }, 1000); // 1秒后保存URL
    
    return () => clearTimeout(timer);
  }, [previewUrl]);
  
  // 当防抖的URL变化时保存到后端
  useEffect(() => {
    if (debouncedPreviewUrl && debouncedPreviewUrl !== 'http://127.0.0.1:3000') {
      const savePreviewUrl = async () => {
        try {
          await axios.put('/api/config/ui/preview-url', {
            preview_url: debouncedPreviewUrl
          });
        } catch (error) {
          console.error('Failed to save preview URL:', error);
        }
      };
      
      savePreviewUrl();
    }
  }, [debouncedPreviewUrl]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreviewUrl(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowWebPreview(false);
      setTimeout(() => setShowWebPreview(true), 100); // Brief delay to trigger reload
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <Split 
          className="split-container"
          sizes={(isCollapsed && [10, 90]) || [50, 50]}
          minSize={(isCollapsed && [50, 200]) || [200, 200]}
          gutterSize={8}
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          style={{ display: 'flex', flexDirection: 'row', height: '100%' }}
        >
          {/* Left Panel - Code Preview */}
          <div className={`flex flex-col relative ${(isCollapsed && 'w-[50px]') || ''}`}>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-10 
                        bg-gray-700 rounded-full p-1 hover:bg-gray-600 transition-colors"
            >
              {(isCollapsed && <RightOutlined />) || <LeftOutlined />}
            </button>
            {(files.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                {getMessage('noChangesToPreview')}
              </div>
            )) || (
              <>
                <div className="flex bg-gray-800">
                  {files.map((file, index) => (
                    <button
                      key={file.path}
                      className={`px-4 py-2 text-sm ${
                        (index === activeFileIndex && 'bg-gray-700 text-white') || 'text-gray-300'
                      }`}
                      onClick={() => setActiveFileIndex(index)}
                      title={file.path}
                    >
                      {file.path.split('/').pop()}
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
            <div className="p-2 bg-gray-800">
              <div className={`flex items-center px-2 py-1 bg-gray-900 rounded-lg border ${(isUrlFocused && 'border-blue-500') || 'border-gray-700'}`}>
                <div className="flex items-center px-2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <input
                  type="url"
                  value={previewUrl}
                  onChange={handleUrlChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsUrlFocused(true)}
                  onBlur={() => setIsUrlFocused(false)}
                  className="flex-1 px-2 py-1 bg-transparent text-white text-sm focus:outline-none"
                  placeholder={getMessage('enterUrlToPreview')}
                />
                <button
                  onClick={() => {
                    setShowWebPreview(false);
                    setTimeout(() => setShowWebPreview(true), 100);
                  }}
                  className="px-2 text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1">
              {(showWebPreview && (
                <Iframe
                  url={previewUrl}
                  width="100%"
                  height="100%"
                  className="border-0"
                  display="block"
                  position="relative"
                  allowFullScreen
                />
              )) || (
                <div className="h-full flex items-center justify-center text-gray-400">
                  {getMessage('enterUrlAboveToPreview')}
                </div>
              )}
            </div>
          </div>
        </Split>
      </div>
    </div>    
  );
};

export default PreviewPanel;