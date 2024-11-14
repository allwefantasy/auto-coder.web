import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface FileItem {
  type: 'file' | 'directory';
  name: string;
  path: string;
  children?: FileItem[];
}

const CodeEditor: React.FC = () => {
  const [fileTree, setFileTree] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileTree = async () => {
      setLoading(true);
      try {
        const projectPath = localStorage.getItem('projectPath');
        if (!projectPath) return;
        
        const response = await axios.get(`/api/project/structure?path=${encodeURIComponent(projectPath)}`);
        setFileTree(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file structure');
      } finally {
        setLoading(false);
      }
    };

    fetchFileTree();
  }, []);

  const renderFileTree = (item: FileItem, depth: number = 0) => {
    const icon = item.type === 'directory' ? '📁' : '📄';
    
    return (
      <div key={item.path} style={{ paddingLeft: `${depth * 16}px` }}>
        <div className="text-gray-400 hover:text-white cursor-pointer py-1">
          <span className="text-sm">{icon} {item.name}</span>
        </div>
        {item.type === 'directory' && item.children?.map(child => 
          renderFileTree(child, depth + 1)
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Code Editor Header */}
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <div className="flex items-center">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button 
              className="px-2.5 py-1 text-xs font-medium bg-gray-800 text-white border border-gray-600 rounded-l-md hover:bg-gray-700 hover:border-gray-500 focus:z-10 focus:ring-1 focus:ring-blue-400 focus:bg-gray-700"
            >
              Code
            </button>
            <button 
              className="px-2.5 py-1 text-xs font-medium bg-gray-800 text-gray-300 border border-l-0 border-gray-600 rounded-r-md hover:bg-gray-700 hover:text-white hover:border-gray-500 focus:z-10 focus:ring-1 focus:ring-blue-400 focus:bg-gray-700"
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Code Editor Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* File Tree */}
          <div className="w-48 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-2">
              {loading && (
                <div className="text-gray-400 text-sm">Loading...</div>
              )}
              {error && (
                <div className="text-red-400 text-sm">{error}</div>
              )}
              {fileTree && renderFileTree(fileTree)}
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 bg-gray-900 overflow-y-auto">
            <pre className="p-4">
              <code className="text-gray-300 font-mono">
                // Your code will appear here                
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;