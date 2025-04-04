import React, { useState, useEffect } from 'react';
import { List, Button, message, Spin, Empty } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';

// Matches the structure from the Python backend: MarketplaceMCPServerItem
interface MarketplaceMCPServerItem {
  name: string;
  description?: string;
  mcp_type?: string; // Optional as it has a default in Python
  command?: string;  // Optional as it has a default in Python
  args?: string[];   // Optional as it has a default in Python
  env?: Record<string, string>; // Optional as it has a default in Python
  url?: string;      // Optional as it has a default in Python
}

// Interface for the state, adding the display type
interface McpServerInfo extends MarketplaceMCPServerItem {
  displayType: 'Built-in' | 'External' | 'Marketplace'; // Renamed 'type' to avoid conflict and clarify purpose
}

// Interface for the API response structure (matching McpResponse with ListResult)
interface McpListApiResponse {
  result: string; // Assuming 'result' holds a status message like 'success'
  error?: string;
  raw_result?: { // raw_result itself is optional in McpResponse
    builtin_servers?: MarketplaceMCPServerItem[]; // lists are optional in ListResult
    external_servers?: MarketplaceMCPServerItem[];
    marketplace_items?: MarketplaceMCPServerItem[]; // Added marketplace_items
    error?: string;
  };
}

const MCPMarketplace: React.FC = () => {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  // Removed parseServerString function as it's no longer needed

  const fetchServers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/list');
      const data = await response.json(); // Parse JSON regardless of status first

      if (!response.ok) {
        // Use the 'detail' field from the parsed JSON error response
        throw new Error(data.detail || 'Failed to fetch server list');
      }

      // Assuming data matches McpListApiResponse on success
      const apiData = data as McpListApiResponse;

      // Check if raw_result exists and handle potential errors within it
      if (apiData.raw_result?.error) {
        throw new Error(apiData.raw_result.error);
      }
      if (!apiData.raw_result) {
         // Handle case where raw_result might be missing, though ListResult should be there on success
         console.warn('API response missing raw_result field.');
         setServers([]); // Set to empty or handle as appropriate
         return; // Exit early if no data
      }


      const builtInServers: McpServerInfo[] = (apiData.raw_result.builtin_servers || []).map(s => ({
        ...s, // Spread all fields from BackendServerInfo
        displayType: 'Built-in', // Use the new displayType field
      }));

      const externalServers: McpServerInfo[] = (apiData.raw_result.external_servers || []).map(s => ({
        ...s, // Spread all fields from BackendServerInfo
        displayType: 'External', // Use the new displayType field
      }));
      
      const marketplaceItems: McpServerInfo[] = (apiData.raw_result.marketplace_items || []).map(s => ({
        ...s,
        displayType: 'Marketplace', // Or handle differently
      }));

      setServers([...builtInServers, ...externalServers, ...marketplaceItems]); // Combine lists

    } catch (error) {
      console.error('Error fetching marketplace servers:', error);
      // Error message now comes directly from the caught error (which includes the detail field)
      message.error(
        error instanceof Error
          ? error.message
          : getMessage('mcpListBuiltinError', { error: 'Unknown error' })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleInstall = async (serverName: string) => {
    setInstalling(serverName);
    try {
      const serverConfig = serverName; // Basic install command using name
      const response = await fetch('/api/mcp/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ server_config: serverConfig }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Installation failed');
      }

      message.success(data.message || getMessage('mcpInstallSuccess', { result: serverName }));
      // Optionally refresh the installed list or trigger an event
    } catch (error) {
      console.error(`Error installing server ${serverName}:`, error);
      message.error(
        getMessage('mcpInstallError', { error: error instanceof Error ? error.message : String(error) })
      );
    } finally {
      setInstalling(null);
    }
  };

  return (
    <Spin spinning={loading}>
      {servers.length === 0 && !loading ? (
         <Empty description={getMessage('noServersAvailable') || 'No servers available'} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={servers}
          renderItem={(item) => (
            <List.Item
              className="mcp-server-list-item"
              actions={[
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleInstall(item.name)}
                  loading={installing === item.name}
                  disabled={!!installing} // Disable other install buttons while one is installing
                  className="dark-button"
                >
                  {getMessage('install') || 'Install'}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={<span className="server-info">{`${item.displayType}: ${item.name}`}</span>}
                description={<span className="server-description">{item.description || 'No description available'}</span>}
              />
              {/* Optionally display other fields like mcp_type, command etc. if needed */}
              {/* <div>Type: {item.mcp_type}</div> */}
            </List.Item>
          )}
        />
      )}
    </Spin>
  );
};

export default MCPMarketplace;
