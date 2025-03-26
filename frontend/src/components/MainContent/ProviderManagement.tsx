import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Table, message, Popconfirm, Modal, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { getMessage } from '../Sidebar/lang';
import '../../styles/custom_antd.css';
import './ModelConfig.css';

// 定义模型数据结构
interface ModelInfo {
  id: string;
  name: string;
  input_price: number;
  output_price: number;
  is_reasoning: boolean;
}

// 定义供应商配置
interface ProviderConfig {
  name: string;
  base_url: string;
  models: ModelInfo[];
}

const ProviderManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);

  // 获取所有供应商
  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Error fetching providers:', error);
      message.error(getMessage('modelOperationFailed', { message: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchProviders();
  }, []);

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      const providerData: ProviderConfig = {
        name: values.name,
        base_url: values.base_url,
        models: values.models || [],
      };

      const url = editingProvider 
        ? `/api/providers/${editingProvider.name}` 
        : '/api/providers';
      
      const method = editingProvider ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(providerData),
      });

      if (!response.ok) {
        throw new Error('Failed to save provider');
      }

      message.success(
        editingProvider 
          ? getMessage('providerUpdateSuccess') 
          : getMessage('providerAddSuccess')
      );
      
      setModalVisible(false);
      fetchProviders();
    } catch (error) {
      console.error('Error saving provider:', error);
      message.error(getMessage('modelOperationFailed', { message: String(error) }));
    }
  };

  // 处理删除供应商
  const handleDelete = async (providerName: string) => {
    try {
      const response = await fetch(`/api/providers/${providerName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider');
      }

      message.success(getMessage('providerDeleteSuccess'));
      fetchProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
      message.error(getMessage('modelOperationFailed', { message: String(error) }));
    }
  };

  // 处理编辑供应商
  const handleEdit = (provider: ProviderConfig) => {
    setEditingProvider(provider);
    form.setFieldsValue({
      ...provider,
    });
    setModalVisible(true);
  };

  // 处理添加新供应商
  const handleAdd = () => {
    setEditingProvider(null);
    form.resetFields();
    form.setFieldsValue({
      models: [{ id: '', name: '', input_price: 0, output_price: 0, is_reasoning: false }]
    });
    setModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: getMessage('providerName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: getMessage('providerBaseUrl'),
      dataIndex: 'base_url',
      key: 'base_url',
      ellipsis: true,
    },
    {
      title: getMessage('providerModels'),
      dataIndex: 'models',
      key: 'models',
      render: (models: ModelInfo[]) => `${models.length} ${models.length === 1 ? 'model' : 'models'}`,
    },
    {
      title: getMessage('more'),
      key: 'action',
      render: (_: any, record: ProviderConfig) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title={getMessage('editProvider')}
            className="dark-button"
          />
          <Popconfirm
            title={getMessage('confirmDeleteProvider')}
            onConfirm={() => handleDelete(record.name)}
            okText={getMessage('confirm')}
            cancelText={getMessage('cancel')}
            overlayClassName="dark-popconfirm"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title={getMessage('deleteProvider')}
              className="dark-button"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="provider-management-container p-2 overflow-y-auto h-full bg-gray-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white">{getMessage('providerManagement')}</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
          className="dark-button"
        >
          {getMessage('addProvider')}
        </Button>
      </div>

      <Table
        dataSource={providers}
        columns={columns}
        rowKey="name"
        loading={loading}
        pagination={{ pageSize: 10 }}
        className="provider-table dark-table"
        locale={{
          emptyText: <div className="text-gray-400 py-8">No data</div>
        }}
      />

      <Modal
        title={<span className="text-white">{editingProvider ? getMessage('editProvider') : getMessage('addProvider')}</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        className="dark-modal"
        closeIcon={<span className="text-white">×</span>}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="dark-form"
        >
          <Form.Item
            name="name"
            label={<span className="text-white">{getMessage('providerName')}</span>}
            rules={[{ required: true, message: 'Please input provider name' }]}
          >
            <Input className="dark-input" />
          </Form.Item>

          <Form.Item
            name="base_url"
            label={<span className="text-white">{getMessage('providerBaseUrl')}</span>}
            rules={[{ required: true, message: 'Please input base URL' }]}
          >
            <Input className="dark-input" />
          </Form.Item>

          <div className="mb-4">
            <label className="text-white block mb-2">{getMessage('providerModels')}</label>
            <Form.List name="models">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="bg-gray-800 p-3 mb-3 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white">Model #{name + 1}</span>
                        <Button
                          type="text"
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          className="dark-button"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          {...restField}
                          name={[name, 'id']}
                          label={<span className="text-white">Model ID</span>}
                          rules={[{ required: true, message: 'Please input model ID' }]}
                        >
                          <Input className="dark-input" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label={<span className="text-white">Model Name</span>}
                          rules={[{ required: true, message: 'Please input model name' }]}
                        >
                          <Input className="dark-input" />
                        </Form.Item>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          {...restField}
                          name={[name, 'input_price']}
                          label={<span className="text-white">{getMessage('modelInputPrice')}</span>}
                          rules={[{ required: true, message: 'Please input price' }]}
                        >
                          <Input type="number" step="0.1" min="0" className="dark-input" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'output_price']}
                          label={<span className="text-white">{getMessage('modelOutputPrice')}</span>}
                          rules={[{ required: true, message: 'Please input price' }]}
                        >
                          <Input type="number" step="0.1" min="0" className="dark-input" />
                        </Form.Item>
                      </div>
                      <Form.Item
                        {...restField}
                        name={[name, 'is_reasoning']}
                        label={<span className="text-white">{getMessage('modelIsReasoning')}</span>}
                        valuePropName="checked"
                      >
                        <input type="checkbox" className="mr-2" />
                      </Form.Item>
                    </div>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add({ id: '', name: '', input_price: 0, output_price: 0, is_reasoning: false })}
                      icon={<PlusCircleOutlined />}
                      className="dark-button w-full"
                    >
                      Add Model
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalVisible(false)} className="dark-button">
              {getMessage('cancel')}
            </Button>
            <Button type="primary" htmlType="submit" className="dark-button">
              {getMessage('save')}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProviderManagement;