import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Select, DatePicker, Button, Tag, message as AntMessage } from 'antd';
import { PlusOutlined, SplitCellsOutlined } from '@ant-design/icons';
import { getMessage } from '../Sidebar/lang';
import moment from 'moment';
import { autoCommandService } from '../../services/autoCommandService';

const { TextArea } = Input;
const { Option } = Select;

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'developing' | 'testing' | 'done';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags: string[];
  owner?: string;
  dueDate?: string;
  created_at: string;
  updated_at: string;
}

interface TodoEditModalProps {
  visible: boolean;
  todo: TodoItem | null;
  onClose: () => void;
  onSave: (todo: TodoItem) => Promise<void>;
}

const TodoEditModal: React.FC<TodoEditModalProps> = ({
  visible,
  todo,
  onClose,
  onSave
}) => {
  const [editedTodo, setEditedTodo] = useState<Partial<TodoItem>>({});
  const [loading, setLoading] = useState(false);
  const [inputTag, setInputTag] = useState('');
  const [splitLoading, setSplitLoading] = useState(false);
  
  const eventListenerRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (todo) {
      setEditedTodo(todo);
    } else {
      setEditedTodo({});
    }
  }, [todo]);

  useEffect(() => {
    const handleTaskSplitResult = (msgEvent: any) => {
      if (msgEvent.contentType === 'summary') {
        console.log('Task split result:', msgEvent);
        AntMessage.success(getMessage('taskSplitSuccess', { count: '0' }));
        setSplitLoading(false);
        onClose();
        
        autoCommandService.removeListener('message', handleTaskSplitResult);
        eventListenerRef.current = false;
      }
    };

    return () => {
      if (eventListenerRef.current) {
        autoCommandService.removeListener('message', handleTaskSplitResult);
        eventListenerRef.current = false;
      }
    };
  }, [onClose]);

  const handleSave = async () => {
    if (!editedTodo.title) {
      AntMessage.error(getMessage('todoTitleRequired'));
      return;
    }
    
    setLoading(true);
    try {
      if (todo && editedTodo) {
        await onSave({
          ...todo,
          ...editedTodo,
        } as TodoItem);
      }
      onClose();
    } catch (error) {
      console.error(getMessage('failedToSaveTodo'), error);
      AntMessage.error(getMessage('failedToSaveTodo'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (inputTag && editedTodo.tags && !editedTodo.tags.includes(inputTag)) {
      setEditedTodo({
        ...editedTodo,
        tags: [...editedTodo.tags, inputTag]
      });
      setInputTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (editedTodo.tags) {
      setEditedTodo({
        ...editedTodo,
        tags: editedTodo.tags.filter(t => t !== tag)
      });
    }
  };

  const handleSplitTask = async () => {
    if (!editedTodo.title || !editedTodo.description) {
      AntMessage.error(getMessage('todoDescriptionRequired'));
      return;
    }

    setSplitLoading(true);
    try {
      const command = `split_task "${editedTodo.title}" "${editedTodo.description}" "${editedTodo.priority || 'P2'}"`;
      
      const handleTaskSplitResult = (msgEvent: any) => {
        if (msgEvent.contentType === 'summary') {
          console.log('Task split result:', msgEvent);
          let tasksCount = 0;
          try {
            tasksCount = JSON.parse(msgEvent.content).tasks_count || 0;
          } catch (e) {
            console.error('Error parsing task count:', e);
          }
          
          AntMessage.success(getMessage('taskSplitSuccess', { count: String(tasksCount) }));
          setSplitLoading(false);
          onClose();
          
          autoCommandService.removeListener('message', handleTaskSplitResult);
          eventListenerRef.current = false;
        }
      };
      
      autoCommandService.on('message', handleTaskSplitResult);
      eventListenerRef.current = true;
      
      await autoCommandService.executeCommand(command);
      
    } catch (error) {
      console.error(getMessage('failedToSplitTask'), error);
      AntMessage.error(getMessage('failedToSplitTask'));
      setSplitLoading(false);
      
      if (eventListenerRef.current) {
        autoCommandService.removeListener('message', function() {});
        eventListenerRef.current = false;
      }
    }
  };

  const priorityOptions = [
    { value: 'P0', label: getMessage('priorityP0') },
    { value: 'P1', label: getMessage('priorityP1') },
    { value: 'P2', label: getMessage('priorityP2') },
    { value: 'P3', label: getMessage('priorityP3') },
  ];

  return (
    <Modal
      title={getMessage('editTodoTitle')}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="split" 
          type="default" 
          icon={<SplitCellsOutlined />} 
          loading={splitLoading}
          onClick={handleSplitTask}
          className="bg-purple-700 hover:bg-purple-800 border-none text-white"
        >
          {getMessage('splitTask')}
        </Button>,
        <Button key="cancel" onClick={onClose}>
          {getMessage('cancel')}
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={loading} 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 border-none"
        >
          {getMessage('save')}
        </Button>
      ]}
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
      width={700}
    >
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">{getMessage('todoTitle')}</label>
        <Input
          value={editedTodo.title}
          onChange={(e) => setEditedTodo({...editedTodo, title: e.target.value})}
          placeholder={getMessage('todoTitlePlaceholder')}
          className="custom-input bg-gray-800 border-gray-700 text-gray-200"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">{getMessage('todoDescription')}</label>
        <TextArea
          value={editedTodo.description}
          onChange={(e) => setEditedTodo({...editedTodo, description: e.target.value})}
          placeholder={getMessage('todoDescriptionPlaceholder')}
          rows={6}
          className="custom-input bg-gray-800 border-gray-700 text-gray-200"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">{getMessage('priority')}</label>
          <Select
            value={editedTodo.priority}
            onChange={(value) => setEditedTodo({...editedTodo, priority: value})}
            options={priorityOptions}
            className="custom-select w-full"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">{getMessage('dueDate')}</label>
          <DatePicker
            value={editedTodo.dueDate ? moment(editedTodo.dueDate) : undefined}
            onChange={(date) => setEditedTodo({...editedTodo, dueDate: date ? date.toISOString() : undefined})}
            className="custom-input bg-gray-800 border-gray-700 text-gray-200 w-full"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-300 mb-1">{getMessage('tags')}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {editedTodo.tags?.map(tag => (
            <Tag
              key={tag}
              closable
              onClose={() => handleRemoveTag(tag)}
              className="text-xs bg-gray-700 border-none text-gray-300 rounded-full px-3 py-1"
            >
              {tag}
            </Tag>
          ))}
        </div>
        <div className="flex">
          <Input
            value={inputTag}
            onChange={(e) => setInputTag(e.target.value)}
            placeholder={getMessage('addTagPlaceholder')}
            className="custom-input bg-gray-800 border-gray-700 text-gray-200 flex-1 mr-2"
            onPressEnter={handleAddTag}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddTag}
            className="bg-gray-700 hover:bg-gray-600 border-none text-gray-200"
          >
            {getMessage('addTag')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TodoEditModal; 