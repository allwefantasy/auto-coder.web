import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button, Input, Select, Tag, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
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
  { value: 'P0', label: 'P0 - 紧急' },
  { value: 'P1', label: 'P1 - 高' },
  { value: 'P2', label: 'P2 - 中' },
  { value: 'P3', label: 'P3 - 低' },
];

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const TodoPanel: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTodo, setNewTodo] = useState<Partial<TodoItem>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const fetchTodos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/todos');
        if (!response.ok) {
          throw new Error('Failed to fetch todos');
        }
        const data = await response.json();
        setTodos(data);
      } catch (error) {
        console.error('Failed to fetch todos:', error);
        setError('Failed to load todos. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTodos();
  }, []);

  const columns = [
    { id: 'pending', title: '待评估' },
    { id: 'developing', title: '进行中' },
    { id: 'testing', title: '测试中' },
    { id: 'done', title: '已完成' },
  ];

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

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

    } catch (error) {
      console.error('Failed to reorder todos:', error);
      // Revert to original state on error
      setTodos(originalTodos);
      setError('Failed to save changes. Please try again.');
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
        throw new Error('Failed to create todo');
      }
      
      const createdTodo = await response.json();
      setTodos(prev => [...prev, createdTodo]);
      setIsModalVisible(false);
      setNewTodo({});
    } catch (error) {
      console.error('Failed to create todo:', error);
      setError('Failed to create new todo. Please try again.');
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
          新建需求
        </Button>
      </div>

      <ErrorBoundary
        fallbackRender={({ error }) => (
          <div className="text-red-500 p-4">
            Droppable Error: {error.message}
          </div>
        )}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="todo-board flex gap-4 h-[calc(100%-80px)]">
            {isLoading ? (
              <div className="text-gray-400 text-center p-4">加载中...</div>
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
                  className={`todo-column flex-1 bg-gray-800 rounded-lg p-4 border ${
                    snapshot.isDraggingOver 
                      ? 'border-blue-500' 
                      : 'border-gray-700'
                  }`}
                >
                  <h3 className="text-gray-300 mb-3 font-medium">{column.title}</h3>
                  {todos
                    .filter(todo => todo.status === column.id)
                    .map((todo, index) => (
                      <Draggable key={todo.id} draggableId={todo.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`todo-card bg-gray-700 p-3 mb-3 rounded border ${
                              snapshot.isDragging
                                ? 'border-blue-500 shadow-lg'
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
                            <div className="todo-title text-gray-200 text-sm mb-1">{todo.title}</div>
                            {todo.dueDate && (
                              <div className="todo-due-date text-gray-400 text-xs">
                                截止: {new Date(todo.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )))}          
        </div>
      </DragDropContext>

      <Modal
        title="新建需求"
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
          placeholder="需求标题"
          className="custom-input bg-gray-800 border-gray-700 text-gray-200 mb-3"
          value={newTodo.title}
          onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
        />
        <Select
          className="custom-select w-full"
          placeholder="优先级"
          value={newTodo.priority}
          onChange={(value) => setNewTodo({...newTodo, priority: value})}
          options={priorityOptions}
        />
      </Modal>
      </ErrorBoundary> 
    </div>
  );
};

export default TodoPanel;