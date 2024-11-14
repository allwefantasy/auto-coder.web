import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gray-600"></div>
                <h1 className="text-xl font-bold">File Group Management System</h1>
            </div>
            <nav className="flex space-x-4">
                <button className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Menu 1</button>
                <button className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Menu 2</button>
            </nav>
        </header>
    );
};

export default Header;