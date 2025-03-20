import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button, Input, Select, Tag, Modal, Badge } from 'antd';
import { PlusOutlined, EditOutlined, SyncOutlined, CodeOutlined } from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
import { getMessage } from '../Sidebar/lang';
import TodoEditModal from './TodoEditModal';
import AutoExecuteNotificationModal from './AutoExecuteNotificationModal';
import TaskSplitResultView from './TaskSplitResult/TaskSplitResultView';
import './TodoPanel.css';

type ColumnId = 'pending' | 'developing' | 'testing' | 'done';

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

  const columns = [
    { id: 'pending', title: getMessage('statusPending') },
    { id: 'developing', title: getMessage('statusDeveloping') },
    { id: 'testing', title: getMessage('statusTesting') },
    { id: 'done', title: getMessage('statusDone') },
  ];

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    // Check if task is moved from 'pending' to 'developing'
    const isPendingToDeveloping = 
      source.droppableId === 'pending' && 
      destination.droppableId === 'developing';
    
    // Find the todo being dragged
    const draggedTodo = todos.find(todo => todo.id === result.draggableId);

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

  // 模拟任务自动执行的函数
  const startTaskExecution = async (todo: TodoItem) => {
    setIsExecuting(true);
    
    try {
      // 这里可以实现真正的后台任务执行逻辑，比如调用AI处理任务
      // 这里仅做模拟，延迟3秒后完成
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 更新任务状态
      const response = await fetch(`/api/todos/${todo.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute task');
      }
      
      // 可选：刷新任务列表
      fetchTodos();
      
    } catch (error) {
      console.error('Failed to execute task:', error);
    } finally {
      setIsExecuting(false);
    }
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
          tags: newTodo.tags || []
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
      const response = await fetch(`/api/todos/${updatedTodo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodo)
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

  // 在任务卡片中渲染状态和操作按钮
  const renderTodoActions = (todo: TodoItem, handleEditTodo: (todo: TodoItem) => void) => {
    const hasSplitResultTag = todo.tags && todo.tags.includes('正在拆解');
    const isShowingSplitResult = showSplitResult === todo.id;
    
    // 检查localStorage中是否有该任务的拆分结果
    const checkSplitResult = () => {
      const lastSplitResult = localStorage.getItem('lastSplitResult');
      if (lastSplitResult) {
        try {
          const resultData = JSON.parse(lastSplitResult);
          if (resultData) {
            return true;
          }
        } catch (e) {
          console.error('Error parsing split result:', e);
        }
      }
      return false;
    };

    const hasSplitResultInStorage = checkSplitResult();
    
    if (todo.status === 'developing') {
      // 进行中的任务显示运行状态，不显示编辑按钮
      return (
        <div className="todo-actions flex items-center gap-2">
          <Badge 
            status="processing" 
            text={<span className="text-blue-400 text-xs">{getMessage('taskRunningStatus')}</span>}
          />
          {hasSplitResultTag && hasSplitResultInStorage && (
            <Button
              type="text"
              size="small"
              icon={<CodeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                if (isShowingSplitResult) {
                  setShowSplitResult(null);
                  setSplitResultData(null);
                } else {
                  // 从localStorage获取拆分结果并显示
                  const lastSplitResult = localStorage.getItem('lastSplitResult');
                  if (lastSplitResult) {
                    try {
                      const resultData = JSON.parse(lastSplitResult);
                      setSplitResultData(resultData);
                      setShowSplitResult(todo.id);
                    } catch (e) {
                      console.error('Error parsing split result:', e);
                    }
                  }
                }
              }}
              className={`text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center ${isShowingSplitResult ? 'bg-blue-900/30' : ''}`}
            />
          )}
          <div className="todo-tags flex gap-1">
            {todo.tags.map(tag => (
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
          {hasSplitResultTag && hasSplitResultInStorage && (
            <Button
              type="text"
              size="small"
              icon={<CodeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                if (isShowingSplitResult) {
                  setShowSplitResult(null);
                  setSplitResultData(null);
                } else {
                  // 从localStorage获取拆分结果并显示
                  const lastSplitResult = localStorage.getItem('lastSplitResult');
                  if (lastSplitResult) {
                    try {
                      const resultData = JSON.parse(lastSplitResult);
                      setSplitResultData(resultData);
                      setShowSplitResult(todo.id);
                    } catch (e) {
                      console.error('Error parsing split result:', e);
                    }
                  }
                }
              }}
              className={`text-gray-400 hover:text-blue-400 p-0 flex items-center justify-center ${isShowingSplitResult ? 'bg-blue-900/30' : ''}`}
              title={isShowingSplitResult ? getMessage('hideTaskSplitResult') : getMessage('viewTaskSplitResult')}
            />
          )}
          <div className="todo-tags flex gap-1">
            {todo.tags.map(tag => (
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

  return (
      <div className="todo-container h-full bg-gray-900 p-4" data-testid="todo-panel">
      {error && (
        <div className="text-red-500 p-4 border border-red-700 bg-red-900 rounded mb-4">
          {error}
        </div>
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
                  className={`todo-column flex-1 bg-gray-800 rounded-lg p-4 border flex flex-col ${
                    snapshot.isDraggingOver 
                      ? 'border-blue-500' 
                      : 'border-gray-700'
                  }`}
                >
                  <h3 className="text-gray-300 mb-3 font-medium">{column.title}</h3>
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
                              </div>
                            )}
                          </Draggable>
                          {showSplitResult === todo.id && splitResultData && (
                            <TaskSplitResultView 
                              visible={true} 
                              result={splitResultData}
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