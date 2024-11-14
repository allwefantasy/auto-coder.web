import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-900 text-white h-screen">
      <nav className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Files</h2>
          <ul className="space-y-2">
            <li className="hover:bg-gray-700 p-2 rounded">Documents</li>
            <li className="hover:bg-gray-700 p-2 rounded">Images</li>
            <li className="hover:bg-gray-700 p-2 rounded">Videos</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Groups</h2>
          <ul className="space-y-2">
            <li className="hover:bg-gray-700 p-2 rounded">Work</li>
            <li className="hover:bg-gray-700 p-2 rounded">Personal</li>
            <li className="hover:bg-gray-700 p-2 rounded">Projects</li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;