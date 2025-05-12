import React, { useState, useEffect } from 'react';
import { Select, Input, Button, Spin, Empty, Alert, Form, Tooltip, message, Divider, Space, Typography } from 'antd';
import { FileOutlined, ReloadOutlined, SendOutlined, QuestionCircleOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';
import eventBus, { EVENTS } from '../../services/eventBus';
import { SendMessageEventData } from '../../services/event_bus_data';
import '../../styles/custom_antd.css';

const { Option } = Select;
const { Text } = Typography;

interface CommandFile {
  file_name: string;
  file_path: string;
}

interface CommandVariable {
  name: string;
  default_value?: string;
  description?: string;
}

interface CommandAnalysis {
  file_name: string;
  file_path: string;
  variables: CommandVariable[];
}

interface CommandPanelProps {  
  panelId?: string;
}

const CommandPanel: React.FC<CommandPanelProps> = ({ panelId = '' }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [commandFiles, setCommandFiles] = useState<CommandFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [fileVariables, setFileVariables] = useState<CommandVariable[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [renderLoading, setRenderLoading] = useState<boolean>(false);

  // Fetch command files on component mount
  useEffect(() => {
    fetchCommandFiles();
  }, []);

  // Fetch command files when selected file changes
  useEffect(() => {
    if (selectedFile) {
      fetchFileDetails(selectedFile);
    } else {
      setFileContent('');
      setFileVariables([]);
      setVariableValues({});
      setRenderedContent('');
    }
  }, [selectedFile]);
  
  // Effect to handle preview toggle
  useEffect(() => {
    if (showPreview && selectedFile && Object.keys(variableValues).length > 0) {
      renderTemplate(selectedFile, variableValues);
    }
  }, [showPreview]);

  // Fetch command files from API
  const fetchCommandFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/file_commands', {
        params: { recursive: true }
      });
      
      if (response.data.success) {
        setCommandFiles(response.data.documents || []);
      } else {
        setError(response.data.errors?.[0] || 'Failed to fetch command files');
        setCommandFiles([]);
      }
    } catch (error) {
      console.error('Error fetching command files:', error);
      setError('Failed to fetch command files. Please try again.');
      setCommandFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch file details (content and variables)
  const fetchFileDetails = async (fileName: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch file content
      const contentResponse = await axios.get(`/api/file_commands/${fileName}`);
      
      if (contentResponse.data.success) {
        setFileContent(contentResponse.data.content || '');
      } else {
        setError(contentResponse.data.errors?.[0] || 'Failed to fetch file content');
        setFileContent('');
      }

      // Fetch file variables
      const variablesResponse = await axios.get(`/api/file_commands/${fileName}/variables`);
      
      if (variablesResponse.data.success && variablesResponse.data.analysis) {
        const variables = variablesResponse.data.analysis.variables || [];
        setFileVariables(variables);
        
        // Initialize variable values with defaults
        const initialValues: Record<string, string> = {};
        variables.forEach((variable: CommandVariable) => {
          initialValues[variable.name] = variable.default_value || '';
        });
        setVariableValues(initialValues);
        
        // If preview is shown, render the template with initial values
        if (showPreview) {
          renderTemplate(fileName, initialValues);
        }
      } else {
        setError(variablesResponse.data.errors?.[0] || 'Failed to fetch file variables');
        setFileVariables([]);
        setVariableValues({});
        setRenderedContent('');
      }
    } catch (error) {
      console.error('Error fetching file details:', error);
      setError('Failed to fetch file details. Please try again.');
      setFileContent('');
      setFileVariables([]);
      setVariableValues({});
      setRenderedContent('');
    } finally {
      setLoading(false);
    }
  };

  // Handle variable value change
  const handleVariableChange = (name: string, value: string) => {
    const newValues = {
      ...variableValues,
      [name]: value
    };
    setVariableValues(newValues);
    
    // Render template with new values if preview is shown
    if (showPreview && selectedFile) {
      renderTemplate(selectedFile, newValues);
    }
  };
  
  // Render template with variables
  const renderTemplate = async (fileName: string, variables: Record<string, string>) => {
    if (!fileName) return;
    
    setRenderLoading(true);
    try {
      const response = await axios.post('/api/file_commands/render', {
        file_name: fileName,
        variables: variables
      });
      
      if (response.data.success) {
        setRenderedContent(response.data.rendered_content || '');
      } else {
        setError(response.data.errors?.[0] || 'Failed to render template');
        setRenderedContent('');
      }
    } catch (error) {
      console.error('Error rendering template:', error);
      setError('Failed to render template. Please try again.');
      setRenderedContent('');
    } finally {
      setRenderLoading(false);
    }
  };

  // Handle command execution
  const handleExecuteCommand = async () => {
    if (!selectedFile) {
      message.error('Please select a command file');
      return;
    }

    // Check if all required variables have values
    const missingVariables = fileVariables
      .filter(variable => !variableValues[variable.name])
      .map(variable => variable.name);

    if (missingVariables.length > 0) {
      message.error(`Please provide values for: ${missingVariables.join(', ')}`);
      return;
    }
    
    setLoading(true);
    try {
      // Get the rendered template content
      const response = await axios.post('/api/file_commands/render', {
        file_name: selectedFile,
        variables: variableValues
      });
      
      if (response.data.success && response.data.rendered_content) {
        // Format a message with the command details and rendered content
        const commandMessage = response.data.rendered_content;
        
        // Send the message using eventBus
        eventBus.publish(EVENTS.CHAT.SEND_MESSAGE, new SendMessageEventData(commandMessage, panelId));                        
        message.success('Command executed successfully');
      } else {
        setError(response.data.errors?.[0] || 'Failed to render template');
        message.error('Failed to execute command');
      }
    } catch (error) {
      console.error('Error executing command:', error);
      setError('Failed to execute command. Please try again.');
      message.error('Failed to execute command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ color: 'white' }}>
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          className="mb-1"
          onClose={() => setError(null)}
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--dark-error)', color: 'white' }}
        />
      )}

      <div className="flex items-center space-x-1 mb-1">
        <Select
          placeholder="Select command file"
          style={{ width: '100%', color: 'white' }}
          value={selectedFile || undefined}
          onChange={setSelectedFile}
          loading={loading}
          disabled={loading}
          showSearch
          optionFilterProp="children"
          className="text-xs dark-select custom-select"
          dropdownClassName="dark-select-dropdown custom-select-dropdown"
        >
          {commandFiles.map(file => (
            <Option key={file.file_name} value={file.file_name} style={{ color: 'white' }}>
              <FileOutlined className="mr-1" /> {file.file_name}
            </Option>
          ))}
        </Select>
        <Tooltip title="Refresh files">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchCommandFiles}
            disabled={loading}
            size="small"
            className="dark-button"
            style={{ color: 'white' }}
          />
        </Tooltip>
        {selectedFile && (
          <Tooltip title={showPreview ? "Hide preview" : "Show preview"}>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setShowPreview(!showPreview)}
              size="small"
              className="dark-button"
              style={{ color: showPreview ? 'var(--dark-primary)' : 'white' }}
            />
          </Tooltip>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-2">
          <Spin tip="Loading..." />
        </div>
      ) : selectedFile ? (
        <div className="flex flex-col flex-grow overflow-auto">
          {showPreview && (
            <div className="mb-1">
              <div className="flex justify-between items-center">
                <Text style={{ color: 'var(--dark-text-tertiary)', fontSize: '11px' }}>Rendered Preview:</Text>
                {renderLoading && <Spin size="small" />}
              </div>
              <div className="p-1 rounded text-xs overflow-auto max-h-20" style={{ backgroundColor: 'var(--dark-bg-tertiary)', color: 'white', border: '1px solid var(--dark-border)' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {renderedContent || 'Waiting for input...'}
                </pre>
              </div>
            </div>
          )}
          
          {fileVariables.length > 0 && (
            <div className="flex-grow overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {fileVariables.map(variable => (
                  <div key={variable.name} className="mb-1">
                    <div className="flex items-center mb-0.5">
                      <Text style={{ color: 'white', fontSize: '11px', fontWeight: 500 }}>{variable.name}</Text>
                      {variable.description && (
                        <Tooltip title={variable.description}>
                          <QuestionCircleOutlined className="ml-1" style={{ color: 'var(--dark-text-tertiary)', fontSize: '10px' }} />
                        </Tooltip>
                      )}
                    </div>
                    <Input
                      value={variableValues[variable.name] || ''}
                      onChange={e => handleVariableChange(variable.name, e.target.value)}
                      placeholder={variable.default_value || `Enter value`}
                      size="small"
                      className="dark-input"
                      style={{ color: 'white' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-1">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleExecuteCommand}
              disabled={loading}
              block
              className="dark-button"
              style={{ color: 'white' }}
            >
              Execute Command
            </Button>
          </div>
        </div>
      ) : (
        <Empty 
          description={<span style={{ color: 'white' }}>Select a command file</span>} 
          className="flex-grow py-4" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      )}
    </div>
  );
};

export default CommandPanel;
