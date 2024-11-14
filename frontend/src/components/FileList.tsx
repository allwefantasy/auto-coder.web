import React from 'react';

const FileList: React.FC = () => {
    return (
        <div className="p-4 bg-gray-900 rounded-lg mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-white text-lg font-semibold">Files</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Add File
                </button>
            </div>
            <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center justify-between bg-gray-800 p-3 rounded">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-700 rounded"></div>
                            <span className="text-white">File {item}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">Edit</button>
                            <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FileList;