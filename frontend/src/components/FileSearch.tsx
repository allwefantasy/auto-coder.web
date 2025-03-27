import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Input, List } from 'antd';
import { getMessage } from './Sidebar/lang';

interface FileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string) => void;
}

const FileSearch: React.FC<FileSearchProps> = ({ isOpen, onClose, onSelectFile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string, path: string, display: string}>>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchInputRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleFileSearch = useCallback(async (term: string) => {
    if (!term) {
      setSearchResults([]);
      setSelectedIndex(-1);
      return;
    }
    try {
      const response = await fetch(`/api/completions/files?name=${encodeURIComponent(term)}`);
      const data = await response.json();
      setSearchResults(data.completions);
      setSelectedIndex(data.completions.length > 0 ? 0 : -1);
    } catch (error) {
      console.error('Error fetching file completions:', error);
    }
  }, []);

  const handleSelectFile = (path: string) => {
    onSelectFile(path);
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedIndex(-1);
    onClose();
  };

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => 
        prevIndex < searchResults.length - 1 ? prevIndex + 1 : prevIndex
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectFile(searchResults[selectedIndex].path);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Modal
      title={getMessage('searchFiles')}
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={600}
      className="dark-theme-modal"
      styles={{
        content: {
          backgroundColor: '#1f2937',
          padding: '20px',
        },
        header: {
          backgroundColor: '#1f2937',
          borderBottom: '1px solid #374151',
        },
        body: {
          backgroundColor: '#1f2937',
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
      }}
    >
      <div className="my-4">
        <Input
          ref={searchInputRef}
          autoFocus
          placeholder={getMessage('searchFilesPlaceholder')}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            handleFileSearch(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClose();
            } else {
              handleKeyNavigation(e);
            }
          }}
          className="dark-theme-input bg-gray-800 text-gray-200 border-gray-700"
          style={{
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            color: '#e5e7eb',
          }}
        />
      </div>
      <div ref={listRef} className="dark-theme-list max-h-96 overflow-y-auto">
        <List
          dataSource={searchResults}
          renderItem={(item, index) => (
            <List.Item
              data-index={index}
              className={`cursor-pointer text-gray-200 border-gray-700 ${
                selectedIndex === index ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
              onClick={() => handleSelectFile(item.path)}
            >
              <div className="flex flex-col">
                <span className="text-white">{item.display}</span>
                <span className="text-gray-400 text-sm">{item.path}</span>
              </div>
            </List.Item>
          )}          
        />
      </div>
    </Modal>
  );
};

export default FileSearch; 