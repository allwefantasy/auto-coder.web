import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Select, Switch, Modal, Table, message, Popconfirm, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { getMessage } from '../Sidebar/lang';
import '../../styles/custom_antd.css';
import './ModelConfig.css';

// 定义模型数据结构
interface Model {
  name: string;
  description: string;
  model_name: string;
  model_type: string;
  base_url: string;
  api_key_path?: string;
  is_reasoning: boolean;
  input_price: number;
  output_price: number;
  average_speed: number;
}

// 定义供应商配置
interface ProviderConfig {
  name: string;
  base_url: string;
  models: {
    id: string;
    name: string;
    input_price: number;
    output_price: number;
    is_reasoning: boolean;
  }[];
}

const ModelManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // 获取所有模型
  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      message.error(getMessage('modelOperationFailed', { message: String(error) }));
    } finally {
      setLoading(false);
    }
  };

  // 获取所有供应商
  const fetchProviders = async () => {
    setProvidersLoading(true);
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
      setProvidersLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchModels();
    fetchProviders();
  }, []);

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      const modelData: Model = {
        ...values,
        input_price: Number(values.input_price),
        output_price: Number(values.output_price),
        average_speed: Number(values.average_speed || 0),
        model_type: 'saas/openai', // 默认类型
      };

      const url = editingModel 
        ? `/api/models/${editingModel.name}` 
        : '/api/models';
      
      const method = editingModel ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      if (!response.ok) {
        throw new Error('Failed to save model');
      }

      message.success(
        editingModel 
          ? getMessage('modelUpdateSuccess') 
          : getMessage('modelAddSuccess')
      );
      
      setModalVisible(false);
      fetchModels();
    } catch (error) {
      console.error('Error saving model:', error);
      message.error(getMessage('modelOperationFailed', { message: String(error) }));
    }
  };

  // 处理删除模型
  const handleDelete = async (modelName: string) => {
    try {
      const response = await fetch(`/api/models/${modelName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      message.success(getMessage('modelDeleteSuccess'));
      fetchModels();
    } catch (error) {
      console.error('Error deleting model:', error);
      message.error(getMessage('modelOperationFailed', { message: String(error) }));
    }
  };

  // 处理编辑模型
  const handleEdit = (model: Model) => {
    setEditingModel(model);
    form.setFieldsValue({
      ...model,
      provider: getProviderByBaseUrl(model.base_url),
    });
    setSelectedProvider(getProviderByBaseUrl(model.base_url));
    setModalVisible(true);
  };

  // 处理添加新模型
  const handleAdd = () => {
    setEditingModel(null);
    form.resetFields();
    setSelectedProvider('');
    setModalVisible(true);
  };

  // 根据base_url获取供应商
  const getProviderByBaseUrl = (baseUrl: string): string => {
    const provider = providers.find(p => p.base_url === baseUrl);
    return provider ? provider.name : '';
  };

  // 处理供应商变更
  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    const provider = providers.find(p => p.name === value);
    if (provider) {
      form.setFieldValue('base_url', provider.base_url);
      form.setFieldValue('provider', value); 
    }
  };

  // 刷新供应商列表
  const refreshProviders = () => {
    fetchProviders();
    message.success(getMessage('modelOperationFailed', { message: 'Providers refreshed' }));
  };

  // 处理模型变更
  const handleModelChange = (value: string) => {
    const provider = providers.find(p => p.name === selectedProvider);
    if (provider) {
      const modelConfig = provider.models.find(m => m.id === value);
      if (modelConfig) {
        form.setFieldsValue({
          model_name: value,
          input_price: modelConfig.input_price,
          output_price: modelConfig.output_price,
          is_reasoning: modelConfig.is_reasoning,
        });
      }
    }
  };

  // 表格列定义
  const columns = [
    {
      title: getMessage('modelName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: getMessage('modelDescription'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: getMessage('modelProvider'),
      dataIndex: 'base_url',
      key: 'provider',
      render: (baseUrl: string) => {
        const provider = getProviderByBaseUrl(baseUrl);
        return getMessage(provider) || provider;
      },
    },
    {
      title: getMessage('modelType'),
      dataIndex: 'model_name',
      key: 'model_name',
    },
    {
      title: getMessage('modelInputPrice'),
      dataIndex: 'input_price',
      key: 'input_price',
    },
    {
      title: getMessage('modelOutputPrice'),
      dataIndex: 'output_price',
      key: 'output_price',
    },
    {
      title: getMessage('modelIsReasoning'),
      dataIndex: 'is_reasoning',
      key: 'is_reasoning',
      render: (isReasoning: boolean) => (isReasoning ? '✓' : '✗'),
    },
    {
      title: getMessage('more'),
      key: 'action',
      render: (_: any, record: Model) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title={getMessage('editModel')}
            className="dark-button"
          />
          <Popconfirm
            title={getMessage('confirmDeleteModel')}
            onConfirm={() => handleDelete(record.name)}
            okText={getMessage('confirm')}
            cancelText={getMessage('cancel')}
            overlayClassName="dark-popconfirm"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title={getMessage('deleteModel')}
              className="dark-button"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="model-management-container p-2 overflow-y-auto h-full bg-gray-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white">{getMessage('modelManagement')}</h2>
        <div className="flex gap-2">
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              fetchModels();
              fetchProviders();
            }}
            className="dark-button"
          >
            {providersLoading || loading ? <Spin size="small" /> : null}
            {getMessage('more')}
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            className="dark-button"
          >
            {getMessage('addModel')}
          </Button>
        </div>
      </div>

      <Table
        dataSource={models}
        columns={columns}
        rowKey="name"
        loading={loading}
        pagination={{ pageSize: 10 }}
        className="model-table dark-table"
        locale={{
          emptyText: <div className="text-gray-400 py-8">No data</div>
        }}
      />

      <Modal
        title={<span className="text-white">{editingModel ? getMessage('editModel') : getMessage('addModel')}</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
        className="dark-modal"
        closeIcon={<span className="text-white">×</span>}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            is_reasoning: false,
            average_speed: 0,
          }}
          className="dark-form"
        >
          <Form.Item
            name="name"
            label={<span className="text-white">{getMessage('modelName')}</span>}
            rules={[{ required: true, message: 'Please input model name' }]}
          >
            <Input className="dark-input" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="text-white">{getMessage('modelDescription')}</span>}
          >
            <Input.TextArea rows={2} className="dark-input" />
          </Form.Item>

          <Form.Item
            name="provider"
            label={<span className="text-white">{getMessage('modelProvider')}</span>}
            rules={[{ required: true, message: 'Please select provider' }]}
          >
            <div className="flex items-center gap-2">
              <Select 
                onChange={handleProviderChange} 
                className="dark-select flex-1"
                loading={providersLoading}
              >
                {providers.map(provider => (
                  <Select.Option key={provider.name} value={provider.name}>
                    {getMessage(provider.name) || provider.name}
                  </Select.Option>
                ))}
              </Select>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={refreshProviders}
                className="dark-button"
                title={getMessage('more')}
              />
            </div>
          </Form.Item>

          <Form.Item
            name="model_name"
            label={<span className="text-white">{getMessage('modelType')}</span>}
            rules={[{ required: true, message: 'Please select model type' }]}
          >
            <Select 
              onChange={handleModelChange}
              disabled={!selectedProvider}
              className="dark-select"
            >
              {selectedProvider && 
                providers
                  .find(p => p.name === selectedProvider)?.models
                  .map(model => (
                    <Select.Option key={model.id} value={model.id}>
                      {model.name}
                    </Select.Option>
                  ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="base_url"
            label={<span className="text-white">{getMessage('modelBaseUrl')}</span>}
            rules={[{ required: true, message: 'Please input base URL' }]}
          >
            <Input disabled className="dark-input" />
          </Form.Item>

          <Form.Item
            name="api_key"
            label={<span className="text-white">{getMessage('modelApiKey')}</span>}
            rules={[{ required: true, message: 'Please input API key' }]}
          >
            <Input placeholder="Path to API key file (optional)" className="dark-input" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="input_price"
              label={<span className="text-white">{getMessage('modelInputPrice')}</span>}
              rules={[{ required: true, message: 'Please input price' }]}
            >
              <Input type="number" step="0.1" min="0" className="dark-input" />
            </Form.Item>

            <Form.Item
              name="output_price"
              label={<span className="text-white">{getMessage('modelOutputPrice')}</span>}
              rules={[{ required: true, message: 'Please input price' }]}
            >
              <Input type="number" step="0.1" min="0" className="dark-input" />
            </Form.Item>
          </div>

          <Form.Item
            name="average_speed"
            label={<span className="text-white">{getMessage('modelAverageSpeed')}</span>}
          >
            <Input type="number" step="0.1" min="0" className="dark-input" />
          </Form.Item>

          <Form.Item
            name="is_reasoning"
            label={<span className="text-white">{getMessage('modelIsReasoning')}</span>}
            valuePropName="checked"
          >
            <Switch className="dark-switch" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalVisible(false)} className="dark-button">
              {getMessage('cancelModelEdit')}
            </Button>
            <Button type="primary" htmlType="submit" className="dark-button">
              {getMessage('saveModel')}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelManagement;