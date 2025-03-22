import React from 'react';
import { Collapse, Card, Tag, List, Typography, Badge, Input, Select, Tooltip, Button, Empty, message as AntMessage } from 'antd';
import { 
  BranchesOutlined, 
  NodeIndexOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';
import { SubTask, SubTasksPanelProps } from './types';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// Styles
const panelHeaderStyle = {
  background: '#0f172a',
  borderRadius: '6px',
  padding: '8px 12px',
  marginBottom: '8px',
  borderLeft: '3px solid #0ea5e9', // 蓝色左边框
};

const cardStyle = {
  background: '#1e293b', // 深蓝灰色背景
  borderColor: '#334155', // 边框颜色
  color: '#f8fafc', // 文本颜色
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

// 优先级颜色映射
const priorityColors: Record<string, string> = {
  'P0': '#ef4444', // 红色
  'P1': '#f97316', // 橙色
  'P2': '#0ea5e9', // 蓝色
  'P3': '#6b7280', // 灰色
};

const SubTasksPanel: React.FC<SubTasksPanelProps> = ({
  tasks,
  tasksCount,
  updateTaskData,
  updateArrayField,
  saveData,
  parsedResult,
  setParsedResult,
  addSubTask,
  deleteSubTask,
  onTaskDataBlur,
  onArrayFieldBlur
}) => {
  // Render the add task button
  const renderAddTaskButton = () => {
    if (!addSubTask) return null;
    
    return (
      <div className="flex justify-end mb-4">
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={addSubTask}
          style={{ backgroundColor: '#0ea5e9' }}
        >
          添加子任务
        </Button>
      </div>
    );
  };

  // Render the task list
  const renderTaskList = () => {
    return (
      <List
        dataSource={tasks}
        itemLayout="vertical"
        split={false}
        className="space-y-4"
        renderItem={(task: SubTask, index: number) => (
            <List.Item className="p-0">
              <Card 
                bordered={false}
                className="rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl"
                style={cardStyle}
                title={
                  <div className="flex justify-between items-center py-1">
                    <div className="flex items-center">
                      <Badge 
                        count={task.id !== undefined ? task.id : index} 
                        style={{ 
                          backgroundColor: '#0ea5e9', 
                          marginRight: '12px',
                          boxShadow: '0 0 0 2px rgba(14, 165, 233, 0.2)'
                        }} 
                      />
                      <Text 
                        style={{ color: '#f8fafc', fontWeight: 600, fontSize: '15px' }}
                        editable={{
                          onChange: (value) => updateTaskData(index, 'title', value),
                          tooltip: 'Click to edit title',
                          icon: <EditOutlined style={{ color: '#0ea5e9' }} />,
                          onEnd: onTaskDataBlur,
                        }}
                      >
                        {task.title}
                      </Text>
                    </div>
                    <div className="flex items-center space-x-2">
                      {deleteSubTask && (
                        <Tooltip title="删除此子任务">
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubTask(index);
                            }}
                            size="small"
                          />
                        </Tooltip>
                      )}
                      <Tooltip title="Click to change priority">
                        <Select
                          value={task.priority || 'P2'}
                          style={{ width: 70 }}
                          bordered={false}
                          dropdownStyle={{ backgroundColor: '#1e293b', color: '#f8fafc' }}
                          onChange={(value) => updateTaskData(index, 'priority', value)}
                          onBlur={onTaskDataBlur}
                          options={[
                            { value: 'P0', label: 'P0' },
                            { value: 'P1', label: 'P1' },
                            { value: 'P2', label: 'P2' },
                            { value: 'P3', label: 'P3' },
                          ]}
                          suffixIcon={null}
                          className="priority-select"
                        />
                      </Tooltip>
                      <Tooltip title="Click to edit estimate">
                        <Input
                          prefix={<ClockCircleOutlined style={{ color: '#0ea5e9' }} />}
                          value={task.estimate || ''}
                          onChange={(e) => updateTaskData(index, 'estimate', e.target.value)}
                          onBlur={onTaskDataBlur}
                          style={{ 
                            width: 100, 
                            backgroundColor: '#334155',
                            color: '#e2e8f0',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0 8px'
                          }}
                          size="small"
                        />
                      </Tooltip>
                    </div>
                  </div>
                }
                headStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderBottom: '1px solid #334155',
                  padding: '12px 16px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Paragraph 
                  style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '14px', marginBottom: '16px' }}
                  editable={{
                    onChange: (value) => updateTaskData(index, 'description', value),
                    tooltip: 'Click to edit description',
                    icon: <EditOutlined style={{ color: '#0ea5e9' }} />,
                    onEnd: onTaskDataBlur,
                  }}
                >
                  {task.description}
                </Paragraph>
                
                {task.references && task.references.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <LinkOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
                      <Text style={{ color: '#0ea5e9', fontWeight: 500 }}>
                        {getMessage('references')}
                      </Text>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {task.references.map((ref: string, idx: number) => (
                        <Input
                          key={idx}
                          value={ref}
                          onChange={(e) => updateArrayField(index, 'references', idx, e.target.value)}
                          onBlur={onArrayFieldBlur}
                          style={{ 
                            backgroundColor: '#1e293b',
                            color: '#94a3b8',
                            border: '1px solid #334155',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            width: 'auto',
                            marginRight: '8px',
                            marginBottom: '8px'
                          }}
                          size="small"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <NodeIndexOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
                      <Text style={{ color: '#0ea5e9', fontWeight: 500 }}>
                        {getMessage('implementationSteps')}
                      </Text>
                    </div>
                    <Button 
                      type="text" 
                      icon={<PlusOutlined />} 
                      size="small"
                      onClick={() => {
                        const newSteps = [...(task.steps || []), ''];
                        const newTasks = [...parsedResult.tasks];
                        newTasks[index] = {
                          ...task,
                          steps: newSteps
                        };
                        const updatedResult = {
                          ...parsedResult,
                          tasks: newTasks
                        };
                        setParsedResult(updatedResult);
                        saveData(updatedResult);
                      }}
                      style={{ 
                        color: '#0ea5e9'
                      }}
                    />
                  </div>
                  <div 
                    className="mb-2"
                    style={{ 
                      color: '#cbd5e1',
                      background: '#0f172a',
                      padding: '12px',
                      borderRadius: '6px'
                    }}
                  >
                    {task.steps && task.steps.length > 0 && task.steps.map((step: string, stepIdx: number) => (
                      <div key={stepIdx} className="flex items-start mb-3">
                        <div className="mr-3 mt-1">
                          <div 
                            style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              backgroundColor: '#0ea5e9',
                              display: 'inline-block'
                            }} 
                          />
                        </div>
                        <div className="flex-1 relative">
                          <Input.TextArea
                            value={step}
                            onChange={(e) => updateArrayField(index, 'steps', stepIdx, e.target.value)}
                            onBlur={onArrayFieldBlur}
                            style={{ 
                              backgroundColor: 'transparent',
                              color: '#e2e8f0',
                              border: '1px solid #334155',
                              borderRadius: '4px',
                              width: '100%',
                              resize: 'vertical',
                              minHeight: '60px'
                            }}
                            autoSize={{ minRows: 2, maxRows: 6 }}
                          />
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            size="small"
                            onClick={() => {
                              const newSteps = [...task.steps];
                              newSteps.splice(stepIdx, 1);
                              const newTasks = [...parsedResult.tasks];
                              newTasks[index] = {
                                ...task,
                                steps: newSteps
                              };
                              const updatedResult = {
                                ...parsedResult,
                                tasks: newTasks
                              };
                              setParsedResult(updatedResult);
                              saveData(updatedResult);
                            }}
                            style={{ 
                              position: 'absolute', 
                              right: '-30px', 
                              top: '0'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center mb-3">
                      <CheckCircleOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
                      <Text style={{ color: '#0ea5e9', fontWeight: 500 }}>
                        {getMessage('acceptanceCriteria')}
                      </Text>
                    </div>
                    <div className="space-y-2">
                      {task.acceptance_criteria.map((criteria: string, criteriaIdx: number) => (
                        <div 
                          key={criteriaIdx}
                          style={{ 
                            color: '#e2e8f0', 
                            border: 'none',
                            background: '#0f172a',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'flex-start'
                          }}
                        >
                          <Badge 
                            count={criteriaIdx + 1} 
                            size="small" 
                            style={{ 
                              backgroundColor: '#0ea5e9', 
                              marginRight: '8px',
                              marginTop: '6px'
                            }} 
                          />
                          <Input.TextArea
                            value={criteria}
                            onChange={(e) => updateArrayField(index, 'acceptance_criteria', criteriaIdx, e.target.value)}
                            style={{ 
                              backgroundColor: 'transparent',
                              color: '#e2e8f0',
                              border: 'none',
                              width: '100%',
                              resize: 'vertical'
                            }}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </List.Item>
          )}
        />
      );
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-gray-400">{getMessage('noSubTasks')}</span>}
        />
        {addSubTask && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={addSubTask}
            style={{ marginTop: '16px', backgroundColor: '#0ea5e9' }}
          >
            添加子任务
          </Button>
        )}
      </div>
    );
  };

  // Main render function
  const renderContent = () => {
    if (tasks && tasks.length > 0) {
      return (
        <div>
          {renderAddTaskButton()}
          {renderTaskList()}
        </div>
      );
    }
    
    return renderEmptyState();
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
};

export default SubTasksPanel;
