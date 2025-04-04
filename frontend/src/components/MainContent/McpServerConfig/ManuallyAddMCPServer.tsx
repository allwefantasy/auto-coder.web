import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, message, Space, Tabs, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';
import './ManuallyAddMCPServer.css';

const { Option } = Select;
const { TabPane } = Tabs;

interface EnvVar {
  id: number;
  key: string;
  value: string;
}

interface McpServerInfo {
  name: string;
  description?: string;
  mcp_type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  displayType?: string;
}

const ManuallyAddMCPServer: React.FC = () => {
  const [builtinForm] = Form.useForm();
  const [externalForm] = Form.useForm();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [nextEnvId, setNextEnvId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [builtinServers, setBuiltinServers] = useState<McpServerInfo[]>([]);
  const [fetchingServers, setFetchingServers] = useState(false);
  const [selectedServer, setSelectedServer] = useState<McpServerInfo | null>(null);
  const [activeTab, setActiveTab] = useState('builtin');

  // Fetch built-in servers when component mounts
  useEffect(() => {
    fetchBuiltinServers();
  }, []);

  const fetchBuiltinServers = async () => {
    setFetchingServers(true);
    try {
      const response = await fetch('/api/mcp/list');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch server list');
      }

      if (data.raw_result?.builtin_servers) {
        setBuiltinServers(data.raw_result.builtin_servers.map((server: any) => ({
          ...server,
          displayType: 'Built-in'
        })));
      }
    } catch (error) {
      console.error('Error fetching built-in servers:', error);
      message.error(
        getMessage('mcpListBuiltinError', { error: error instanceof Error ? error.message : String(error) })
      );
    } finally {
      setFetchingServers(false);
    }
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { id: nextEnvId, key: '', value: '' }]);
    setNextEnvId(nextEnvId + 1);
  };

  const removeEnvVar = (id: number) => {
    setEnvVars(envVars.filter(env => env.id !== id));
  };

  const handleEnvChange = (id: number, field: 'key' | 'value', value: string) => {
    setEnvVars(envVars.map(env => env.id === id ? { ...env, [field]: value } : env));
  };

  const handleBuiltinServerSelect = (serverName: string) => {
    const server = builtinServers.find(s => s.name === serverName) || null;
    setSelectedServer(server);
    
    if (server) {
      // Convert server.env object to envVars array format
      const newEnvVars: EnvVar[] = [];
      let envId = 1;
      
      if (server.env) {
        Object.entries(server.env).forEach(([key, value]) => {
          newEnvVars.push({ id: envId++, key, value });
        });
      }
      
      setEnvVars(newEnvVars);
      setNextEnvId(envId);
      
      // Fill the form with server data
      builtinForm.setFieldsValue({
        name: server.name,
        description: server.description || '',
        type: server.mcp_type || 'command',
        command: server.command || '',
        args: server.args || [],
        url: server.url || ''
      });
    } else {
      // Reset form if no server selected
      builtinForm.resetFields();
      setEnvVars([]);
      setNextEnvId(1);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // Reset environment variables when switching tabs
    setEnvVars([]);
    setNextEnvId(1);
    
    if (key === 'builtin') {
      externalForm.resetFields();
    } else {
      builtinForm.resetFields();
      setSelectedServer(null);
    }
  };

  const buildServerConfigObject = (values: any): any => {
    const validEnvVars = envVars.filter(env => env.key);
    const envObject: Record<string, string> = {};
    
    validEnvVars.forEach(env => {
      envObject[env.key] = env.value;
    });
    
    return {
      name: values.name,
      description: values.description || "",
      mcp_type: values.type || "command",
      command: values.command || "",
      args: values.args || [],
      env: Object.keys(envObject).length > 0 ? envObject : null,
      url: values.url || ""
    };
  };

  const handleSubmit = async (formInstance: any) => {
    try {
      const values = await formInstance.validateFields();

      // Validate environment variables manually
      for (const env of envVars) {
        if (!env.key) {
          message.error(getMessage('envKeyRequired') || 'Environment variable key is required');
          return;
        }
        // Allow empty values, but require key
      }

      setLoading(true);
      const serverConfig = buildServerConfigObject(values);

      const response = await fetch('/api/mcp/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverConfig),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Adding server to marketplace failed');
      }

      message.success(data.message || getMessage('marketplaceAddSuccess', { name: values.name }));
      formInstance.resetFields();
      setEnvVars([]);
      setSelectedServer(null);
      // Optionally refresh installed list or trigger event
    } catch (error) {
      console.error('Error adding server to marketplace:', error);
      if (error instanceof Error && error.message.includes('Failed to validate fields')) {
        // Validation errors are already shown by Antd form
      } else {
         message.error(
            getMessage('marketplaceAddError', { error: error instanceof Error ? error.message : String(error) })
         );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderServerForm = (formInstance: any) => {

    return (
      <Form
        form={formInstance}
        layout="vertical"
        onFinish={() => handleSubmit(formInstance)}
        className="dark-form p-4"
      >
        <Form.Item
          name="name"
          label={getMessage('mcpServerName') || 'Name'}
          rules={[{ required: true, message: getMessage('nameRequired') || 'Please enter a name' }]}
        >
          <Input className="dark-input" placeholder="e.g., my-custom-server" />
        </Form.Item>

        <Form.Item
          name="description"
          label={getMessage('mcpServerDescription') || 'Description'}
        >
          <Input className="dark-input" placeholder="e.g., My custom MCP server" />
        </Form.Item>

        <Form.Item
          name="type"
          label={getMessage('mcpServerType') || 'Type'}
          initialValue="command"
        >
          <Select
            className="dark-select"
            placeholder="Select server type"
            onChange={(value) => {
              if (value === 'sse') {
                message.info(getMessage('mcpSseNotSupported') || 'SSE type is not currently supported.');
              }
            }}
          >
            <Option value="command">Command</Option>
            <Option value="sse">SSE (Server-Sent Events)</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="command"
          label={getMessage('mcpServerCommand') || 'Command'}
          // Required only if type is 'command' or not specified
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (getFieldValue('type') === 'sse' || value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(getMessage('commandRequired') || 'Please enter a command'));
              },
            }),
          ]}
        >
          <Input className="dark-input" placeholder="e.g., python, npm, npx, /path/to/executable" />
        </Form.Item>

        <Form.Item
          name="args"
          label={getMessage('mcpServerArgs') || 'Arguments'}
        >
          <Select
            mode="tags"
            className="dark-select compiler-select compiler-tag-select" // Reuse compiler styles
            dropdownClassName="dark-select-dropdown"
            placeholder="Enter arguments and press Enter/Space"
            tokenSeparators={[' ', '\n', '\t']} // Allow space, newline, tab as separators
          />
        </Form.Item>

        <Form.Item label={getMessage('mcpServerEnv') || 'Environment Variables'}>
          {envVars.map((env, index) => (
            <div key={env.id} className="env-var-item">
              <Input
                className="dark-input"
                placeholder={getMessage('mcpServerKey') || 'Key'}
                value={env.key}
                onChange={(e) => handleEnvChange(env.id, 'key', e.target.value)}
              />
              <Input
                className="dark-input"
                placeholder={getMessage('mcpServerValue') || 'Value'}
                value={env.value}
                onChange={(e) => handleEnvChange(env.id, 'value', e.target.value)}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeEnvVar(env.id)}
                className="dark-button"
              />
            </div>
          ))}
          <Button
            type="dashed"
            onClick={addEnvVar}
            icon={<PlusOutlined />}
            className="dark-dashed-button w-full"
          >
            {getMessage('mcpServerAddEnv') || 'Add Variable'}
          </Button>
        </Form.Item>

        <Form.Item
          name="url"
          label={getMessage('mcpServerUrl') || 'URL'}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (getFieldValue('type') !== 'sse' || value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(getMessage('urlRequired') || 'Please enter a URL for SSE server'));
              },
            }),
          ]}
        >
          <Input className="dark-input" placeholder="e.g., http://localhost:8000/events" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} className="dark-button">
            {getMessage('addToMarketplace') || 'Add to Marketplace'}
          </Button>
        </Form.Item>
      </Form>
    );
  };

  return (
    <div className="mcp-server-add-container">
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        type="card"
        className="dark-tabs"
      >
        <TabPane 
          tab={getMessage('builtinMcpServer') || 'Built-in MCP Server'} 
          key="builtin"
        >
          <Spin spinning={fetchingServers}>
            <div className="mb-4">
              <Form.Item
                label={getMessage('selectBuiltinServer') || 'Select Built-in Server'}
                className="mb-0"
              >
                <Select
                  className="dark-select"
                  placeholder={getMessage('selectServer') || 'Select a server'}
                  onChange={handleBuiltinServerSelect}
                  value={selectedServer?.name}
                  allowClear
                >
                  {builtinServers.map(server => (
                    <Option key={server.name} value={server.name}>
                      {server.name} {server.description ? `- ${server.description}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            {renderServerForm(builtinForm)}
          </Spin>
        </TabPane>
        <TabPane 
          tab={getMessage('externalMcpServer') || 'External MCP Server'} 
          key="external"
        >
          {renderServerForm(externalForm)}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ManuallyAddMCPServer;