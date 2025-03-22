import React, { useState, useCallback, useEffect } from 'react';
import { JsonExtractor } from '../../services/JsonExtractor';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button, Input, Select, Tag, Modal, Badge, Tooltip, Alert, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, SyncOutlined, CodeOutlined, ExpandOutlined, CompressOutlined, DeleteOutlined } from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
import { getMessage } from '../Sidebar/lang';
import TodoEditModal from './TodoEditModal';
import AutoExecuteNotificationModal from './AutoExecuteNotificationModal';
import TaskSplitResultView from './TaskSplitResult/TaskSplitResultView';
import TaskStatusView from './TaskStatus/TaskStatusView';
import './TodoPanel.css';
import { useTaskSplitting } from '../../contexts/TaskSplittingContext';

type ColumnId = 'pending' | 'developing' | 'testing' | 'done';

interface Task {
  id?: string;
  title: string;
  description?: string;
  references?: string[];
  steps?: string[];
  acceptance_criteria?: string[];
  priority?: string;
  estimate?: string;
  status?: string;
}

interface TodoItem {
  id: string;
  title: string;
  status: ColumnId;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags: string[];
  owner?: string;
  dueDate?: string;  // Changed to string to match backend
  created_at: string;
  updated_at: string;
  description?: string;
  tasks?: Task[];
  analysis?: string;
  dependencies?: any[];
}

const priorityColors = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
  P3: 'gray'
};

const priorityOptions = [
  { value: 'P0', label: getMessage('priorityP0') },
  { value: 'P1', label: getMessage('priorityP1') },
  { value: 'P2', label: getMessage('priorityP2') },
  { value: 'P3', label: getMessage('priorityP3') },
];

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 添加去重标签的辅助函数
const deduplicateTags = (tags: string[] | undefined = []): string[] => {
  // 确保tags是数组
  const tagsArray = tags || [];
  // 使用filter和indexOf结合实现去重，避免使用Set
  return tagsArray.filter((tag, index, self) => 
    self.indexOf(tag) === index
  );
};

