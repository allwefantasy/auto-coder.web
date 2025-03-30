import React, { useState, useEffect } from 'react';
import { Select, Tooltip, Spin, Button, Empty, Modal, Input, message } from 'antd';
import { DatabaseOutlined, ReloadOutlined, PlusOutlined, FileSearchOutlined } from '@ant-design/icons';

interface Rag {
  name: string;
  base_url: string;
  api_key: string;
}

// Add global styles
const globalStyles = `
  .custom-rag-select .ant-select-selector {
    background-color: #1e293b !important;
    border-color: #374151 !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
    transition: all 0.3s !important;
  }
  .custom-rag-select:hover .ant-select-selector {
    border-color: #4b5563 !important;
  }
  .custom-rag-select.ant-select-focused .ant-select-selector {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  }
  .rag-file-selector-modal .ant-modal-content {
    background-color: #1f2937;
    border: 1px solid #374151;
  }
  .rag-file-selector-modal .ant-modal-header {
    background-color: #1f2937;
    border-bottom: 1px solid #374151;
  }
  .rag-file-selector-modal .ant-modal-title {
    color: #e5e7eb;
  }
  .rag-file-selector-modal .ant-modal-close {
    color: #9ca3af;
  }
  .rag-file-selector-modal .ant-modal-close:hover {
    color: #e5e7eb;
  }
`;

// Add style element to document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  document.head.appendChild(styleElement);
}

const RagSelector: React.FC = () => {
  const [rags, setRags] = useState<Rag[]>([]);
  const [selectedRag, setSelectedRag] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string>('');

  const fetchRags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rags');
      const data = await response.json();
      setRags(data.data || []);
    } catch (err) {
      console.error('Failed to fetch RAGs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRags();
  }, []);

  const handleRefresh = () => {
    fetchRags();
  };

  const closeFileSelector = () => {
    setShowFileSelector(false);
  };

  const handleFileSelect = () => {
    if (selectedFile) {
      closeFileSelector();
      message.success(`Selected file: ${selectedFile}`);
    } else {
      message.warning('Please select or search for a file');
    }
  };

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between mb-1">
        <Tooltip title="Select a Retrieval-Augmented Generation provider">
          <div className="flex items-center">
            <DatabaseOutlined className="text-blue-400 mr-1" style={{ fontSize: '12px' }} />
            <span className="text-gray-300 text-xs">RAG Provider</span>
          </div>
        </Tooltip>
        <Tooltip title="Refresh RAG providers">
          <Button 
            type="text" 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            className="text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center h-5 w-5"
            disabled={loading}
          />
        </Tooltip>
      </div>
      
      <div className="relative">
        <Select
          className="w-full custom-rag-select"
          size="small"
          loading={loading}
          placeholder="Select RAG"
          value={selectedRag}
          onChange={(value) => setSelectedRag(value)}
          options={rags.map(r => ({ 
            label: r.name, 
            value: r.name 
          }))}
          dropdownMatchSelectWidth={false}
          dropdownRender={(menu) => (
            <div>
              {menu}
              {rags.length === 0 && !loading && (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="No RAG providers found" 
                  className="my-2"
                  imageStyle={{ height: 32 }}
                />
              )}              
            </div>
          )}
        />
        <Button 
          type="text" 
          icon={<FileSearchOutlined />} 
          className="absolute right-0 top-0 text-gray-400 hover:text-blue-400 h-full px-2 flex items-center"
          onClick={() => setShowFileSelector(true)}
        />
      </div>

      <Modal
        title="选择文件或搜索文件"
        open={showFileSelector}
        onCancel={closeFileSelector}
        footer={[
          <Button key="cancel" onClick={closeFileSelector}>
            取消
          </Button>,
          <Button key="select" type="primary" onClick={handleFileSelect}>
            选择
          </Button>,
        ]}
        className="rag-file-selector-modal"
        width={600}
      >
        <div className="mb-4">
          <Input 
            placeholder="搜索文件..." 
            prefix={<FileSearchOutlined />} 
            allowClear
            className="mb-2"
          />
          <div className="bg-gray-900 p-3 rounded-md border border-gray-700 h-64 overflow-auto">
            <div className="text-gray-400 text-sm">请选择文件或搜索文件</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RagSelector;