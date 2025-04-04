import React, { useState, useEffect, useCallback } from 'react';
import { List, Button, message, Spin, Empty, Modal, Form, Input, Select, Space } from 'antd';
import { DownloadOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';
import './MCPMarketplace.css'; // Assuming you might add styles later

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

// Interface for Environment Variables in the Edit Form
interface EnvVar {
  id: number;
  key: string;
  value: string;
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
  const [loading, setLoading] = useState(true); // Start loading initially
  const [installing, setInstalling] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerInfo | null>(null);
  const [editForm] = Form.useForm();
  const [editEnvVars, setEditEnvVars] = useState<EnvVar[]>([]);
  const [nextEditEnvId, setNextEditEnvId] = useState(1);
  const [updating, setUpdating] = useState(false);


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

  // --- Edit Modal Functions ---

  const showEditModal = (server: McpServerInfo) => {
    setEditingServer(server);
    // Convert env object to array for the form
    const initialEnvVars = server.env
      ? Object.entries(server.env).map(([key, value], index) => ({ id: index + 1, key, value }))
      : [];
    setEditEnvVars(initialEnvVars);
    setNextEditEnvId(initialEnvVars.length + 1);
    editForm.setFieldsValue({
      name: server.name, // Usually name is not editable, but keep it for reference or API key
      description: server.description || '',
      mcp_type: server.mcp_type || 'command',
      command: server.command || '',
      args: server.args || [],
      url: server.url || '',
      // Env vars are handled separately via state
    });
    setIsEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingServer(null);
    editForm.resetFields();
    setEditEnvVars([]); // Clear env vars on cancel
  };

  const addEditEnvVar = () => {
    setEditEnvVars([...editEnvVars, { id: nextEditEnvId, key: '', value: '' }]);
    setNextEditEnvId(nextEditEnvId + 1);
  };

  const removeEditEnvVar = (id: number) => {
    setEditEnvVars(editEnvVars.filter(env => env.id !== id));
  };

  const handleEditEnvChange = (id: number, field: 'key' | 'value', value: string) => {
    setEditEnvVars(editEnvVars.map(env => env.id === id ? { ...env, [field]: value } : env));
  };

  const buildUpdateServerConfigObject = (values: any): any => {
      const validEnvVars = editEnvVars.filter(env => env.key);
      const envObject: Record<string, string> = {};

      validEnvVars.forEach(env => {
          envObject[env.key] = env.value;
      });

      // Ensure required fields based on type are present, even if empty string initially
      return {
          name: editingServer?.name, // Crucial: Use the original name as the identifier
          description: values.description || "",
          mcp_type: values.mcp_type || "command",
          command: values.mcp_type === 'command' ? (values.command || "") : "", // Command only relevant for 'command' type
          args: values.args || [],
          env: Object.keys(envObject).length > 0 ? envObject : null,
          url: values.mcp_type === 'sse' ? (values.url || "") : "" // URL only relevant for 'sse' type
      };
  };


  const handleUpdate = async () => {
    if (!editingServer) return;

    try {
      const values = await editForm.validateFields();

      // Manual validation for env keys
      for (const env of editEnvVars) {
        if (!env.key) {
          message.error(getMessage('envKeyRequired') || 'Environment variable key is required');
          return;
        }
      }

      setUpdating(true);
      const updatedServerConfig = buildUpdateServerConfigObject(values);


      const response = await fetch('/api/mcp/update', { // Changed endpoint to /update
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedServerConfig), // Send the updated config
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Updating server failed');
      }

      message.success(data.message || getMessage('marketplaceUpdateSuccess', { name: editingServer.name }));
      setIsEditModalVisible(false);
      setEditingServer(null);
      editForm.resetFields();
      setEditEnvVars([]);
      fetchServers(); // Refresh the list after update
    } catch (error) {
      console.error('Error updating server:', error);
       if (error instanceof Error && error.message.includes('Failed to validate fields')) {
        // Validation errors are already shown by Antd form
      } else {
         message.error(
            getMessage('marketplaceUpdateError', { error: error instanceof Error ? error.message : String(error) })
         );
       }
    } finally {
      setUpdating(false);
    }
  };


  // --- Render Logic ---

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
                  disabled={!!installing || updating}
                  className="dark-button" // Assuming dark theme consistency
                  title={getMessage('edit') || 'Edit'} // Tooltip
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
              disabled={!!installing || updating} // Disable while installing or updating
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

      {/* Edit Modal */}
      <Modal
        title={`${getMessage('edit') || 'Edit'} MCP Server: ${editingServer?.name}`}
        visible={isEditModalVisible}
        onCancel={handleEditCancel}
        footer={[
          <Button key="back" onClick={handleEditCancel} className="dark-button">
            {getMessage('cancel') || 'Cancel'}
          </Button>,
          <Button key="submit" type="primary" loading={updating} onClick={handleUpdate} className="dark-button">
            {getMessage('update') || 'Update'}
          </Button>,
        ]}
        width={600} // Adjust width as needed
        destroyOnClose // Reset form state when modal closes
      >
         <Form
            form={editForm}
            layout="vertical"
            className="dark-form" // Reuse dark theme styles
            // Don't use onFinish here, we trigger validation manually in handleUpdate
         >
            {/* Name might be read-only or hidden if not editable */}
            {/* <Form.Item name="name" label="Name (Read-only)">
                <Input className="dark-input" readOnly />
            </Form.Item> */}

            <Form.Item
                name="description"
                label={getMessage('mcpServerDescription') || 'Description'}
            >
                <Input className="dark-input" placeholder="e.g., My updated custom MCP server" />
            </Form.Item>

            {/* Type might also be read-only depending on requirements */}
            <Form.Item
                name="mcp_type"
                label={getMessage('mcpServerType') || 'Type'}
                // initialValue is set via setFieldsValue
            >
                <Select
                    className="dark-select"
                    placeholder="Select server type"
                    onChange={(value) => {
                        if (value === 'sse') {
                            message.info(getMessage('mcpSseNotSupported') || 'SSE type is not currently supported.');
                        }
                        // Trigger re-validation of command/url potentially
                         editForm.validateFields(['command', 'url']);
                    }}
                    // Consider disabling if type shouldn't be changed after creation
                    // disabled={true}
                >
                    <Option value="command">Command</Option>
                    <Option value="sse">SSE (Server-Sent Events)</Option>
                </Select>
            </Form.Item>

            {/* Conditional Command Field */}
            <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.mcp_type !== currentValues.mcp_type}
            >
                {({ getFieldValue }) =>
                    getFieldValue('mcp_type') === 'command' ? (
                        <Form.Item
                            name="command"
                            label={getMessage('mcpServerCommand') || 'Command'}
                            rules={[{ required: true, message: getMessage('commandRequired') || 'Please enter a command' }]}
                        >
                            <Input className="dark-input" placeholder="e.g., python, npm, /path/to/executable" />
                        </Form.Item>
                    ) : null
                }
            </Form.Item>

             {/* Conditional URL Field */}
             <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.mcp_type !== currentValues.mcp_type}
            >
                {({ getFieldValue }) =>
                    getFieldValue('mcp_type') === 'sse' ? (
                        <Form.Item
                            name="url"
                            label={getMessage('mcpServerUrl') || 'URL'}
                            rules={[{ required: true, message: getMessage('urlRequired') || 'Please enter a URL for SSE server' }]}
                        >
                            <Input className="dark-input" placeholder="e.g., http://localhost:8000/events" />
                        </Form.Item>
                    ) : null
                }
            </Form.Item>


            <Form.Item
                name="args"
                label={getMessage('mcpServerArgs') || 'Arguments'}
            >
                <Select
                    mode="tags"
                    className="dark-select compiler-select compiler-tag-select"
                    dropdownClassName="dark-select-dropdown"
                    placeholder="Enter arguments and press Enter/Space"
                    tokenSeparators={[' ', '\n', '\t']}
                />
            </Form.Item>

            {/* Environment Variables */}
            <Form.Item label={getMessage('mcpServerEnv') || 'Environment Variables'}>
                {editEnvVars.map((env) => (
                    <div key={env.id} className="env-var-item" style={{ display: 'flex', marginBottom: 8, gap: '8px' }}>
                        <Input
                            className="dark-input"
                            placeholder={getMessage('mcpServerKey') || 'Key'}
                            value={env.key}
                            onChange={(e) => handleEditEnvChange(env.id, 'key', e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <Input
                            className="dark-input"
                            placeholder={getMessage('mcpServerValue') || 'Value'}
                            value={env.value}
                            onChange={(e) => handleEditEnvChange(env.id, 'value', e.target.value)}
                             style={{ flex: 1 }}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeEditEnvVar(env.id)}
                            className="dark-button"
                        />
                    </div>
                ))}
                <Button
                    type="dashed"
                    onClick={addEditEnvVar}
                    icon={<PlusOutlined />}
                    className="dark-dashed-button w-full"
                >
                    {getMessage('mcpServerAddEnv') || 'Add Variable'}
                </Button>
            </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MCPMarketplace;
