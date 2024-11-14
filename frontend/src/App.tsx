import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FileList from './components/FileList';
import GroupList from './components/GroupList';

function App() {
  return (
    <Router>
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-gray-100">
            <Routes>
              <Route path="/" element={<FileList />} />
              <Route path="/groups" element={<GroupList />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
