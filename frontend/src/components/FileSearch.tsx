import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Input, List, Button, Checkbox } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getMessage } from '../lang';
interface FileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string) => void;
}

const FileSearch: React.FC<FileSearchProps> = ({ isOpen, onClose, onSelectFile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string, path: string, display: string}>>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [contentSearch, setContentSearch] = useState(false);
  const searchInputRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleFileSearch = useCallback(async (term: string, isContentSearch: boolean) => {
    if (!term) {
      setSearchResults([]);
      setSelectedIndex(-1);
      setShowSmartSearch(false);
      return;
    }
    try {
      setIsLoading(true);
      
      if(isContentSearch){
        // 调用新接口，搜索文件内容
        const resp = await fetch(`/api/search-in-files?query=${encodeURIComponent(term)}`);
        const data = await resp.json();
        const formattedResults = data.files.map((path: string) => ({
          name: path.split('/').pop() || path,
          path,
          display: path
        }));
        setSearchResults(formattedResults);
        setSelectedIndex(formattedResults.length > 0 ? 0 : -1);
        setShowSmartSearch(formattedResults.length === 0);
      }else{
        // 并行获取文件和符号搜索结果
        const [fileResponse, symbolResponse] = await Promise.all([
          fetch(`/api/completions/files?name=${encodeURIComponent(term)}`),
          fetch(`/api/completions/symbols?name=${encodeURIComponent(term)}`)
        ]);
        
        const fileData = await fileResponse.json();
        const symbolData = await symbolResponse.json();
        
        // 合并文件和符号搜索结果
        const combinedResults = [
          ...fileData.completions,
          ...symbolData.completions
        ];
        
        setSearchResults(combinedResults);
        setSelectedIndex(combinedResults.length > 0 ? 0 : -1);
        setShowSmartSearch(combinedResults.length === 0);
      }
    } catch (error) {
      console.error('Error fetching completions:', error);
      setShowSmartSearch(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSmartSearch = async () => {
    if (!searchTerm) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/index/query?query=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      // 将索引搜索结果转换为文件搜索结果格式
      const formattedResults = data.sources.map((source: any) => ({
        name: source.module_name.split('/').pop() || source.module_name,
        path: source.module_name,
        display: source.module_name
      }));
      
      setSearchResults(formattedResults);
      setSelectedIndex(formattedResults.length > 0 ? 0 : -1);
      setShowSmartSearch(false);
    } catch (error) {
      console.error('Error performing smart search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = (path: string) => {
    onSelectFile(path);
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedIndex(-1);
    setShowSmartSearch(false);
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
      title={getMessage('searchFilesAndSymbols')}
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
      <div className="my-4 space-y-2">
        <Input
          ref={searchInputRef}
          autoFocus
          placeholder={getMessage('searchFilesAndSymbolsPlaceholder')}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            handleFileSearch(e.target.value, contentSearch);
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
        <Checkbox
          checked={contentSearch}
          onChange={e => {
            const newContentSearch = e.target.checked;
            setContentSearch(newContentSearch);
            if (searchTerm) {
              handleFileSearch(searchTerm, newContentSearch);
            }
          }}
          style={{ color: '#e5e7eb' }}
        >
          搜索文件内容
        </Checkbox>
      </div>
      <div ref={listRef} className="dark-theme-list max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-4 text-gray-400">
            Loading...
          </div>
        ) : showSmartSearch ? (
          <div className="flex flex-col items-center py-4">
            <p className="text-gray-400 mb-3">No exact matches found. Try smart search?</p>
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={handleSmartSearch}
              className="bg-blue-600 hover:bg-blue-700 border-blue-600"
            >
              Smart Search
            </Button>
          </div>
        ) : (
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
                <span className="text-gray-400 text-sm">
                  {item.path}
                  {item.name !== item.path && ` (${item.name})`}
                </span>
              </div>
              </List.Item>
            )}
            locale={{ emptyText: 'No results found' }}
          />
        )}
      </div>
    </Modal>
  );
};

export default FileSearch; 