const TodoPanel: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTodo, setNewTodo] = useState<Partial<TodoItem>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [executeModalVisible, setExecuteModalVisible] = useState(false);
  const [executingTodo, setExecutingTodo] = useState<TodoItem | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmMode, setConfirmMode] = useState(true);
  const [showSplitResult, setShowSplitResult] = useState<string | null>(null);
  const [splitResultData, setSplitResultData] = useState<any>(null);
  const [showTaskStatus, setShowTaskStatus] = useState<string | null>(null);
  const [maximizedPanel, setMaximizedPanel] = useState<ColumnId | null>(null);
  
  // Use the TaskSplittingContext instead of local state
  const {
    splittingTodoId,
    setSplittingTodoId,
    lastSplitResult,
    setLastSplitResult,
    splitCompleted,
    setSplitCompleted,
    lastSplitTodoId,
    setLastSplitTodoId
  } = useTaskSplitting();

  // Load initial data
  useEffect(() => {
    fetchTodos();
    
    // 添加自定义事件监听器用于处理弹窗关闭
    const handleCloseModal = () => {
      setExecuteModalVisible(false);
    };

    document.addEventListener('closeExecuteModal', handleCloseModal);

    // 清理函数
    return () => {
      document.removeEventListener('closeExecuteModal', handleCloseModal);
    };
  }, []);
  
  // 检查任务拆解状态
  useEffect(() => {
    // 当拆解完成时，刷新任务列表并更新UI
    if (splitCompleted && lastSplitTodoId && lastSplitResult) {
      // 刷新任务列表
      fetchTodos();
      
      // 更新拆解结果显示
      setSplitResultData(lastSplitResult);
      setShowSplitResult(lastSplitTodoId);
      
      // 重置完成状态，但保留结果和任务ID以便于显示
      setSplitCompleted(false);
    }
  }, [splitCompleted, lastSplitTodoId, lastSplitResult, setSplitCompleted]);
  
  // 现在使用 Context 完全管理拆解状态，不再需要 window 对象

  const columns = [
    { id: 'pending', title: getMessage('statusPending') },
    { id: 'developing', title: getMessage('statusDeveloping') },
    { id: 'testing', title: getMessage('statusTesting') },
    { id: 'done', title: getMessage('statusDone') },
  ];

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    // Find the todo being dragged
    const draggedTodo = todos.find(todo => todo.id === result.draggableId);
    
    // 禁止将 testing 和 done 状态的任务拖到 pending 和 developing 状态中
    if (draggedTodo && 
        (source.droppableId === 'testing' || source.droppableId === 'done') && 
        (destination.droppableId === 'pending' || destination.droppableId === 'developing')) {
      setError('测试中或已完成的任务不能移动到待办或开发中状态');
      return;
    }

    // Check if task is moved from 'pending' to 'developing'
    const isPendingToDeveloping = 
      source.droppableId === 'pending' && 
      destination.droppableId === 'developing';
    
    // 如果是从 pending 拖到 developing，检查 tasks 字段是否为空
    if (isPendingToDeveloping && draggedTodo) {
      // 检查 tasks 字段是否为空
      if (!draggedTodo.tasks || draggedTodo.tasks.length === 0) {
        // 如果 tasks 为空，取消拖拽操作
        setError(getMessage('cannotExecuteEmptyTasks') || '无法执行空任务，请先拆解任务');
        return;
      }
    }

    // Optimistic update
    const originalTodos = [...todos];
    setTodos(prevTodos => {
      const newTodos = [...prevTodos];

      if (source.droppableId !== destination.droppableId) {
        // 跨列拖拽处理
        return newTodos.map(todo => {
          if (todo.id === result.draggableId) {
            // 更新被拖拽项的状态
            return { ...todo, status: destination.droppableId as ColumnId };
          }
          return todo;
        }).sort((a, b) => {
          // 保持原有排序，仅将被拖拽项插入到目标位置
          if (a.id === result.draggableId) return 0;
          if (b.id === result.draggableId) return 1;
          return 0;
        });
      }

      // 同列内拖拽处理
      const items = newTodos.filter(t => t.status === source.droppableId);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);

      return newTodos.map(t => 
        t.status === source.droppableId 
          ? items.find(i => i.id === t.id) || t 
          : t
      );
    });

    // Sync with backend
    try {
      await fetch('/api/todos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_status: source.droppableId,
          source_index: source.index,
          destination_status: destination.droppableId,
          destination_index: destination.index,
          todo_id: result.draggableId
        })
      });

      // 如果是从待评估拖到进行中，显示确认对话框
      if (isPendingToDeveloping && draggedTodo) {
        setExecutingTodo(draggedTodo);
        setConfirmMode(true);
        setExecuteModalVisible(true);
      }

    } catch (error) {
      console.error('Failed to reorder todos:', error);
      // Revert to original state on error
      setTodos(originalTodos);
      setError(getMessage('failedToSaveChanges'));
    }
  };

  // 在用户确认后开始执行任务
  const handleConfirmExecution = () => {
    if (executingTodo) {
      setConfirmMode(false);
      startTaskExecution(executingTodo);
    }
  };

  // 在用户取消时将任务移回待评估面板
  const handleCancelExecution = async () => {
    if (executingTodo) {
      // 先更新本地状态
      setTodos(prevTodos => {
        return prevTodos.map(todo => {
          if (todo.id === executingTodo.id) {
            return { ...todo, status: 'pending' as ColumnId };
          }
          return todo;
        });
      });
      
      // 同步到后端
      try {
        await fetch('/api/todos/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_status: 'developing',
            destination_status: 'pending',
            todo_id: executingTodo.id,
            // 索引信息 - 如果后端不需要精确的索引信息，可以给个默认值
            source_index: 0,
            destination_index: 0
          })
        });
      } catch (error) {
        console.error('Failed to move task back to pending:', error);
        setError(getMessage('failedToSaveChanges'));
      }
      
      // 关闭弹窗
      setExecuteModalVisible(false);
    }
  };

  // 任务执行函数
  const startTaskExecution = async (todo: TodoItem) => {
    setIsExecuting(true);
    
    try {
      // 调用新的API执行所有任务
      const response = await fetch(`/api/todos/${todo.id}/execute-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute tasks');
      }
      
      // 获取API响应
      const result = await response.json();
      
      console.log('Task execution started:', result);
      
      // 更新UI状态，显示任务正在执行
      setTodos(prev => prev.map(t => {
        if (t.id === todo.id) {
          // 更新状态为正在执行
          return {
            ...t, 
            status: 'developing',
            updated_at: new Date().toISOString()
          };
        }
        return t;
      }));
      
      // 清除任务拆分结果视图
      if (showSplitResult === todo.id) {
        setShowSplitResult(null);
      }
      
      // 显示任务状态视图
      setShowTaskStatus(todo.id);
      
      // 开始轮询任务状态
      startPollingTaskStatus(todo.id);
      
      // 刷新任务列表
      await fetchTodos();
      
    } catch (error) {
      console.error('Failed to execute tasks:', error);
      setError(getMessage('failedToExecuteTask'));
    } finally {
      setIsExecuting(false);
      // 无论结果如何，关闭执行对话框
      setExecuteModalVisible(false);
    }
  };
  
  // 轮询任务状态
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 开始轮询任务状态
  const startPollingTaskStatus = (todoId: string) => {
    // 清除现有的轮询器
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // 创建新的轮询器，每3秒查询一次
    const interval = setInterval(async () => {
      try {
        // 获取任务状态
        const response = await fetch(`/api/todos/${todoId}/tasks/status`);
        if (!response.ok) {
          throw new Error('Failed to fetch task status');
        }
        
        const statusData = await response.json();
        console.log('Task status:', statusData);
        
        // 更新UI上的任务状态
        updateTaskStatusUI(todoId, statusData);
        
        // 检查是否所有任务已完成
        const allCompleted = statusData.tasks.every((task: any) => task.status === 'completed');
        const anyFailed = statusData.tasks.some((task: any) => task.status === 'failed');
        
        if (allCompleted || anyFailed) {
          // 如果所有任务已完成或有任务失败，停止轮询
          clearInterval(interval);
          setPollingInterval(null);
          
          // 刷新任务列表
          await fetchTodos();
        }
        
      } catch (error) {
        console.error('Error polling task status:', error);
      }
    }, 3000);
    
    setPollingInterval(interval);
    
    // 清理函数
    return () => {
      clearInterval(interval);
      setPollingInterval(null);
    };
  };
  
  // 更新UI上的任务状态
  const updateTaskStatusUI = (todoId: string, statusData: any) => {
    setTodos(prev => prev.map(todo => {
      if (todo.id === todoId && todo.tasks) {
        // 更新每个任务的状态
        const updatedTasks = todo.tasks.map((task, index) => {
          if (index < statusData.tasks.length) {
            return {
              ...task,
              status: statusData.tasks[index].status
            };
          }
          return task;
        });
        
        // 检查是否所有任务已完成或有任务失败
        const allCompleted = statusData.tasks.every((task: any) => task.status === 'completed');
        const anyFailed = statusData.tasks.some((task: any) => task.status === 'failed');
        
        // 如果所有任务已完成或有任务失败，延迟关闭任务状态视图
        if (allCompleted || anyFailed) {
          // 延迟5秒后关闭任务状态视图，让用户有时间查看最终状态
          setTimeout(() => {
            if (showTaskStatus === todoId) {
              setShowTaskStatus(null);
            }
          }, 5000);
        }
        
        return {
          ...todo,
          tasks: updatedTasks
        };
      }
      return todo;
    }));
  };

  // 提取fetchTodos为独立函数以便重用
  const fetchTodos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error(getMessage('failedToFetchTodos'));
      }
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      console.error(getMessage('failedToFetchTodos'), error);
      setError(getMessage('failedToLoadTodos'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTodo = async () => {
    if (!newTodo.title) return;
    
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo.title,
          priority: newTodo.priority || 'P2',
          tags: deduplicateTags(newTodo.tags) || []  // 使用去重函数
        })
      });
      
      if (!response.ok) {
        throw new Error(getMessage('failedToCreateTodo'));
      }
      
      const createdTodo = await response.json();
      setTodos(prev => [...prev, createdTodo]);
      setIsModalVisible(false);
      setNewTodo({});
    } catch (error) {
      console.error(getMessage('failedToCreateTodo'), error);
      setError(getMessage('failedToCreateNewTodo'));
    }
  };

  const handleEditTodo = (todo: TodoItem) => {
    setEditingTodo(todo);
    setIsEditModalVisible(true);
  };

  const handleSaveTodo = async (updatedTodo: TodoItem) => {
    try {
      // 确保tags去重
      const todoWithDeduplicatedTags = {
        ...updatedTodo,
        tags: deduplicateTags(updatedTodo.tags)
      };
      
      const response = await fetch(`/api/todos/${updatedTodo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoWithDeduplicatedTags)
      });
      
      if (!response.ok) {
        throw new Error(getMessage('failedToSaveTodo'));
      }
      
      const savedTodo = await response.json();
      setTodos(prev => prev.map(todo => todo.id === savedTodo.id ? savedTodo : todo));
    } catch (error) {
      console.error(getMessage('failedToSaveTodo'), error);
      setError(getMessage('failedToSaveTodo'));
      throw error;
    }
  };

  // 添加删除任务的函数
  const handleDeleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(getMessage('failedToDeleteTodo'));
      }
      
      // 删除成功后更新UI，从列表中移除该任务
      setTodos(prev => prev.filter(todo => todo.id !== todoId));
      
      // 如果正在显示这个任务的拆分结果或状态，关闭它们
      if (showSplitResult === todoId) {
        setShowSplitResult(null);
        setSplitResultData(null);
      }
      
      if (showTaskStatus === todoId) {
        setShowTaskStatus(null);
      }
      
    } catch (error) {
      console.error(getMessage('failedToDeleteTodo'), error);
      setError(getMessage('failedToDeleteTodo'));
    }
  };

  // 添加获取单个任务最新数据的函数
  const fetchSingleTodo = async (todoId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/todos/${todoId}`);
      if (!response.ok) {
        throw new Error(getMessage('failedToFetchTodo'));
      }
      const data = await response.json();
      
      // 更新本地todos列表中的对应任务
      setTodos(prev => prev.map(todo => 
        todo.id === todoId ? data : todo
      ));
      
      return data;
    } catch (error) {
      console.error(getMessage('failedToFetchTodo'), error);
      setError(getMessage('failedToLoadTodo'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 修改点击查看任务拆分结果的处理函数 - 开发中状态
  const handleViewSplitResult = async (e: React.MouseEvent<HTMLElement>, todo: TodoItem) => {
    e.stopPropagation();
    
    if (showSplitResult === todo.id) {
      // 如果当前正在显示，则关闭
      setShowSplitResult(null);
      setSplitResultData(null);
    } else {
      // 先获取最新的任务数据，确保看到的是最新的拆解结果
      let latestTodo = todo;
      const freshData = await fetchSingleTodo(todo.id);
      if (freshData) {
        latestTodo = freshData;
      }
      
      // 从Context获取拆分结果并显示
      if (lastSplitResult && lastSplitTodoId === latestTodo.id) {
        setSplitResultData(lastSplitResult);
        setShowSplitResult(latestTodo.id);
      } else if (latestTodo.tasks && latestTodo.tasks.length > 0) {
        // 如果没有拆解结果但有tasks，直接构建一个结果对象
        const constructedResult = {
          original_task: {
            title: latestTodo.title,
            description: latestTodo.description || ''
          },
          analysis: latestTodo.analysis || '',
          tasks: latestTodo.tasks,
          dependencies: latestTodo.dependencies || []
        };
        setSplitResultData(constructedResult);
        setShowSplitResult(latestTodo.id);
      }
    }
  };

  // 修改点击查看任务拆分结果的处理函数 - 其他状态
  const handleViewSplitResultForOtherStatus = async (e: React.MouseEvent<HTMLElement>, todo: TodoItem) => {
    e.stopPropagation();
    
    if (showSplitResult === todo.id) {
      // 如果当前正在显示，则关闭
      setShowSplitResult(null);
      setSplitResultData(null);
    } else {
      // 先获取最新的任务数据，确保看到的是最新的拆解结果
      let latestTodo = todo;
      const freshData = await fetchSingleTodo(todo.id);
      if (freshData) {
        latestTodo = freshData;
      }
      
      if (latestTodo.tasks && latestTodo.tasks.length > 0) {
        // 如果有tasks，直接构建一个结果对象
        const constructedResult = {
          original_task: {
            title: latestTodo.title,
            description: latestTodo.description || ''
          },
          analysis: latestTodo.analysis || '',
          tasks: latestTodo.tasks,
          dependencies: latestTodo.dependencies || []
        };
        setSplitResultData(constructedResult);
        setShowSplitResult(latestTodo.id);
      }
    }
  };

  // 添加处理TaskSplitResultView关闭的函数
  const handleSplitResultViewClose = async (todoId: string) => {
    // 关闭视图
    setShowSplitResult(null);
    setSplitResultData(null);
    
    // 刷新单个任务数据，确保UI显示最新状态
    await fetchSingleTodo(todoId);
  };

  // 在任务卡片中渲染状态和操作按钮
  const renderTodoActions = (todo: TodoItem, handleEditTodo: (todo: TodoItem) => void) => {
    const hasSplitResultTag = todo.tags && todo.tags.includes('正在拆解');
    const isShowingSplitResult = showSplitResult === todo.id;
    
    // 检查Context中是否有该任务的拆分结果
    const hasSplitResult = lastSplitResult !== null && lastSplitTodoId === todo.id;
    
    // 检查当前任务是否正在拆解
    const isSplitting = todo.id === splittingTodoId;
    
    if (todo.status === 'developing') {
      // 进行中的任务显示运行状态，不显示编辑按钮
      return (
        <div className="todo-actions flex items-center gap-2">
          {isSplitting ? (
            <Badge 
              status="processing" 
              text={<span className="text-blue-400 text-xs">正在拆解...</span>}
            />
          ) : (
            <Badge 
              status="processing" 
              text={<span className="text-blue-400 text-xs">{getMessage('taskRunningStatus')}</span>}
            />
          )}
          {/* 查看任务状态按钮 */}
          {todo.tasks && todo.tasks.length > 0 && (
            <Button
              type={showTaskStatus === todo.id ? "primary" : "text"}
              size="small"
              icon={<SyncOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setShowTaskStatus(showTaskStatus === todo.id ? null : todo.id);
              }}
              className="text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center"
              title="查看任务状态"
            />
          )}
          {(todo.tasks && todo.tasks.length > 0) && (
            <Button
              type="text"
              size="small"
              icon={<CodeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleViewSplitResult(e, todo);
              }}
              className={`text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center ${isShowingSplitResult ? 'bg-blue-900/30' : ''}`}
              title="查看任务拆解结果"
            />
          )}
          <div className="todo-tags flex gap-1">
            {deduplicateTags(todo.tags).map(tag => (
              <Tag 
                key={tag} 
                className="text-xs bg-gray-600 border-none text-gray-300 rounded-full px-2"
              >
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      );
    } else {
      // 其他状态的任务显示编辑按钮
      return (
        <div className="todo-actions flex items-center gap-2">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEditTodo(todo);
            }}
            className="text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center"
          />
          {/* 在pending、testing和done状态下显示删除按钮 */}
          {(todo.status === 'pending' || todo.status === 'testing' || todo.status === 'done') && (
            <Popconfirm
              title={getMessage('confirmDeleteTask') || "确定要删除这个任务吗?"}
              okText={getMessage('yes') || "是"}
              cancelText={getMessage('no') || "否"}
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDeleteTodo(todo.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-red-500 p-0 flex items-center justify-center"
                title={getMessage('deleteTask') || "删除任务"}
              />
            </Popconfirm>
          )}
          {/* 在 testing 和 done 状态下显示查看任务状态按钮 */}
          {(todo.status === 'testing' || todo.status === 'done') && todo.tasks && todo.tasks.length > 0 && (
            <Button
              type={showTaskStatus === todo.id ? "primary" : "text"}
              size="small"
              icon={<SyncOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setShowTaskStatus(showTaskStatus === todo.id ? null : todo.id);
              }}
              className="text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center"
              title="查看任务状态"
            />
          )}
          {(todo.tasks && todo.tasks.length > 0) && (
            <Button
              type="text"
              size="small"
              icon={<CodeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleViewSplitResultForOtherStatus(e, todo);
              }}
              className={`text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center ${isShowingSplitResult ? 'bg-blue-900/30' : ''}`}
              title={isShowingSplitResult ? getMessage('hideTaskSplitResult') : getMessage('viewTaskSplitResult')}
            />
          )}
          <div className="todo-tags flex gap-1">
            {deduplicateTags(todo.tags).map(tag => (
              <Tag 
                key={tag} 
                className="text-xs bg-gray-600 border-none text-gray-300 rounded-full px-2"
              >
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      );
    }
  };

  // 处理面板最大化/恢复的函数
  const handleToggleMaximize = (columnId: ColumnId) => {
    setMaximizedPanel(prevState => prevState === columnId ? null : columnId);
  };

  return (
      <div className="todo-container h-full bg-gray-900 p-4" data-testid="todo-panel">
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          className="mb-4"
        />
      )}
      <div className="todo-header mb-4">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
              className="bg-blue-600 hover:bg-blue-700 border-none text-sm"
            >
              {getMessage('createNewTask')}
            </Button>
      </div>

      <ErrorBoundary
        fallbackRender={({ error }) => (
          <div className="text-red-500 p-4">
            {getMessage('droppableError', { message: error.message })}
          </div>
        )}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="todo-board flex gap-4 h-[calc(100%-80px)]">
              {isLoading ? (
              <div className="text-gray-400 text-center p-4">{getMessage('loading')}</div>
            ) : (
              columns.map(column => (
                <Droppable 
                  droppableId={column.id} 
                  key={column.id}                
                >
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`todo-column flex-col transition-all duration-300 ${
                    snapshot.isDraggingOver 
                      ? 'border-blue-500' 
                      : 'border-gray-700'
                  } ${
                    // 根据最大化状态调整样式
                    maximizedPanel === null 
                      ? 'flex-1' 
                      : maximizedPanel === column.id 
                        ? 'flex w-full' 
                        : 'hidden'
                  } bg-gray-800 rounded-lg p-4 border flex`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-gray-300 font-medium">{column.title}</h3>
                    <Tooltip title={maximizedPanel === column.id ? getMessage('restorePanel') : getMessage('maximizePanel')}>
                      <Button
                        type="text"
                        size="small"
                        icon={maximizedPanel === column.id ? <CompressOutlined /> : <ExpandOutlined />}
                        onClick={() => handleToggleMaximize(column.id as ColumnId)}
                        className="text-gray-400 hover:text-blue-400"
                      />
                    </Tooltip>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 custom-scrollbar">
                    {todos
                      .filter(todo => todo.status === column.id)
                      .map((todo, index) => (
                        <React.Fragment key={todo.id}>
                          <Draggable draggableId={todo.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`todo-card bg-gray-700 p-3 mb-3 rounded border ${
                                  snapshot.isDragging
                                    ? 'border-blue-500 shadow-lg'
                                    : todo.status === 'developing' 
                                        ? 'border-blue-400' 
                                        : 'border-gray-600'
                                } transition-all duration-150`}
                              >
                                <div className="todo-card-header flex items-center justify-between mb-2">
                                  <Tag 
                                    color={priorityColors[todo.priority]} 
                                    className="border-none text-xs px-2 rounded-full"
                                  >
                                    {todo.priority}
                                  </Tag>
                                  {renderTodoActions(todo, handleEditTodo)}
                                </div>
                                <div className="todo-title text-gray-200 text-sm mb-1">{todo.title}</div>
                                {todo.dueDate && (
                                  <div className="todo-due-date text-gray-400 text-xs">
                                    {getMessage('dueDate', { date: new Date(todo.dueDate).toLocaleDateString() })}
                                  </div>
                                )}
                                {todo.status === 'developing' && (
                                  <div className="todo-execution-status flex items-center gap-1 text-blue-400 text-xs mt-2">
                                    <SyncOutlined spin />
                                    <span>{getMessage('taskExecutingInBackground')}</span>
                                  </div>
                                )}
                                {/* 显示正在拆解任务的状态 - 在pending面板中显示 */}
                                {todo.status === 'pending' && splittingTodoId && todo.id === splittingTodoId && (
                                  <div className="todo-splitting-status flex items-center gap-1 text-blue-400 text-xs mt-2">
                                    <SyncOutlined spin />
                                    <span>正在后台运行拆解任务...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                          {/* 任务拆分结果视图 - 在所有状态下都可以显示 */}
                          {showSplitResult === todo.id && splitResultData && (
                            <TaskSplitResultView 
                              visible={true} 
                              result={splitResultData}
                              todoId={todo.id}
                              onClose={() => handleSplitResultViewClose(todo.id)}
                            />
                          )}
                          
                          {/* 任务状态视图 - 在 developing、testing 和 done 状态下显示 */}
                          {showTaskStatus === todo.id && (todo.status === 'developing' || todo.status === 'testing' || todo.status === 'done') && (
                            <TaskStatusView 
                              todoId={todo.id}
                              onClose={() => setShowTaskStatus(null)}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          )))}          
        </div>
      </DragDropContext>

        <Modal
        title={getMessage('createNewTask')}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleCreateTodo}
        className="dark-theme-modal"
        styles={{
          content: {
            backgroundColor: '#1f2937',
            padding: '20px',
          },
          header: {
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          },
          body: {
            backgroundColor: '#1f2937',
          }
        }}
      >
        <Input
          placeholder={getMessage('taskTitlePlaceholder')}
          className="custom-input bg-gray-800 border-gray-700 text-gray-200 mb-3"
          value={newTodo.title}
          onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
        />
        <Select
          className="custom-select w-full"
          placeholder={getMessage('priorityPlaceholder')}
          value={newTodo.priority}
          onChange={(value) => setNewTodo({...newTodo, priority: value})}
          options={priorityOptions}
        />
      </Modal>
      
      <TodoEditModal
        visible={isEditModalVisible}
        todo={editingTodo}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveTodo}
      />
      
      <AutoExecuteNotificationModal
        visible={executeModalVisible}
        todo={executingTodo}
        onClose={handleCancelExecution}
        onConfirm={handleConfirmExecution}
        isExecuting={isExecuting}
        confirmMode={confirmMode}
      />
      </ErrorBoundary> 
    </div>
  );
};

export default TodoPanel;