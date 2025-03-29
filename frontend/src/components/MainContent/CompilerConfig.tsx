import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { getMessage } from '../Sidebar/lang';
import './ModelConfig.css';
import '../../styles/custom_antd.css';
import './CompilerConfig.css';

interface Compiler {
  name: string;
  type: string;
  working_dir: string;
  command: string;
  args: string[];
  extract_regex?: string;
}

const CompilerConfig: React.FC = () => {
  const [compilers, setCompilers] = useState<Compiler[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompiler, setEditingCompiler] = useState<Compiler | null>(null);
  const [form] = Form.useForm();

  // Fetch compilers
  const fetchCompilers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/compilers');
      if (!response.ok) {
        throw new Error('Failed to fetch compilers');
      }
      const data = await response.json();
      setCompilers(data.data || []);
    } catch (error) {
      console.error('Error fetching compilers:', error);
      message.error(getMessage('processingError'));
    } finally {
      setLoading(false);
    }
  };

  // Initialize compilers
  const initializeCompilers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/compilers/initialize', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to initialize compilers');
      }
      const data = await response.json();
      setCompilers(data.data || []);
      message.success(getMessage('settingsUpdateSuccess'));
    } catch (error) {
      console.error('Error initializing compilers:', error);
      message.error(getMessage('processingError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompilers();
  }, []);

  const showAddModal = () => {
    setEditingCompiler(null);
    form.resetFields();
    setModalVisible(true);
  };

  const showEditModal = (compiler: Compiler) => {
    setEditingCompiler(compiler);
    form.setFieldsValue({
      ...compiler,
      args: compiler.args,
      triggers: compiler.triggers || [], // Initialize triggers field
    });
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // No need to split string to array anymore
      const compilerData = {
        ...values,
        triggers: values.triggers || [], // Ensure triggers is always an array
      };
      
      let response;
      
      if (editingCompiler) {
        // Update existing compiler
        response = await fetch(`/api/compilers/${editingCompiler.name}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(compilerData),
        });
      } else {
        // Create new compiler
        response = await fetch('/api/compilers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(compilerData),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save compiler');
      }
      
      message.success(
        editingCompiler 
          ? getMessage('compilerUpdateSuccess') || 'Compiler updated successfully' 
          : getMessage('compilerCreateSuccess') || 'Compiler created successfully'
      );
      
      setModalVisible(false);
      fetchCompilers();
    } catch (error) {
      console.error('Error saving compiler:', error);
      message.error(error instanceof Error ? error.message : getMessage('processingError'));
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const response = await fetch(`/api/compilers/${name}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete compiler');
      }
      
      message.success(getMessage('compilerDeleteSuccess') || 'Compiler deleted successfully');
      fetchCompilers();
    } catch (error) {
      console.error('Error deleting compiler:', error);
      message.error(error instanceof Error ? error.message : getMessage('processingError'));
    }
  };

  const columns = [
    {
      title: getMessage('compilerName') || 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: getMessage('compilerType') || 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: getMessage('workingDirectory') || 'Working Directory',
      dataIndex: 'working_dir',
      key: 'working_dir',
      ellipsis: true,
    },
    {
      title: getMessage('compilerCommand') || 'Command',
      dataIndex: 'command',
      key: 'command',
    },
    {
      title: getMessage('actions') || 'Actions',
      key: 'actions',
      render: (_: any, record: Compiler) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
            className="text-gray-400 hover:text-white dark-button"
          />
          <Popconfirm
            title={getMessage('deleteConfirmation') || 'Are you sure you want to delete this compiler?'}
            onConfirm={() => handleDelete(record.name)}
            okText={getMessage('yes') || 'Yes'}
            cancelText={getMessage('no') || 'No'}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              className="text-gray-400 hover:text-red-500 dark-button"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="settings-title">{getMessage('compilerConfiguration') || 'Compiler Configuration'}</h3>
        <Space>
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={fetchCompilers}
            loading={loading}
            className="text-gray-400 hover:text-white dark-button"
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showAddModal}
            className="bg-blue-600 hover:bg-blue-700 dark-button"
          >
            {getMessage('addCompiler') || 'Add Compiler'}
          </Button>
          {compilers.length === 0 && (
            <Button 
              onClick={initializeCompilers}
              className="bg-green-600 hover:bg-green-700 text-white dark-button"
            >
              {getMessage('initializeDefault') || 'Initialize Default'}
            </Button>
          )}
        </Space>
      </div>
      
      <Table 
        dataSource={compilers} 
        columns={columns} 
        rowKey="name"
        loading={loading}
        pagination={false}
        className="compiler-table dark-table"
        locale={{ emptyText: getMessage('noCompilers') || 'No compilers configured' }}
      />
      
      <Modal
        title={editingCompiler ? (getMessage('editCompiler') || 'Edit Compiler') : (getMessage('addCompiler') || 'Add Compiler')}
        open={modalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        okText={getMessage('save') || 'Save'}
        cancelText={getMessage('cancel') || 'Cancel'}
        className="dark-modal"
      >
        <Form
          form={form}
          layout="vertical"
          name="compilerForm"
          className="dark-form"
        >
          <Form.Item
            name="name"
            label={getMessage('compilerName') || 'Name'}
            rules={[{ required: true, message: getMessage('nameRequired') || 'Please enter a name' }]}
          >
            <Input disabled={!!editingCompiler} className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label={getMessage('compilerType') || 'Type'}
            rules={[{ required: true, message: getMessage('typeRequired') || 'Please enter a build tool type' }]}
          >
            <Input 
              className="dark-input" 
              placeholder={getMessage('enterBuildTool') || 'Enter build tool (e.g. vite, maven)'}
            />
          </Form.Item>
          
          <Form.Item
            name="working_dir"
            label={getMessage('workingDirectory') || 'Working Directory'}
            rules={[{ required: true, message: getMessage('workingDirRequired') || 'Please enter a working directory' }]}
          >
            <Input className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="command"
            label={getMessage('compilerCommand') || 'Command'}
            rules={[{ required: true, message: getMessage('compilerCommandRequired') || 'Please enter a command' }]}
          >
            <Input className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="args"
            label={getMessage('arguments') || 'Arguments'}
          >
            <Select
              mode="tags"
              className="dark-select compiler-select compiler-tag-select"
              dropdownClassName="dark-select-dropdown"
              placeholder={getMessage('enterArguments') || 'Enter arguments'}
              tokenSeparators={[' ']}
            />
          </Form.Item>
          
          <Form.Item
            name="extract_regex"
            label={getMessage('extractRegex') || 'Error Extraction Regex'}
            tooltip={getMessage('extractRegexTooltip') || 'Regular expression to extract error information from compiler output'}
          >
            <Input className="dark-input" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompilerConfig;
