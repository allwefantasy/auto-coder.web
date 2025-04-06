import React, { useEffect, useState } from 'react';
import { Table, Tag, Spin, message } from 'antd';
import '../../styles/custom_antd.css';
import '../../styles/MemorySystem.css';
import { getMessage } from '../Sidebar/lang';

interface TaskInfo {
  task_id: string;
  status: string;
  start_time?: string;
  completion_time?: string;
  file_name?: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  processed_dirs?: string[];
  error?: string;
}

const statusColorMap: Record<string, string> = {
  completed: 'green',
  running: 'blue',
  queued: 'orange',
  failed: 'red',
  unknown: 'gray',
};

const MemorySystem: React.FC = () => {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/active-context/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching memory system tasks:', error);
      message.error(getMessage('memorySystemLoadError') || 'Failed to load memory system tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const columns = [
    {
      title: getMessage('taskId') || 'Task ID',
      dataIndex: 'task_id',
      key: 'task_id',
      ellipsis: true,
    },
    {
      title: getMessage('status') || 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status] || 'gray'}>{status}</Tag>
      ),
    },
    {
      title: getMessage('file') || 'File',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true,
    },
    {
      title: getMessage('startTime') || 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
    },
    {
      title: getMessage('completionTime') || 'Completion Time',
      dataIndex: 'completion_time',
      key: 'completion_time',
    },
    {
      title: getMessage('tokens') || 'Tokens',
      key: 'tokens',
      render: (_: any, record: TaskInfo) => (
        <div>
          <div>{getMessage('total') || 'Total'}: {record.total_tokens}</div>
          <div>{getMessage('input') || 'Input'}: {record.input_tokens}</div>
          <div>{getMessage('output') || 'Output'}: {record.output_tokens}</div>
        </div>
      ),
    },
    {
      title: getMessage('cost') || 'Cost ($)',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => cost.toFixed(6),
    },
    {
      title: getMessage('processedDirs') || 'Processed Dirs',
      dataIndex: 'processed_dirs',
      key: 'processed_dirs',
      render: (dirs?: string[]) =>
        dirs && dirs.length > 0 ? dirs.join(', ') : '-',
    },
    {
      title: getMessage('error') || 'Error',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
    },
  ];

  return (
    <div className="memory-system-container p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{getMessage('memorySystemTasks') || 'Memory System Tasks'}</h2>
        <button
          onClick={fetchTasks}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          {getMessage('refresh') || 'Refresh'}
        </button>
      </div>
      <Spin spinning={loading}>
        <Table
          dataSource={tasks}
          columns={columns}
          rowKey="task_id"
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
        />
      </Spin>
    </div>
  );
};

export default MemorySystem;
