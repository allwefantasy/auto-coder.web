import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventBus, { EVENTS } from '../../services/eventBus';
import { Select, Tooltip, Spin, Button, Empty, Modal, Input, message } from 'antd';
import { DatabaseOutlined, ReloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import './ragSelectorStyles.css';

interface MCP {
  name: string;
  base_url: string;
  api_key: string;
}

const MCPs: React.FC = () => {
  const [mcps, setMcps] = useState<MCP[]>([]);
  const [selectedMcp, setSelectedMcp] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false);
  const [enableMcp, setEnableMcp] = useState<boolean>(false);

  const fetchMcps = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/mcps');
      const mcps = response.data.data || [];
      setMcps(mcps);
      if (mcps.length > 0) {
        setSelectedMcp(mcps[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch MCPs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMcps();
    const unsubscribe = EventBus.subscribe(EVENTS.MCP.UPDATED, fetchMcps);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedMcp) {
      const selected = mcps.find(m => m.name === selectedMcp);
      if (selected) {
        axios.post('/api/conf', {
          mcp_type: 'simple',
          mcp_url: selected.base_url,
          mcp_token: selected.api_key
        })        
      }
    }
  }, [selectedMcp, mcps]);

  const handleRefresh = () => {
    fetchMcps();
  };

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between mb-1">
        <Tooltip title="Select a Model Control Provider">
          <div 
            className="flex items-center cursor-pointer hover:text-blue-400"
            onClick={() => {
              const newValue = !showFileSelector;
              setShowFileSelector(newValue);
              setEnableMcp(newValue);
              EventBus.publish(EVENTS.MCP.ENABLED_CHANGED, newValue);
            }}
          >
            <DatabaseOutlined 
              className={`mr-1 ${showFileSelector ? 'text-blue-400' : 'text-gray-400'}`} 
              style={{ fontSize: '12px' }} 
            />
            <span className={`text-xxs ${showFileSelector ? 'text-blue-400' : 'text-gray-400'}`}>
              MCP Provider
            </span>
          </div>
        </Tooltip>
        {showFileSelector && (
          <Tooltip title="Refresh MCP providers">
            <Button 
              type="text" 
              size="small" 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              className="text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center h-5 w-5"
              disabled={loading}
            />
          </Tooltip>
        )}
      </div>
      
      {showFileSelector && (
        <>
        <div className="relative">
          <Select
            className="w-full custom-rag-select"
            size="small"
            loading={loading}
            placeholder="Select MCP"
            value={selectedMcp}
            onChange={(value) => setSelectedMcp(value)}
            options={mcps.map(m => ({ 
              label: m.name, 
              value: m.name 
            }))}            
            dropdownRender={(menu) => (
              <div>
                {menu}
                {mcps.length === 0 && !loading && (
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description="No MCP providers found" 
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
      </>
      )}
    </div>
  );
};

export default MCPs;