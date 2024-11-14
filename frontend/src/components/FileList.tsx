import React from 'react';

interface FileItem {
  name: string;
  type: string;
  size: string;
  modified: string;
}

const FileList: React.FC = () => {
  const files: FileItem[] = [
    {
      name: "Document.pdf",
      type: "PDF",
      size: "2.5 MB",
      modified: "2024-03-20"
    },
    // Add more sample files as needed
  ];

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.map((file, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">{file.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{file.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">{file.size}</td>
                <td className="px-6 py-4 whitespace-nowrap">{file.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileList;