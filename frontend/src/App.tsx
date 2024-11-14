import React from 'react';
import Header from './components/Header';
import FileList from './components/FileList';
import GroupList from './components/GroupList';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8">
          <FileList />
          <GroupList />
        </div>
      </main>
    </div>
  );
}

export default App;
