import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, message, Space, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';

const { Option } = Select;
const { TabPane } = Tabs;

interface EnvVar {
  id: number;
  key: string;
  value: string;
}

interface ServerItem {
  name: string;
  description: string;
  mcp_type: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

const ManuallyAddMCPServer: React.FC = () => {
  const [form] = Form.useForm();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [nextEnvId, setNextEnvId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [builtInServers, setBuiltInServers] = useState<ServerItem[]>([]);
  const [fetchingServers, setFetchingServers] = useState(false);
  const [activeTab, setActiveTab] = useState('builtin');

  // Fetch available MCP servers
  useEffect(() => {
    const fetchServers = async () => {
      try {
        setFetchingServers(true);
        const response = await fetch('/api/mcp/list');
        if (!response.ok) {
          throw new Error(getMessage('fetchServerError') || 'Failed to fetch MCP servers');
        }

        const data = await response.json();
        if (data.raw_result && data.raw_result.builtin_servers) {
          setBuiltInServers(data.raw_result.builtin_servers);
        }
      } catch (error) {
        console.error('Error fetching MCP servers:', error);
        message.error(getMessage('fetchServerError') || 'Failed to fetch MCP servers');
      } finally {
        setFetchingServers(false);
      }
    };

    fetchServers();
  }, []);

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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

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
        throw new Error(data.detail || data.message || getMessage('addToMarketplaceFailed') || 'Adding server to marketplace failed');
      }

      message.success(data.message || getMessage('marketplaceAddSuccess', { name: values.name }));
      form.resetFields();
      setEnvVars([]);
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

  const handleBuiltInServerSelect = (serverName: string) => {
    const selectedServer = builtInServers.find(server => server.name === serverName);
    if (!selectedServer) return;

    // Transform env object to array of EnvVar objects
    const newEnvVars: EnvVar[] = [];
    let newNextEnvId = 1;

    if (selectedServer.env) {
      Object.entries(selectedServer.env).forEach(([key, value]) => {
        newEnvVars.push({ id: newNextEnvId, key, value });
        newNextEnvId++;
      });
    }

    // Update form fields with selected server's values
    form.setFieldsValue({
      name: selectedServer.name,
      description: selectedServer.description,
      type: selectedServer.mcp_type,
      command: selectedServer.command || '',
      args: selectedServer.args || [],
      url: selectedServer.url || '',
    });

    // Update environment variables
    setEnvVars(newEnvVars);
    setNextEnvId(newNextEnvId);
  };

  const renderForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      className="dark-form p-4"
    >
      <Form.Item
        name="name"
        label={getMessage('mcpServerName')}
        rules={[{ required: true, message: getMessage('nameRequired') }]}
      >
        <Input className="dark-input" placeholder={getMessage('mcpServerNamePlaceholder')} />
      </Form.Item>

      <Form.Item
        name="description"
        label={getMessage('mcpServerDescription')}
      >
        <Input className="dark-input" placeholder={getMessage('mcpServerDescriptionPlaceholder')} />
      </Form.Item>

      <Form.Item
        name="type"
        label={getMessage('mcpServerType')}
        initialValue="command"
      >
        <Select
          className="dark-select"
          placeholder={getMessage('mcpServerTypePlaceholder')}
          onChange={(value) => {
            if (value === 'sse') {
              message.info(getMessage('mcpSseNotSupported') || 'SSE type is not currently supported.');
            }
          }}
        >
          <Option value="command">{getMessage('mcpTypeCommand')}</Option>
          <Option value="sse">{getMessage('mcpTypeSse')}</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="command"
        label={getMessage('mcpServerCommand')}
        // Required only if type is 'command' or not specified
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (getFieldValue('type') === 'sse' || value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error(getMessage('commandRequired')));
            },
          }),
        ]}
      >
        <Input className="dark-input" placeholder={getMessage('mcpServerCommandPlaceholder')} />
      </Form.Item>

      <Form.Item
        name="args"
        label={getMessage('mcpServerArgs')}
      >
        <Select
          mode="tags"
          className="dark-select compiler-select compiler-tag-select" // Reuse compiler styles
          dropdownClassName="dark-select-dropdown"
          placeholder={getMessage('mcpServerArgsPlaceholder')}
          tokenSeparators={[' ', '\n', '\t']} // Allow space, newline, tab as separators
        />
      </Form.Item>

      <Form.Item label={getMessage('mcpServerEnv')}>
        {envVars.map((env, index) => (
          <div key={env.id} className="env-var-item">
            <Input
              className="dark-input"
              placeholder={getMessage('mcpServerKey')}
              value={env.key}
              onChange={(e) => handleEnvChange(env.id, 'key', e.target.value)}
            />
            <Input
              className="dark-input"
              placeholder={getMessage('mcpServerValue')}
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
          {getMessage('mcpServerAddEnv')}
        </Button>
      </Form.Item>

      <Form.Item
        name="url"
        label={getMessage('mcpServerUrl')}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (getFieldValue('type') !== 'sse' || value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error(getMessage('urlRequired')));
            },
          }),
        ]}
      >
        <Input className="dark-input" placeholder={getMessage('mcpServerUrlPlaceholder')} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} className="dark-button">
          {getMessage('addToMarketplace')}
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div className="manually-add-mcp-container">
      <style>
        {`
          .env-var-item {
            display: flex;
            margin-bottom: 8px;
            gap: 8px;
          }
          .env-var-item .ant-input {
            flex: 1;
          }
        `}
      </style>
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        className="settings-tabs dark-tabs"
      >
        <TabPane
          tab={<span className="text-gray-300">{getMessage('builtInMcpServer')}</span>}
          key="builtin"
        >
          <div className="p-4">
            <Form.Item
              label={getMessage('selectBuiltInServer')}
              className="mb-6"
            >
              <Select
                className="dark-select w-full"
                placeholder={getMessage('selectBuiltInServerPlaceholder')}
                loading={fetchingServers}
                onChange={handleBuiltInServerSelect}
              >
                {builtInServers.map(server => (
                  <Option key={server.name} value={server.name}>
                    {server.name} - {server.description}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            {renderForm()}
          </div>
        </TabPane>
        <TabPane
          tab={<span className="text-gray-300">{getMessage('externalMcpServer')}</span>}
          key="external"
        >
          {renderForm()}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ManuallyAddMCPServer;