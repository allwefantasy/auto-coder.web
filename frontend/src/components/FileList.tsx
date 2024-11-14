import React from 'react';

interface File {
  name: string;
  type: string;
  size: string;
  modified: string;
}

const FileList: React.FC = () => {
  const files: File[] = [
    { name: 'document.txt', type: 'Text', size: '2.3 MB', modified: '2024-03-14' },
    { name: 'image.png', type: 'Image', size: '1.5 MB', modified: '2024-03-13' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Files</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Size</th>
              <th className="px-4 py-2 text-left">Modified</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{file.name}</td>
                <td className="px-4 py-2">{file.type}</td>
                <td className="px-4 py-2">{file.size}</td>
                <td className="px-4 py-2">{file.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileList;