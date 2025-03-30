import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import Iframe from 'react-iframe';
import Split from 'react-split';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import './PreviewPanel.css';
import { getLanguageByFileName } from '../../utils/fileUtils';
import { fetchPreviewUrl, updatePreviewUrl } from '../../services/configService';
import { debounce } from 'lodash';

interface PreviewPanelProps {
  files: { path: string; content: string }[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [showWebPreview, setShowWebPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('http://127.0.0.1:3000'); // Default value
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);

  // Refs and Debounce
  const debouncedSaveUrl = useRef(
    debounce(async (url: string) => {
      try {
        await updatePreviewUrl(url);
      } catch (error) {
        console.error('Failed to save preview URL:', error);
        // Optionally show an error message to the user
      }
    }, 500) // Save after 500ms of inactivity
  ).current;

  // Fetch initial URL on mount
  useEffect(() => {
    const loadUrl = async () => {
      setIsLoadingUrl(true);
      try {
        const fetchedUrl = await fetchPreviewUrl();
        setPreviewUrl(fetchedUrl || 'http://127.0.0.1:3000'); // Use fetched or default
        setShowWebPreview(true); // Show preview after URL is loaded
      } catch (error) {
        console.error('Failed to fetch preview URL:', error);
        setShowWebPreview(true); // Still show preview even if fetch fails
      } finally {
        setIsLoadingUrl(false);
      }
    };
    loadUrl();
  }, []);

  // Save URL when it changes (debounced)
  useEffect(() => {
    if (!isLoadingUrl) { // Don't save during initial load
      debouncedSaveUrl(previewUrl);
    }
    // Cleanup debounce on unmount
    return () => {
      debouncedSaveUrl.cancel();
    };
  }, [previewUrl, isLoadingUrl, debouncedSaveUrl]);


  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setPreviewUrl(newUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Force save immediately on Enter, cancelling any pending debounce
      debouncedSaveUrl.cancel();
      updatePreviewUrl(previewUrl).catch(error => console.error('Failed to save preview URL on enter:', error));
      
      // Trigger iframe reload
      setShowWebPreview(false);
      setTimeout(() => setShowWebPreview(true), 50); 
    }
  };
  
  const handleReloadClick = () => {
      // Force save immediately on Reload click, cancelling any pending debounce
      debouncedSaveUrl.cancel();
      updatePreviewUrl(previewUrl).catch(error => console.error('Failed to save preview URL on reload:', error));

      setShowWebPreview(false);
      setTimeout(() => setShowWebPreview(true), 50);
  }

  // --- Conditional Computations ---

  // Split sizes based on collapse state
  const splitSizes = isCollapsed ? [10, 90] : [50, 50];
  const splitMinSize = isCollapsed ? [50, 200] : [200, 200];

