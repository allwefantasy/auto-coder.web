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
      args: compiler.args || [], // Ensure args is an array
    });
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Ensure args is an array, even if empty
      const compilerData = {
        ...values,
        args: values.args || [],
      };
      
      let response;
      let url = '/api/compilers';
      let method = 'POST';
      
      if (editingCompiler) {
        url = `/api/compilers/${editingCompiler.name}`;
        method = 'PUT';
      } 

      response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compilerData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save compiler');
      }
      
      message.success(
        editingCompiler 
          ? getMessage('compilerUpdateSuccess') 
          : getMessage('compilerCreateSuccess')
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
      
      message.success(getMessage('compilerDeleteSuccess'));
      fetchCompilers();
    } catch (error) {
      console.error('Error deleting compiler:', error);
      message.error(error instanceof Error ? error.message : getMessage('processingError'));
    }
  };

  const columns = [
    {
      title: getMessage('compilerName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: getMessage('compilerType'),
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: getMessage('workingDirectory'),
      dataIndex: 'working_dir',
      key: 'working_dir',
      ellipsis: true,
    },
    {
      title: getMessage('compilerCommand'),
      dataIndex: 'command',
      key: 'command',
    },
    {
      title: getMessage('actions'),
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
            title={getMessage('deleteConfirmation')}
            onConfirm={() => handleDelete(record.name)}
            okText={getMessage('yes')}
            cancelText={getMessage('no')}
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
        <h3 className="settings-title">{getMessage('compilerConfiguration')}</h3>
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
            {getMessage('addCompiler')}
          </Button>
          {compilers.length === 0 && (
            <Button 
              onClick={initializeCompilers}
              className="bg-green-600 hover:bg-green-700 text-white dark-button"
            >
              {getMessage('initializeDefault')}
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
        locale={{ emptyText: getMessage('noCompilers') }}
      />
      
      <Modal
        title={editingCompiler ? getMessage('editCompiler') : getMessage('addCompiler')}
        open={modalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        okText={getMessage('save')}
        cancelText={getMessage('cancel')}
        className="dark-modal"
        destroyOnClose // Ensure form fields are reset when modal is closed
      >
        <Form
          form={form}
          layout="vertical"
          name="compilerForm"
          className="dark-form"
          initialValues={{ args: [] }} // Default args to empty array
        >
          <Form.Item
            name="name"
            label={getMessage('compilerName')}
            rules={[{ required: true, message: getMessage('nameRequired') }]}
          >
            <Input disabled={!!editingCompiler} className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label={getMessage('compilerType')}
            rules={[{ required: true, message: getMessage('typeRequired') }]}
          >
            <Input 
              className="dark-input" 
              placeholder={getMessage('enterBuildTool')}
            />
          </Form.Item>
          
          <Form.Item
            name="working_dir"
            label={getMessage('workingDirectory')}
            rules={[{ required: true, message: getMessage('workingDirRequired') }]}
          >
            <Input className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="command"
            label={getMessage('compilerCommand')}
            rules={[{ required: true, message: getMessage('compilerCommandRequired') }]}
          >
            <Input className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="args"
            label={getMessage('arguments')}
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              className="dark-select compiler-select compiler-tag-select"
              dropdownClassName="dark-select-dropdown"
              placeholder={getMessage('enterArguments')}
              tokenSeparators={[' ']}
              options={[]} // Provide empty options array for tag mode
            />
          </Form.Item>
          
          <Form.Item
            name="extract_regex"
            label={getMessage('extractRegex')}
            tooltip={getMessage('extractRegexTooltip')}
          >
            <Input className="dark-input" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompilerConfig;
