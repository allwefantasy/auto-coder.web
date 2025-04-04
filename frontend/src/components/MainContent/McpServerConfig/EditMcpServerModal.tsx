import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { McpServerInfo, EnvVar } from './types'; // Assuming types are moved or defined here/imported
import { getMessage } from '../../Sidebar/lang'; // Adjust path if necessary
import '../../../styles/custom_antd.css'; // Import the custom styles

const { Option } = Select;

interface EditMcpServerModalProps {
  visible: boolean;
  server: McpServerInfo | null;
  onCancel: () => void;
  onUpdateSuccess: () => void; // Callback to refresh list in parent
  // getMessage: (key: string, defaultVal?: string, params?: Record<string, any>) => string; // Pass getMessage if needed within modal
}

const EditMcpServerModal: React.FC<EditMcpServerModalProps> = ({
  visible,
  server,
  onCancel,
  onUpdateSuccess,
  // getMessage // Destructure if passed
}) => {
  const [form] = Form.useForm();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [nextEnvId, setNextEnvId] = useState(1);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (server && visible) {
      // Convert env object to array for the form
      const initialEnvVars = server.env
        ? Object.entries(server.env).map(([key, value], index) => ({ id: index + 1, key, value }))
        : [];
      setEnvVars(initialEnvVars);
      setNextEnvId(initialEnvVars.length + 1);
      form.setFieldsValue({
        // name: server.name, // Name is usually read-only identifier
        description: server.description || '',
        mcp_type: server.mcp_type || 'command',
        command: server.command || '',
        args: server.args || [],
        url: server.url || '',
        // Env vars are handled separately via state
      });
    } else if (!visible) {
      form.resetFields();
      setEnvVars([]); // Clear env vars when modal is hidden or server is null
    }
  }, [server, visible, form]);

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

  const buildUpdateServerConfigObject = (values: any): any => {
      const validEnvVars = envVars.filter(env => env.key);
      const envObject: Record<string, string> = {};

      validEnvVars.forEach(env => {
          envObject[env.key] = env.value;
      });

      // Ensure required fields based on type are present, even if empty string initially
      return {
          name: server?.name, // Crucial: Use the original name as the identifier
          description: values.description || "",
          mcp_type: values.mcp_type || "command",
          command: values.mcp_type === 'command' ? (values.command || "") : undefined, // Command only relevant for 'command' type
          args: values.args || [],
          env: Object.keys(envObject).length > 0 ? envObject : undefined, // Use undefined if empty
          url: values.mcp_type === 'sse' ? (values.url || "") : undefined // URL only relevant for 'sse' type
      };
  };

  const handleUpdate = async () => {
    if (!server) return;

    try {
      const values = await form.validateFields();

      // Manual validation for env keys
      for (const env of envVars) {
        if (!env.key && env.value) { // Only error if key is missing but value exists
          message.error(getMessage('envKeyRequired') || 'Environment variable key is required if value is provided');
          return;
        }
      }

      setUpdating(true);
      const updatedServerConfig = buildUpdateServerConfigObject(values);

      const response = await fetch('/api/mcp/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedServerConfig),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Updating server failed');
      }

      message.success(data.message || getMessage('marketplaceUpdateSuccess', { name: server.name }));
      onUpdateSuccess(); // Call parent callback to refresh
      onCancel(); // Close modal
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


  return (
    <Modal
      title={`${getMessage('edit') || 'Edit'} MCP Server: ${server?.name}`}
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel} className="dark-button">
          {getMessage('cancel') || 'Cancel'}
        </Button>,
        <Button key="submit" type="primary" loading={updating} onClick={handleUpdate} className="dark-button">
          {getMessage('update') || 'Update'}
        </Button>,
      ]}
      width={600}
      destroyOnClose // Reset form state when modal closes (already handled by useEffect, but good practice)
      className="dark-modal" // Apply dark theme class
    >
      <Form
        form={form}
        layout="vertical"
        className="dark-form" // Apply dark theme class
      >
        {/* Name is read-only */}
        <Form.Item label="Name (Read-only)">
            <Input className="dark-input" readOnly value={server?.name} />
        </Form.Item>

        <Form.Item
            name="description"
            label={getMessage('mcpServerDescription') || 'Description'}
        >
            <Input className="dark-input" placeholder="e.g., My updated custom MCP server" />
        </Form.Item>

        <Form.Item
            name="mcp_type"
            label={getMessage('mcpServerType') || 'Type'}
        >
            <Select
                className="dark-select" // Apply dark theme class
                dropdownClassName="dark-select-dropdown" // Apply dark theme class
                placeholder="Select server type"
                onChange={(value) => {
                    if (value === 'sse') {
                        message.info(getMessage('mcpSseNotSupported') || 'SSE type is not currently supported.');
                    }
                    form.validateFields(['command', 'url']);
                }}
                // disabled={true} // Type might not be editable after creation
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
                className="dark-select compiler-select compiler-tag-select" // Apply dark theme class
                dropdownClassName="dark-select-dropdown" // Apply dark theme class
                placeholder="Enter arguments and press Enter/Space"
                tokenSeparators={[' ', '\n', '\t']}
            />
        </Form.Item>

        {/* Environment Variables */}
        <Form.Item label={getMessage('mcpServerEnv') || 'Environment Variables'}>
            {envVars.map((env) => (
                <div key={env.id} className="env-var-item" style={{ display: 'flex', marginBottom: 8, gap: '8px' }}>
                    <Input
                        className="dark-input" // Apply dark theme class
                        placeholder={getMessage('mcpServerKey') || 'Key'}
                        value={env.key}
                        onChange={(e) => handleEnvChange(env.id, 'key', e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <Input
                        className="dark-input" // Apply dark theme class
                        placeholder={getMessage('mcpServerValue') || 'Value'}
                        value={env.value}
                        onChange={(e) => handleEnvChange(env.id, 'value', e.target.value)}
                         style={{ flex: 1 }}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeEnvVar(env.id)}
                        className="dark-button" // Apply dark theme class
                    />
                </div>
            ))}
            <Button
                type="dashed"
                onClick={addEnvVar}
                icon={<PlusOutlined />}
                className="dark-dashed-button w-full" // Assuming this class exists or needs adding to custom_antd.css
            >
                {getMessage('mcpServerAddEnv') || 'Add Variable'}
            </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditMcpServerModal;

// Types are now imported from './types'
