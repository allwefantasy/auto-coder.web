import React, { useState } from 'react';

interface FileGroup {
  name: string;
  description: string;
  files: {
    path: string;
    content: string;
  }[];
}

const FileGroupPanel: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<FileGroup | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // 示例数据
  const fileGroups: FileGroup[] = [
    {
      name: "Setup Files",
      description: "Project configuration and setup files",
      files: [
        { path: "setup.py", content: "# Setup file content..." },
        { path: "requirements.txt", content: "# Requirements content..." }
      ]
    },
    {
      name: "Frontend Core",
      description: "Core frontend application files",
      files: [
        { path: "src/App.tsx", content: "// App content..." },
        { path: "src/index.tsx", content: "// Index content..." }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-2 border-b border-gray-700">
        <h2 className="text-white text-lg font-semibold">File Groups</h2>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* File Groups List */}
          <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              {fileGroups.map((group) => (
                <div
                  key={group.name}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedGroup?.name === group.name
                      ? 'bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <h3 className="text-white font-medium">{group.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{group.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Files List and Content */}
          <div className="flex-1 flex">
            {/* Files List */}
            <div className="w-48 bg-gray-900 border-r border-gray-700 overflow-y-auto">
              <div className="p-2">
                {selectedGroup?.files.map((file) => (
                  <div
                    key={file.path}
                    className={`p-2 text-sm cursor-pointer ${
                      selectedFile === file.path
                        ? 'text-white bg-gray-700'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedFile(file.path)}
                  >
                    📄 {file.path}
                  </div>
                ))}
              </div>
            </div>

            {/* File Content */}
            <div className="flex-1 bg-gray-900 overflow-y-auto">
              <pre className="p-4">
                <code className="text-gray-300 font-mono">
                  {selectedFile
                    ? selectedGroup?.files.find(f => f.path === selectedFile)?.content
                    : "Select a file to view its content"}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileGroupPanel;