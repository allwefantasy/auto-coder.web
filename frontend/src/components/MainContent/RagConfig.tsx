import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { getMessage } from '../Sidebar/lang';
import './ModelConfig.css';
import '../../styles/custom_antd.css';
import './CompilerConfig.css';

interface Rag {
  name: string;
  base_url: string;
  api_key: string;
}

const RagConfig: React.FC = () => {
  const [rags, setRags] = useState<Rag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRag, setEditingRag] = useState<Rag | null>(null);
  const [form] = Form.useForm();

  // Fetch RAGs
  const fetchRags = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rags');
      if (!response.ok) {
        throw new Error('Failed to fetch RAGs');
      }
      const data = await response.json();
      setRags(data.data || []);
    } catch (error) {
      console.error('Error fetching RAGs:', error);
      message.error(getMessage('processingError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRags();
  }, []);

  const showAddModal = () => {
    setEditingRag(null);
    form.resetFields();
    setModalVisible(true);
  };

  const showEditModal = (rag: Rag) => {
    setEditingRag(rag);
    form.setFieldsValue({
      ...rag,
    });
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const ragData = {
        ...values,
      };
      
      let response;
      
      if (editingRag) {
        // Update existing RAG
        response = await fetch(`/api/rags/${editingRag.name}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ragData),
        });
      } else {
        // Create new RAG
        response = await fetch('/api/rags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ragData),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save RAG');
      }
      
      message.success(
        editingRag 
          ? getMessage('ragUpdateSuccess') || 'RAG updated successfully' 
          : getMessage('ragAddSuccess') || 'RAG added successfully'
      );
      
      setModalVisible(false);
      fetchRags();
      EventBus.publish(EVENTS.RAG.UPDATED);
      EventBus.publish(EVENTS.RAG.UPDATED);
    } catch (error) {
      console.error('Error saving RAG:', error);
      message.error(error instanceof Error ? error.message : getMessage('processingError'));
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const response = await fetch(`/api/rags/${name}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete RAG');
      }
      
      message.success(getMessage('ragDeleteSuccess') || 'RAG deleted successfully');
      fetchRags();
    } catch (error) {
      console.error('Error deleting RAG:', error);
      message.error(error instanceof Error ? error.message : getMessage('processingError'));
    }
  };

  const columns = [
    {
      title: getMessage('ragName') || 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: getMessage('ragBaseUrl') || 'RAG URL',
      dataIndex: 'base_url',
      key: 'base_url',
      ellipsis: true,
    },
    {
      title: getMessage('ragApiKey') || 'API Key',
      dataIndex: 'api_key',
      key: 'api_key',
      render: (text: string) => text ? '••••••••' : '',
    },
    {
      title: getMessage('actions') || 'Actions',
      key: 'actions',
      render: (_: any, record: Rag) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
            className="text-gray-400 hover:text-white dark-button"
          />
          <Popconfirm
            title={getMessage('confirmDeleteRag') || 'Are you sure you want to delete this RAG?'}
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
        <h3 className="settings-title">{getMessage('ragConfiguration') || 'RAG Configuration'}</h3>
        <Space>
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={fetchRags}
            loading={loading}
            className="text-gray-400 hover:text-white dark-button"
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showAddModal}
            className="bg-blue-600 hover:bg-blue-700 dark-button"
          >
            {getMessage('addRag') || 'Add RAG'}
          </Button>
        </Space>
      </div>
      
      <Table 
        dataSource={rags} 
        columns={columns} 
        rowKey="name"
        loading={loading}
        pagination={false}
        className="compiler-table dark-table"
        locale={{ emptyText: getMessage('noRags') || 'No RAGs configured' }}
      />
      
      <Modal
        title={editingRag ? (getMessage('editRag') || 'Edit RAG') : (getMessage('addRag') || 'Add RAG')}
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
          name="ragForm"
          className="dark-form"
        >
          <Form.Item
            name="name"
            label={getMessage('ragName') || 'Name'}
            rules={[{ required: true, message: getMessage('nameRequired') || 'Please enter a name' }]}
          >
            <Input disabled={!!editingRag} className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="base_url"
            label={getMessage('ragBaseUrl') || 'RAG URL'}
            rules={[{ required: true, message: 'Please enter RAG URL' }]}
          >
            <Input className="dark-input" />
          </Form.Item>
          
          <Form.Item
            name="api_key"
            label={getMessage('ragApiKey') || 'API Key'}
            rules={[{ required: true, message: 'Please enter API Key' }]}
          >
            <Input.Password className="dark-input" defaultValue="xxxx" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RagConfig;