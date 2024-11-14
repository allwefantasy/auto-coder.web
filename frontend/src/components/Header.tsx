import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src="/avatar.png" 
            alt="User Avatar"
            className="w-10 h-10 rounded-full mr-4" 
          />
          <h1 className="text-xl font-bold">File Group Manager</h1>
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li className="hover:text-gray-300">Files</li>
            <li className="hover:text-gray-300">Groups</li>
            <li className="hover:text-gray-300">Settings</li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;