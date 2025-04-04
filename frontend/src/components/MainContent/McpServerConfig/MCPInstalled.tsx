import React, { useState, useEffect, useCallback } from 'react';
import { List, Button, message, Spin, Modal, Popconfirm, Empty } from 'antd';
import { EyeOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getMessage } from '../../Sidebar/lang';

// --- Interface Definitions ---
// Corresponds to the backend's ServerInfo in ListRunningResult
interface RunningServerInfo {
  name: string;
  // Add other fields if the backend eventually returns more info per server
}

// Corresponds to the backend's ListRunningResult Pydantic model
interface ListRunningRawResult {
  servers: RunningServerInfo[];
  error: string | null;
}

// Corresponds to the overall API response structure for /api/mcp/list_running
interface ListRunningApiResponse {
  status: string;
  message: string;
  raw_result: ListRunningRawResult;
}


const MCPInstalled: React.FC = () => { // Renamed component function
  const [runningServers, setRunningServers] = useState<RunningServerInfo[]>([]); // State now holds RunningServerInfo objects
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null); // Keep track by name
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [serverInfo, setServerInfo] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  const fetchRunningServers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/list_running');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch running servers');
      }
      const data: ListRunningApiResponse = await response.json();

      // Check for errors within the raw_result
      if (data.raw_result?.error) {
          throw new Error(data.raw_result.error);
      }

      // Set the state with the servers array from raw_result
      setRunningServers(data.raw_result?.servers || []);

    } catch (error) {
      console.error('Error fetching running servers:', error);
      message.error(
        error instanceof Error
          ? error.message
          : getMessage('mcpListRunningError', { error: 'Unknown error' })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRunningServers();
  }, [fetchRunningServers]);

  const handleRemove = async (serverName: string) => {
    setRemoving(serverName);
    try {
      const response = await fetch('/api/mcp/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ server_name: serverName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Removal failed');
      }

      message.success(data.message || getMessage('mcpRemoveSuccess', { result: serverName }));
      fetchRunningServers(); // Refresh the list
    } catch (error) {
      console.error(`Error removing server ${serverName}:`, error);
      message.error(
        getMessage('mcpRemoveError', { error: error instanceof Error ? error.message : String(error) })
      );
    } finally {
      setRemoving(null);
    }
  };

  const handleViewInfo = async (serverName: string) => {
    setInfoLoading(true);
    setSelectedServer(serverName);
    setInfoModalVisible(true);
    try {
      // TODO: Determine how to get model/product_mode if needed by backend
      // Assuming the info endpoint doesn't require specific server name for now
      // as per the original code, but ideally it should take server_name.
      // If backend needs it, adjust the fetch URL: `/api/mcp/info?server_name=${serverName}`
      const response = await fetch(`/api/mcp/info?server_name=${encodeURIComponent(serverName)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch server info');
      }
      const data = await response.json();
      // Assuming the backend returns info directly or within an 'info' key
      setServerInfo(data.info || data.message || 'No details available.');
    } catch (error) {
      console.error(`Error fetching info for server ${serverName}:`, error);
      message.error(
        error instanceof Error
          ? error.message
          : getMessage('mcpServerInfoError', { error: 'Unknown error' })
      );
      setServerInfo('Error loading details.');
    } finally {
      setInfoLoading(false);
    }
  };


  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_name: null }), // Refresh all
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to refresh');
      }
      message.success(getMessage('mcpRefreshSuccess'));
      fetchRunningServers(); // Fetch updated list
    } catch (error) {
      console.error('Error refreshing connections:', error);
      message.error(
        getMessage('mcpRefreshError', { error: error instanceof Error ? error.message : String(error) })
      );
      setLoading(false); // Ensure loading state is reset on error
    }
    // setLoading(false) is handled in fetchRunningServers' finally block
  };

  const handleModalClose = () => {
    setInfoModalVisible(false);
    setServerInfo('');
    setSelectedServer(null);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading && !infoLoading && !removing} // Only show main loading if not doing other actions
          className="dark-button"
        >
          {getMessage('refreshFromHere') || 'Refresh'}
        </Button>
      </div>
      <Spin spinning={loading && !infoLoading && !removing}>
        {runningServers.length === 0 && !loading ? (
          <Empty description={getMessage('noServersInstalled') || 'No servers installed'} />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={runningServers} // dataSource is now RunningServerInfo[]
            renderItem={(server) => ( // Iterate over RunningServerInfo objects
              <List.Item
                className="mcp-server-list-item"
                actions={[
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewInfo(server.name)} // Use server.name
                    className="dark-button"
                  >
                    {getMessage('details') || 'Details'}
                  </Button>,
                  <Popconfirm
                    title={getMessage('confirmRemoveMcp') || 'Remove this server?'}
                    onConfirm={() => handleRemove(server.name)} // Use server.name
                    okText={getMessage('yes') || 'Yes'}
                    cancelText={getMessage('no') || 'No'}
                    okButtonProps={{ className: "dark-button" }}
                    cancelButtonProps={{ className: "dark-button" }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={removing === server.name} // Check against server.name
                      disabled={!!removing}
                      className="dark-button"
                    >
                      {getMessage('remove') || 'Remove'}
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={<span className="server-info">{server.name}</span>} // Display server.name
                />
              </List.Item>
            )}
          />
        )}
      </Spin>

      <Modal
        title={`${getMessage('mcpServerDetails') || 'Server Details'}: ${selectedServer || ''}`}
        open={infoModalVisible}
        onCancel={handleModalClose}
        footer={null} // No OK/Cancel buttons needed
        width={800}
        className="dark-modal mcp-server-container" // Apply container class for styling context
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Spin spinning={infoLoading}>
          {/* Apply markdown-body class for styling */}
          <div className="markdown-body">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>{serverInfo}</ReactMarkdown>
          </div>
        </Spin>
      </Modal>
    </div>
  );
};

export default MCPInstalled; // Updated export
