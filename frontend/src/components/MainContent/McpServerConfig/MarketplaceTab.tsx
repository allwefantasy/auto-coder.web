import React, { useState, useEffect } from 'react';
import { List, Button, message, Spin, Empty } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';

interface McpServerInfo {
  type: 'Built-in' | 'External';
  name: string;
  description?: string;
  raw: string;
}

const MarketplaceTab: React.FC = () => {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  const parseServerString = (serverString: string): McpServerInfo | null => {
    const match = serverString.match(/^- (Built-in|External): (\S+)(?: \((.*?)\))?$/);
    if (match) {
      return {
        type: match[1] as 'Built-in' | 'External',
        name: match[2],
        description: match[3] || undefined,
        raw: serverString,
      };
    }
    // Handle potential variations or log unexpected formats
    console.warn("Could not parse server string:", serverString);
    return null; // Or return a default structure if preferred
  };

  const fetchServers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/list');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch server list');
      }
      const data = await response.json();
      const parsedServers = (data.servers || [])
        .map(parseServerString)
        .filter((s: McpServerInfo | null): s is McpServerInfo => s !== null); // Type guard
      setServers(parsedServers);
    } catch (error) {
      console.error('Error fetching marketplace servers:', error);
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
      const serverConfig = `--name ${serverName}`; // Basic install command using name
      const response = await fetch('/api/mcp/add', {
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
                title={<span className="server-info">{`${item.type}: ${item.name}`}</span>}
                description={<span className="server-description">{item.description || 'No description available'}</span>}
              />
            </List.Item>
          )}
        />
      )}
    </Spin>
  );
};

export default MarketplaceTab;