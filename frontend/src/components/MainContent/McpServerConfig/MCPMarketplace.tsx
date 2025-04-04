import React, { useState, useEffect, useCallback } from 'react';
import { List, Button, message, Spin, Empty } from 'antd'; // Removed Modal, Form, Input, Select, Space, PlusOutlined, DeleteOutlined
// Option is no longer needed here
import { DownloadOutlined, EditOutlined } from '@ant-design/icons'; // Removed PlusOutlined, DeleteOutlined
import { getMessage } from '../../Sidebar/lang';
import EditMcpServerModal from './EditMcpServerModal'; // Import the new modal component
import { McpServerInfo, McpListApiResponse } from './types'; // Import types from shared file
import './MCPMarketplace.css';

const MCPMarketplace: React.FC = () => {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // State to control modal visibility
  const [editingServer, setEditingServer] = useState<McpServerInfo | null>(null); // State to hold the server being edited
  // Removed editForm, editEnvVars, nextEditEnvId, updating states - managed by EditMcpServerModal
  const fetchServers = useCallback(async () => { // Use useCallback
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


      const builtInServers: McpServerInfo[] = []

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
  }, []); // Added missing dependency array

  useEffect(() => {
    fetchServers();
  }, [fetchServers]); // Add fetchServers to dependency array

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

  // --- Modal Control Functions ---

  const showEditModal = (server: McpServerInfo) => {
    setEditingServer(server);
    setIsEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingServer(null); // Clear editing server on cancel
  };

  const handleUpdateSuccess = () => {
    setIsEditModalVisible(false);
    setEditingServer(null);
    fetchServers(); // Refresh the list after a successful update
  };

  // --- Render Logic ---

  // Removed old modal functions: addEditEnvVar, removeEditEnvVar, handleEditEnvChange, buildUpdateServerConfigObject, handleUpdate

  const renderActions = (item: McpServerInfo) => {
      const actions = [];
      // Allow editing for External and Marketplace types
      if (item.displayType === 'External' || item.displayType === 'Marketplace') {
          actions.push(
              <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => showEditModal(item)}
                  disabled={!!installing} // Only disable if installing
                  className="dark-button"
                  title={getMessage('edit') || 'Edit'}
              />
          );
      }
      // Always show Install button (or maybe disable for Built-in?)
      actions.push(
          <Button
              key="install"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleInstall(item.name)}
              loading={installing === item.name}
              disabled={!!installing} // Only disable if installing
              className="dark-button"
          >
              {getMessage('install') || 'Install'}
          </Button>
      );
      return actions;
  };


  return (
    <>
      <Spin spinning={loading}>
        {servers.length === 0 && !loading ? (
           <Empty description={getMessage('noServersAvailable') || 'No servers available'} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={servers.sort((a, b) => // Sort for consistent order
              `${a.displayType}-${a.name}`.localeCompare(`${b.displayType}-${b.name}`)
          )}
          renderItem={(item) => (
            <List.Item
              className="mcp-server-list-item"
              actions={renderActions(item)}
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

      {/* Render the new Edit Modal */}
      <EditMcpServerModal
        visible={isEditModalVisible}
        server={editingServer}
        onCancel={handleEditCancel}
        onUpdateSuccess={handleUpdateSuccess}
        // Pass getMessage if it was used inside the modal logic originally
        // getMessage={getMessage}
      />
    </>
  );
};

// Removed local type definitions (MarketplaceMCPServerItem, EnvVar, McpServerInfo, McpListApiResponse) - now imported from ./types

export default MCPMarketplace;
