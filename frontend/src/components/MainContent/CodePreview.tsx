import React from 'react';

const CodePreview: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 bg-gray-900 p-4">
        <div className="h-full overflow-y-auto">
          <pre className="text-gray-300">
            <code>
              // Code preview will appear here
              function example() {
                console.log("Hello World");
              }
            </code>
          </pre>
        </div>
      </div>
      <div className="h-1/2 bg-gray-800 border-t border-gray-700">
        <iframe className="w-full h-full bg-white" title="Preview">
        </iframe>
      </div>
    </div>
  );
};

export default CodePreview;