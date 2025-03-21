import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Progress, Typography, Space, Divider, Spin, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import './TaskStatusView.css';

const { Title, Text } = Typography;

interface TaskStatusProps {
  todoId: string;
  onClose: () => void;
}

interface TaskStatus {
  index: number;
  title: string;
  status: string;
  event_file_id?: string;
}

interface TaskStatusResponse {
  tasks: TaskStatus[];
  next_task_index: number | null;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
    case 'executing':
      return <SyncOutlined spin style={{ color: '#3b82f6' }} />;
    default:
      return <ClockCircleOutlined style={{ color: '#faad14' }} />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'executing':
      return 'blue';
    default:
      return 'warning';
  }
};

const TaskStatusView: React.FC<TaskStatusProps> = ({ todoId, onClose }) => {
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // 计算任务完成百分比
  const calculateProgress = (tasks: TaskStatus[]) => {
    if (!tasks || tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // 获取任务状态
  const fetchTaskStatus = async () => {
    try {
      const response = await axios.get(`/api/todos/${todoId}/tasks/status`);
      setTaskStatus(response.data);
      setLoading(false);
      
      // 检查是否所有任务都已完成或有任务失败
      const allCompleted = response.data.tasks.every((task: TaskStatus) => task.status === 'completed');
      const anyFailed = response.data.tasks.some((task: TaskStatus) => task.status === 'failed');
      
      // 如果所有任务都已完成或有任务失败，停止轮询
      if (allCompleted || anyFailed) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err) {
      console.error('Error fetching task status:', err);
      setError('Failed to fetch task status');
      setLoading(false);
    }
  };

  // 组件挂载时开始轮询任务状态
  useEffect(() => {
    // 立即获取一次任务状态
    fetchTaskStatus();
    
    // 设置轮询间隔
    const interval = setInterval(fetchTaskStatus, 3000);
    setPollingInterval(interval);
    
    // 组件卸载时清除轮询
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [todoId]);

  if (loading) {
    return (
      <Card 
        className="task-status-card"
        headStyle={{ backgroundColor: '#2d2d2d', borderBottom: '1px solid #374151' }}
        bodyStyle={{ backgroundColor: '#2d2d2d' }}
      >
        <div className="task-status-loading">
          <Spin size="large" />
          <Text style={{ color: '#e5e7eb' }}>加载任务状态...</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        className="task-status-card"
        headStyle={{ backgroundColor: '#2d2d2d', borderBottom: '1px solid #374151' }}
        bodyStyle={{ backgroundColor: '#2d2d2d' }}
      >
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (!taskStatus || !taskStatus.tasks || taskStatus.tasks.length === 0) {
    return (
      <Card 
        className="task-status-card"
        headStyle={{ backgroundColor: '#2d2d2d', borderBottom: '1px solid #374151' }}
        bodyStyle={{ backgroundColor: '#2d2d2d' }}
      >
        <Alert
          message="No Tasks"
          description="No tasks found for this todo item."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  const progress = calculateProgress(taskStatus.tasks);

  return (
    <Card 
      className="task-status-card"
      title={
        <div className="task-status-header">
          <Title level={4} style={{ color: '#e5e7eb' }}>任务执行状态</Title>
          <Progress type="circle" percent={progress} width={60} strokeColor="#3b82f6" />
        </div>
      }
      headStyle={{ backgroundColor: '#2d2d2d', borderBottom: '1px solid #374151' }}
      bodyStyle={{ backgroundColor: '#2d2d2d' }}
    >
      <List
        itemLayout="horizontal"
        dataSource={taskStatus.tasks}
        renderItem={(task, index) => (
          <List.Item>
            <List.Item.Meta
              avatar={getStatusIcon(task.status)}
              title={
                <Space>
                  <Text strong style={{ color: '#e5e7eb' }}>{`Task ${index + 1}: ${task.title}`}</Text>
                  <Tag color={getStatusColor(task.status)}>
                    {task.status === 'completed' ? '已完成' : 
                     task.status === 'failed' ? '失败' : 
                     task.status === 'executing' ? '执行中' : '等待中'}
                  </Tag>
                </Space>
              }
              description={
                <Text style={{ color: '#9ca3af' }}>
                  {task.event_file_id ? `ID: ${task.event_file_id}` : ''}
                </Text>
              }
            />
          </List.Item>
        )}
      />
      <Divider style={{ borderColor: '#374151' }} />
      <div className="task-status-footer">
        <Text style={{ color: '#9ca3af' }}>
          {progress === 100 ? 
            '所有任务已完成' : 
            `${taskStatus.tasks.filter(t => t.status === 'completed').length} / ${taskStatus.tasks.length} 任务完成`}
        </Text>
      </div>
    </Card>
  );
};

export default TaskStatusView;
