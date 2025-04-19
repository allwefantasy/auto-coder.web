import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventBus, { EVENTS } from '../../services/eventBus';
import { Select, Tooltip, Spin, Button, Empty, Modal, Input, message } from 'antd';
import { DatabaseOutlined, ReloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import './ragSelectorStyles.css';

interface Rag {
  name: string;
  base_url: string;
  api_key: string;
}


const RagSelector: React.FC = () => {
  const [rags, setRags] = useState<Rag[]>([]);
  const [selectedRag, setSelectedRag] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false);
  
  // 用于跟踪RAG是否启用的状态
  const [enableRag, setEnableRag] = useState<boolean>(false);

  const fetchRags = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/rags');
      const rags = response.data.data || [];
      setRags(rags);
      if (rags.length > 0) {
        setSelectedRag(rags[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch RAGs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRags();
    const unsubscribe = EventBus.subscribe(EVENTS.RAG.UPDATED, fetchRags);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedRag) {
      const selected = rags.find(r => r.name === selectedRag);
      if (selected) {
        axios.post('/api/conf', {
          rag_type: 'simple',
          rag_url: selected.base_url,
          rag_token: selected.api_key
        })        
      }
    }
  }, [selectedRag, rags]);

  const handleRefresh = () => {
    fetchRags();
  };

  return (
    <div className="w-full mb-0">
      <div className="flex items-center justify-between h-5">
        <Tooltip title="Select a Retrieval-Augmented Generation provider">
          <div
            className="flex items-center cursor-pointer hover:text-blue-400"
            onClick={() => {
              const newValue = !showFileSelector;
              setShowFileSelector(newValue);
              setEnableRag(newValue);
              EventBus.publish(EVENTS.RAG.ENABLED_CHANGED, newValue);
            }}
          >
            <DatabaseOutlined
              className={`mr-1 ${showFileSelector ? 'text-blue-400' : 'text-gray-400'}`}
              style={{ fontSize: '11px' }}
            />
            <span className={`text-xxs truncate ${showFileSelector ? 'text-blue-400' : 'text-gray-400'}`}>
              RAG Provider
            </span>
          </div>
        </Tooltip>
        {showFileSelector && (
          <Tooltip title="Refresh RAG providers">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined style={{ fontSize: '11px' }} />}
              onClick={handleRefresh}
              className="text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center h-4 w-4"
              disabled={loading}
            />
          </Tooltip>
        )}
      </div>

      {showFileSelector && (
        <div className="relative mt-0.5">
          <Select
            className="w-full custom-rag-select"
            size="small"
            loading={loading}
            placeholder="Select RAG"
            value={selectedRag}
            onChange={(value) => setSelectedRag(value)}
            options={rags.map(r => ({ label: r.name, value: r.name }))}
            dropdownMatchSelectWidth={false}
            dropdownRender={(menu) => (
              <div>
                {menu}
                {rags.length === 0 && !loading && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No RAG providers found"
                    className="my-1"
                    imageStyle={{ height: 24 }}
                  />
                )}
              </div>
            )}
          />
          <Button
            type="text"
            icon={<FileSearchOutlined style={{ fontSize: '11px' }} />}
            className="absolute right-0 top-0 text-gray-400 hover:text-blue-400 h-full px-1 flex items-center"
            onClick={() => setShowFileSelector(true)}
          />
        </div>
      )}
    </div>
  );
};

export default RagSelector;