  // Collapse button style based on collapse state
  const collapseButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    backgroundColor: '#4B5563', // gray-700
    borderRadius: '9999px',
    padding: '0.25rem', // p-1
    transition: 'background-color 0.2s',
  };
  if (isCollapsed) {
    collapseButtonStyle.left = '-10px';
  } else {
    collapseButtonStyle.right = '-10px';
  }

  // Active file details
  const activeFile = files[activeFileIndex];
  const activeFileLanguage = activeFile ? getLanguageByFileName(activeFile.path) : 'plaintext';
  const activeFileContent = activeFile ? activeFile.content : '';

  // URL input container class based on focus state
  let urlInputContainerClass = 'flex items-center px-2 py-1 bg-gray-900 rounded-lg border border-gray-700';
  if (isUrlFocused) {
    urlInputContainerClass = 'flex items-center px-2 py-1 bg-gray-900 rounded-lg border border-blue-500';
  }

  // Helper function for file tab class
  const getFileTabClass = (index: number): string => {
    const baseClass = 'px-4 py-2 text-sm flex-shrink-0';
    if (index === activeFileIndex) {
      return `${baseClass} bg-gray-700 text-white`;
    } else {
      return `${baseClass} text-gray-300 hover:bg-gray-600`;
    }
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <Split
          className="split-container"
          sizes={splitSizes}
          minSize={splitMinSize}
          gutterSize={8}
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          style={{ display: 'flex', flexDirection: 'row', height: '100%' }}
        >
          {/* Left Panel - Code Preview */}
          <div className={`flex flex-col relative ${isCollapsed ? 'w-[50px]' : 'flex-1'} overflow-hidden`}>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={collapseButtonStyle}
              className="hover:bg-gray-600" // Add hover effect separately if needed
            >
               {/* Icons can remain conditional */}
               {isCollapsed ? <RightOutlined className="text-white text-xs" /> : <LeftOutlined className="text-white text-xs" />}
            </button>
            {!isCollapsed && (
              <>
                {files.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    No changes to preview
                  </div>
                ) : (
                  <>
                    <div className="flex bg-gray-800 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                      {files.map((file, index) => (
                        <button
                          key={file.path}
                          className={getFileTabClass(index)} // Use helper function
                          onClick={() => setActiveFileIndex(index)}
                          title={file.path}
                        >
                          {file.path.split('/').pop() || file.path}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <Editor
                        height="100%"
                        language={activeFileLanguage} // Use computed variable
                        theme="vs-dark"
                        value={activeFileContent} // Use computed variable
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
              </>
            )}
          </div>

          {/* Right Panel - Web Preview */}
          <div className="flex flex-col flex-1 border-l border-gray-700 overflow-hidden">
            <div className="p-2 bg-gray-800 flex-shrink-0">
              <div className={urlInputContainerClass}> {/* Use computed class */}
                <input
                  type="url"
                  value={previewUrl}
                  onChange={handleUrlChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsUrlFocused(true)}
                  onBlur={() => setIsUrlFocused(false)}
                  className="flex-1 px-2 py-1 bg-transparent text-white text-sm focus:outline-none"
                  placeholder="Enter URL to preview"
                  disabled={isLoadingUrl} // Disable input while loading
                />
                <button
                  onClick={handleReloadClick}
                  className="px-2 text-gray-400 hover:text-white"
                  title="Reload Preview"
                  disabled={isLoadingUrl}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white"> {/* Changed background to white for better iframe visibility */}
              {isLoadingUrl ? (
                 <div className="h-full flex items-center justify-center text-gray-500">
                   Loading preview URL...
                 </div>
              ) : showWebPreview ? (
            {files.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400"> {/* Use flex-1 */}
                No changes to preview
              </div>
            ) : (
              <>
                <div className="flex bg-gray-800 flex-shrink-0"> {/* Added flex-shrink-0 */}
                  {files.map((file, index) => (
                    <button
                      key={file.path}
                      className={`px-4 py-2 text-sm ${
                        index === activeFileIndex ? 'bg-gray-700 text-white' : 'text-gray-300'
                      }`}
                      onClick={() => setActiveFileIndex(index)}
                      title={file.path}
                    >
                      {file.path.split('/').pop()}
                    </button>
                    {files.map((file, index) => (
                      <button
                        key={file.path}
                        className={`px-4 py-2 text-sm flex-shrink-0 ${ /* Added flex-shrink-0 */
                          index === activeFileIndex ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-600' /* Added hover */
                        }`}
                        onClick={() => setActiveFileIndex(index)}
                        title={file.path}
                      >
                        {file.path.split('/').pop() || file.path /* Handle empty filename */}
                      </button>
                    ))}
                  </div>
                <div className="flex-1 overflow-hidden"> {/* Added overflow-hidden */}
                  <Editor
                    height="100%"
                    language={files[activeFileIndex] ? getLanguageByFileName(files[activeFileIndex].path) : 'plaintext'} /* Handle no file */
                    theme="vs-dark"
                    value={files[activeFileIndex] ? files[activeFileIndex].content : ''} /* Handle no file */
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
          <div className="flex flex-col flex-1 border-l border-gray-700 overflow-hidden"> {/* Added flex-1 and overflow-hidden */}
            <div className="p-2 bg-gray-800 flex-shrink-0"> {/* Added flex-shrink-0 */}
              <div className={`flex items-center px-2 py-1 bg-gray-900 rounded-lg border ${isUrlFocused ? 'border-blue-500' : 'border-gray-700'}`}>
                {/* Removed the "+" icon */}
                <input
                  type="url"
                  value={previewUrl}
                  onChange={handleUrlChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsUrlFocused(true)}
                  onBlur={() => setIsUrlFocused(false)}
                  className="flex-1 px-2 py-1 bg-transparent text-white text-sm focus:outline-none"
                  placeholder="Enter URL to preview"
                  disabled={isLoadingUrl} // Disable input while loading
                />
                <button
                  onClick={handleReloadClick}
                  className="px-2 text-gray-400 hover:text-white"
                  title="Reload Preview"
                  disabled={isLoadingUrl}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white relative"> {/* Changed background & added relative positioning */}
              {/* Loading Indicator */}
              {isLoadingUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-white z-10">
                  Loading preview URL...
                </div>
              )}

              {/* Web Preview Iframe (conditionally rendered but always present in DOM structure when not loading) */}
              {!isLoadingUrl && showWebPreview && (
                <Iframe
                  url={previewUrl}
                  width="100%"
                  height="100%"
                  className="border-0"
                  display="block"
                  position="relative"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups" // Added sandbox for security
                />
              )}

              {/* Placeholder/Reloading Message */}
              {!isLoadingUrl && !showWebPreview && (
                 <div className="h-full flex items-center justify-center text-gray-500">
                   {/* Ternary for simple text choice is often acceptable, but replacing if required: */}
                   {previewUrl && <span>Reloading preview...</span>}
                   {!previewUrl && <span>Enter a URL above to preview web content</span>}
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