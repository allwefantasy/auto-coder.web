import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button, Input, Select, Tag, Avatar, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import './TodoPanel.css';

interface TodoItem {
  id: string;
  title: string;
  status: 'pending' | 'developing' | 'testing' | 'done';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags: string[];
  owner?: string;
  dueDate?: Date;
}

const TodoPanel: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTodo, setNewTodo] = useState<Partial<TodoItem>>({});

  const columns = [
    { id: 'pending', title: '待评估' },
    { id: 'developing', title: '进行中' },
    { id: 'testing', title: '测试中' },
    { id: 'done', title: '已完成' },
  ];

  const onDragEnd = (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    const items = Array.from(todos);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);

    setTodos(items);
  };

  const handleCreateTodo = () => {
    if (!newTodo.title) return;
    setTodos([...todos, {
      id: `todo-${Date.now()}`,
      title: newTodo.title,
      status: 'pending',
      priority: 'P2',
      tags: [],
      ...newTodo
    } as TodoItem]);
    setIsModalVisible(false);
    setNewTodo({});
  };

  return (
    <div className="todo-container">
      <div className="todo-header">
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
        >
          新建需求
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="todo-board">
          {columns.map(column => (
            <Droppable droppableId={column.id} key={column.id}>
              {(provided) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="todo-column"
                >
                  <h3>{column.title}</h3>
                  {todos
                    .filter(todo => todo.status === column.id)
                    .map((todo, index) => (
                      <Draggable key={todo.id} draggableId={todo.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="todo-card"
                          >
                            <div className="todo-card-header">
                              <Tag color={todo.priority === 'P0' ? 'red' : 
                                todo.priority === 'P1' ? 'orange' : 'blue'}>
                                {todo.priority}
                              </Tag>
                              <div className="todo-tags">
                                {todo.tags.map(tag => (
                                  <Tag key={tag}>{tag}</Tag>
                                ))}
                              </div>
                            </div>
                            <div className="todo-title">{todo.title}</div>
                            {todo.dueDate && (
                              <div className="todo-due-date">
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
          ))}
        </div>
      </DragDropContext>

      <Modal
        title="新建需求"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleCreateTodo}
      >
        <Input
          placeholder="需求标题"
          value={newTodo.title}
          onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
        />
        <Select
          placeholder="优先级"
          style={{ width: '100%', marginTop: 16 }}
          value={newTodo.priority}
          onChange={(value) => setNewTodo({...newTodo, priority: value})}
          options={[
            { value: 'P0', label: 'P0 - 紧急' },
            { value: 'P1', label: 'P1 - 高' },
            { value: 'P2', label: 'P2 - 中' },
            { value: 'P3', label: 'P3 - 低' },
          ]}
        />
      </Modal>
    </div>
  );
};

export default TodoPanel;