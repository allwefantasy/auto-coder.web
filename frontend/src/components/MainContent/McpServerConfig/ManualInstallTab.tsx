import React, { useState } from 'react';
import { Form, Input, Select, Button, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';

const { Option } = Select;

interface EnvVar {
  id: number;
  key: string;
  value: string;
}

const ManualInstallTab: React.FC = () => {
  const [form] = Form.useForm();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [nextEnvId, setNextEnvId] = useState(1);
  const [loading, setLoading] = useState(false);

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

  const buildServerConfigString = (values: any): string => {
    let configString = `--name "${values.name}"`;
    if (values.command) {
      configString += ` --command "${values.command}"`;
    }
    if (values.args && values.args.length > 0) {
      configString += ` --args ${values.args.map((arg: string) => `"${arg}"`).join(' ')}`;
    }
    const validEnvVars = envVars.filter(env => env.key && env.value);
    if (validEnvVars.length > 0) {
      configString += ` --env ${validEnvVars.map(env => `"${env.key}=${env.value}"`).join(' ')}`;
    }
    // Note: SSE type currently doesn't map directly to command-line args in backend parser
    // If SSE needs specific handling, backend needs adjustment or use JSON config string.
    // For now, 'type' field is informational for the user.
    return configString;
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
        // if (!env.value) {
        //   message.error(getMessage('envValueRequired') || 'Environment variable value is required');
        //   return;
        // }
      }

      setLoading(true);
      const serverConfig = buildServerConfigString(values);

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

      message.success(data.message || getMessage('mcpInstallSuccess', { result: values.name }));
      form.resetFields();
      setEnvVars([]);
      // Optionally refresh installed list or trigger event
    } catch (error) {
      console.error('Error installing server manually:', error);
      if (error instanceof Error && error.message.includes('Failed to validate fields')) {
        // Validation errors are already shown by Antd form
      } else {
         message.error(
            getMessage('mcpInstallError', { error: error instanceof Error ? error.message : String(error) })
         );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
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
        name="type"
        label={getMessage('mcpServerType') || 'Type'}
        // Not strictly required for command-line string, but good for user info
        // rules={[{ required: true, message: 'Please select a type' }]}
      >
        <Select className="dark-select" placeholder="Select server type (command is default)">
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

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} className="dark-button">
          {getMessage('install') || 'Install Server'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ManualInstallTab;