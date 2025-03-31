import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventBus, { EVENTS } from '../../services/eventBus'; // Assuming EVENTS.MCPS exists or will be added
import { Select, Tooltip, Spin, Button, Empty } from 'antd';
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons'; // Changed icon
import './ragSelectorStyles.css'; // Reusing styles for now, might need specific ones later

interface MCP {
  name: string;
  // Add other relevant fields for MCP if different from Rag
  base_url?: string; // Example field
  api_key?: string;  // Example field
}


const MCPsSelector: React.FC = () => {
  const [mcps, setMcps] = useState<MCP[]>([]);
  const [selectedMCP, setSelectedMCP] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [showMCPSelector, setShowMCPSelector] = useState<boolean>(false);

  // 用于跟踪MCPs是否启用的状态
  const [enableMCPs, setEnableMCPs] = useState<boolean>(false);

  const fetchMCPs = async () => {
    try {
      setLoading(true);
      // TODO: Update API endpoint when available
      // const response = await axios.get('/api/mcps');
      // const mcpsData = response.data.data || [];
      const mcpsData: MCP[] = [
          { name: "Example MCP 1" },
          { name: "Example MCP 2" }
      ]; // Placeholder data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      setMcps(mcpsData);
      if (mcpsData.length > 0) {
        setSelectedMCP(mcpsData[0].name);
      } else {
        setSelectedMCP(undefined);
      }
    } catch (err) {
      console.error('Failed to fetch MCPs', err);
      setMcps([]); // Clear data on error
      setSelectedMCP(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMCPs();
    // TODO: Update EventBus event when available
    // const unsubscribe = EventBus.subscribe(EVENTS.MCPS.UPDATED, fetchMCPs);
    // return () => unsubscribe();
  }, []);

  useEffect(() => {
    // TODO: Update logic based on actual MCP configuration needs
    if (selectedMCP) {
      const selected = mcps.find(m => m.name === selectedMCP);
      if (selected) {
        console.log("Selected MCP:", selected);
        // Example: Post MCP config if needed
        // axios.post('/api/conf', {
        //   mcp_name: selected.name,
        //   mcp_url: selected.base_url,
        //   mcp_key: selected.api_key
        // })
      }
    }
  }, [selectedMCP, mcps]);

  const handleRefresh = () => {
    fetchMCPs();
  };

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between mb-1">
        <Tooltip title="Select a Multi-Agent Collaboration Pattern provider">
          <div
            className="flex items-center cursor-pointer hover:text-green-400" // Changed color
            onClick={() => {
              const newValue = !showMCPSelector;
              setShowMCPSelector(newValue);
              setEnableMCPs(newValue);
              // TODO: Update EventBus event when available
              // EventBus.publish(EVENTS.MCPS.ENABLED_CHANGED, newValue);
            }}
          >
            <SettingOutlined // Changed icon
              className={`mr-1 ${showMCPSelector ? 'text-green-400' : 'text-gray-400'}`}
              style={{ fontSize: '12px' }}
            />
            <span className={`text-xxs ${showMCPSelector ? 'text-green-400' : 'text-gray-400'}`}>
              MCPs Provider
            </span>
          </div>
        </Tooltip>
        {showMCPSelector && (
          <Tooltip title="Refresh MCP providers">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              className="text-gray-400 hover:text-green-400 p-0 flex items-center justify-center h-5 w-5" // Changed hover color
              disabled={loading}
            />
          </Tooltip>
        )}
      </div>

      {showMCPSelector && (
        <>
        <div className="relative">
          <Select
            className="w-full custom-mcps-select" // Changed class name
            size="small"
            loading={loading}
            placeholder="Select MCP"
            value={selectedMCP}
            onChange={(value) => setSelectedMCP(value)}
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
        {/* Optional: Add a search/config button if needed */}
        {/* <Button
          type="text"
          icon={<FileSearchOutlined />} // Example icon
          className="absolute right-0 top-0 text-gray-400 hover:text-green-400 h-full px-2 flex items-center"
          onClick={() => console.log("MCP Search/Config clicked")}
        /> */}
      </div>
      </>
      )}
    </div>
  );
};

export default MCPsSelector;