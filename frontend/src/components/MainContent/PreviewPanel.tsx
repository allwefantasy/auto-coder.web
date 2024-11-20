import React from 'react';
import Editor from '@monaco-editor/react';
import Iframe from 'react-iframe';
import { getLanguageByFileName } from '../../utils/fileUtils';

interface PreviewPanelProps {
  files: { path: string; content: string }[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  const [activeFileIndex, setActiveFileIndex] = React.useState(0);
  const [showWebPreview, setShowWebPreview] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState('');

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('url') as HTMLInputElement;
    if (input.value) {
      setPreviewUrl(input.value);
      setShowWebPreview(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
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
          <div className="w-1/2 flex flex-col border-l border-gray-700">
            <div className="p-4 bg-gray-800">
              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <input
                  type="url"
                  name="url"
                  placeholder="Enter URL to preview"
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 
                    focus:outline-none focus:border-blue-500"
                  defaultValue={previewUrl}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                    focus:ring-offset-gray-800"
                >
                  Preview
                </button>
                {showWebPreview && (
                  <button
                    type="button"
                    onClick={() => setShowWebPreview(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 
                      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
                      focus:ring-offset-gray-800"
                  >
                    Close
                  </button>
                )}
              </form>
            </div>
            <div className="flex-1">
              {showWebPreview ? (
                <Iframe
                  url={previewUrl}
                  width="100%"
                  height="100%"
                  className="border-0"
                  display="block"
                  position="relative"
                  allowFullScreen
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Enter a URL above to preview web content
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;