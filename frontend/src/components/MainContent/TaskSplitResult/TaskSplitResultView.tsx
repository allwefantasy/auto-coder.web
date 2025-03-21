import React, { useState, useEffect } from 'react';
import { Collapse, Card, Tag, List, Typography, Divider, Empty, Steps, Badge, Alert, Tooltip, Input, Select, message as AntMessage, Button } from 'antd';
import { getMessage } from '../../Sidebar/lang';
import { 
  CaretRightOutlined, 
  FileTextOutlined, 
  BranchesOutlined, 
  NodeIndexOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface TaskReference {
  task: string;
  depends_on: string[];
}

interface SubTask {
  title: string;
  description: string;
  references: string[];
  steps: string[];
  acceptance_criteria: string[];
  priority: string;
  estimate: string;
}

interface TaskSplitResult {
  original_task: {
    title: string;
    description: string;
  };
  analysis: string;
  tasks: SubTask[];
  tasks_count: number;
  dependencies?: TaskReference[];
}

interface TaskSplitResultViewProps {
  visible: boolean;
  result?: TaskSplitResult | null;
}

// 优先级颜色映射
const getPriorityColor = (priority: string) => {
  const priorities: Record<string, string> = {
    'P0': '#ef4444', // 红色
    'P1': '#f97316', // 橙色
    'P2': '#3b82f6', // 蓝色
    'P3': '#6b7280', // 灰色
  };
  return priorities[priority] || '#3b82f6';
};

// 自定义卡片样式
const cardStyle = {
  background: '#1e293b', // 深蓝灰色背景
  borderColor: '#334155', // 边框颜色
  color: '#f8fafc', // 文本颜色
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

// 自定义标签样式
const tagStyle = {
  color: '#f1f5f9',
  fontWeight: 500,
};

// 自定义面板头部样式
const panelHeaderStyle = {
  background: '#0f172a',
  borderRadius: '6px',
  padding: '8px 12px',
  marginBottom: '8px',
  borderLeft: '3px solid #0ea5e9', // 蓝色左边框
};

const TaskSplitResultView: React.FC<TaskSplitResultViewProps> = ({ visible, result }) => {
  const [activeKey, setActiveKey] = useState<string[]>(['1']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<TaskSplitResult | null>(null);
  const [saving, setSaving] = useState(false);

  // 在组件挂载和result变化时处理数据
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (result) {
      try {
        // 如果result是字符串，尝试解析
        if (typeof result === 'string') {
          setParsedResult(JSON.parse(result));
        } else {
          setParsedResult(result);
        }
      } catch (e) {
        console.error('Error parsing result:', e);
        setError('Failed to parse task split result');
      }
    } else {
      setParsedResult(null);
    }

    setLoading(false);
  }, [result]);

  // 保存更新后的数据
  const saveData = async (updatedResult: TaskSplitResult) => {
    if (!updatedResult) return;
    
    setSaving(true);
    try {
      // 获取当前URL中的todo_id参数
      const urlParams = new URLSearchParams(window.location.search);
      const todoId = urlParams.get('todo_id');
      
      if (!todoId) {
        throw new Error('No todo_id found in URL');
      }
      
      // 准备更新数据
      const updateData = {
        tasks: updatedResult.tasks,
        original_task: updatedResult.original_task,
        analysis: updatedResult.analysis,
        dependencies: updatedResult.dependencies
      };
      
      // 调用API保存数据
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save changes');
      }
      
      AntMessage.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      AntMessage.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  
  // 更新任务数据
  const updateTaskData = (taskIndex: number, field: keyof SubTask, value: any) => {
    if (!parsedResult) return;
    
    const updatedResult = { ...parsedResult };
    const updatedTasks = [...updatedResult.tasks];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      [field]: value
    };
    updatedResult.tasks = updatedTasks;
    
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };
  
  // 更新数组类型的字段
  const updateArrayField = (taskIndex: number, field: keyof SubTask, itemIndex: number, value: string) => {
    if (!parsedResult) return;
    
    const updatedResult = { ...parsedResult };
    const updatedTasks = [...updatedResult.tasks];
    const currentArray = [...(updatedTasks[taskIndex][field] as string[])];
    currentArray[itemIndex] = value;
    
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      [field]: currentArray
    };
    
    updatedResult.tasks = updatedTasks;
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };
  
  // 更新原始任务
  const updateOriginalTask = (field: 'title' | 'description', value: string) => {
    if (!parsedResult) return;
    
    const updatedResult = { ...parsedResult };
    updatedResult.original_task = {
      ...updatedResult.original_task,
      [field]: value
    };
    
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };
  
  // 更新分析结果
  const updateAnalysis = (value: string) => {
    if (!parsedResult) return;
    
    const updatedResult = { ...parsedResult };
    updatedResult.analysis = value;
    
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };
  
  // 更新依赖关系
  const updateDependency = (depIndex: number, field: 'task' | 'depends_on', value: any) => {
    if (!parsedResult || !parsedResult.dependencies) return;
    
    const updatedResult = { ...parsedResult };
    const updatedDependencies = [...updatedResult.dependencies!];
    
    if (field === 'task') {
      updatedDependencies[depIndex] = {
        ...updatedDependencies[depIndex],
        task: value
      };
    } else if (field === 'depends_on') {
      updatedDependencies[depIndex] = {
        ...updatedDependencies[depIndex],
        depends_on: value
      };
    }
    
    updatedResult.dependencies = updatedDependencies;
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };
  
  // 编辑依赖项
  const updateDependencyItem = (depIndex: number, itemIndex: number, value: string) => {
    if (!parsedResult || !parsedResult.dependencies) return;
    
    const updatedResult = { ...parsedResult };
    const updatedDependencies = [...updatedResult.dependencies!];
    const currentDependsOn = [...updatedDependencies[depIndex].depends_on];
    
    currentDependsOn[itemIndex] = value;
    updatedDependencies[depIndex] = {
      ...updatedDependencies[depIndex],
      depends_on: currentDependsOn
    };
    
    updatedResult.dependencies = updatedDependencies;
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };

  if (!visible) {
    return null;
  }

  if (loading) {
    return (
      <div className="task-split-result-view bg-slate-900 rounded-xl p-6 mb-4 shadow-lg">
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-500 border-r-transparent">
          </div>
          <p className="text-sky-400 mt-4 font-medium">{getMessage('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !parsedResult) {
    return (
      <div className="task-split-result-view bg-slate-900 rounded-xl p-6 mb-4 shadow-lg">
        <Alert
          message={getMessage('errorTitle')}
          description={error || getMessage('noSplitResultData')}
          type="error"
          showIcon
          style={{ 
            background: '#450a0a', 
            borderColor: '#b91c1c',
            borderRadius: '8px' 
          }}
        />
      </div>
    );
  }

  return (
    <div className="task-split-result-view bg-slate-900 rounded-xl p-6 mb-4 animate-fadeIn shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <Title level={4} style={{ color: '#f8fafc', margin: 0, fontWeight: 600 }}>
          {getMessage('taskSplitResultTitle')}
        </Title>
        <div className="flex items-center">
          {saving && (
            <span style={{ color: '#60a5fa', marginRight: '10px', fontSize: '14px' }}>
              Saving changes...
            </span>
          )}
          <Tooltip title={getMessage('taskSplitResultHelp') || 'Task breakdown and analysis'}>
            <InfoCircleOutlined style={{ color: '#60a5fa', fontSize: '18px' }} />
          </Tooltip>
        </div>
      </div>
      
      <Collapse 
        activeKey={activeKey}
        onChange={(keys) => setActiveKey(keys as string[])}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: '#0ea5e9' }} />}
        className="bg-transparent border-0 shadow-none"
        ghost
      >
        {/* 原始任务 */}
        <Panel 
          header={
            <div style={panelHeaderStyle} className="flex items-center">
              <FileTextOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                {getMessage('originalTask')}
              </span>
            </div>
          } 
          key="1"
          className="mb-4"
        >
          <Card bordered={false} style={cardStyle} className="rounded-lg overflow-hidden">
            <div className="flex items-center mb-3">
              <Title level={5} style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '0', flex: 1 }} editable={{
                onChange: (value) => updateOriginalTask('title', value),
                tooltip: 'Click to edit title',
                icon: <EditOutlined style={{ color: '#0ea5e9' }} />,
              }}>
                {parsedResult.original_task.title}
              </Title>
            </div>
            <Paragraph 
              style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '14px' }} 
              editable={{
                onChange: (value) => updateOriginalTask('description', value),
                tooltip: 'Click to edit description',
                icon: <EditOutlined style={{ color: '#0ea5e9' }} />,
              }}
            >
              {parsedResult.original_task.description}
            </Paragraph>
          </Card>
        </Panel>
        
        {/* 分析结果 */}
        <Panel 
          header={
            <div style={panelHeaderStyle} className="flex items-center">
              <NodeIndexOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                {getMessage('taskAnalysis')}
              </span>
            </div>
          } 
          key="2"
          className="mb-4"
        >
          <Card bordered={false} style={cardStyle} className="rounded-lg overflow-hidden">
            <Paragraph 
              style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '14px' }}
              editable={{
                onChange: updateAnalysis,
                tooltip: 'Click to edit analysis',
                icon: <EditOutlined style={{ color: '#0ea5e9' }} />,
              }}
            >
              {parsedResult.analysis}
            </Paragraph>
          </Card>
        </Panel>
        
        {/* 子任务列表 */}
        <Panel 
          header={
            <div style={panelHeaderStyle} className="flex items-center">
              <BranchesOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                {getMessage('subTasks')} 
                <Badge 
                  count={parsedResult.tasks_count || parsedResult.tasks?.length || 0} 
                  style={{ backgroundColor: '#0ea5e9', marginLeft: '8px' }} 
                />
              </span>
            </div>
          } 
          key="3"
          className="mb-4"
        >
          {parsedResult.tasks && parsedResult.tasks.length > 0 ? (
            <List
              dataSource={parsedResult.tasks}
              itemLayout="vertical"
              split={false}
              className="space-y-4"
              renderItem={(task, index) => (
                <List.Item className="p-0">
                  <Card 
                    bordered={false}
                    className="rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl"
                    style={cardStyle}
                    title={
                      <div className="flex justify-between items-center py-1">
                        <div className="flex items-center">
                          <Badge 
                            count={index + 1} 
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
                            }}
                          >
                            {task.title}
                          </Text>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Tooltip title="Click to change priority">
                            <Select
                              value={task.priority}
                              style={{ width: 70 }}
                              bordered={false}
                              dropdownStyle={{ backgroundColor: '#1e293b', color: '#f8fafc' }}
                              onChange={(value) => updateTaskData(index, 'priority', value)}
                              options={[
                                { value: 'P0', label: 'P0' },
                                { value: 'P1', label: 'P1' },
                                { value: 'P2', label: 'P2' },
                                { value: 'P3', label: 'P3' },
                              ]}
                              suffixIcon={null}
                              className="priority-select"
                            >
                            </Select>
                          </Tooltip>
                          <Tooltip title="Click to edit estimate">
                            <Input
                              prefix={<ClockCircleOutlined style={{ color: '#0ea5e9' }} />}
                              value={task.estimate}
                              onChange={(e) => updateTaskData(index, 'estimate', e.target.value)}
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
                          {task.references.map((ref, idx) => (
                            <Input
                              key={idx}
                              value={ref}
                              onChange={(e) => updateArrayField(index, 'references', idx, e.target.value)}
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
                    
                    {task.steps && task.steps.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center mb-3">
                          <NodeIndexOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
                          <Text style={{ color: '#0ea5e9', fontWeight: 500 }}>
                            {getMessage('implementationSteps')}
                          </Text>
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
                          {task.steps.map((step, stepIdx) => (
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
                                    setParsedResult({
                                      ...parsedResult,
                                      tasks: newTasks
                                    });
                                    saveData({
                                      ...parsedResult,
                                      tasks: newTasks
                                    });
                                  }}
                                  style={{ 
                                    position: 'absolute', 
                                    right: '-30px', 
                                    top: '0', 
                                    color: '#ef4444' 
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                          <Button 
                            type="dashed" 
                            icon={<PlusOutlined />} 
                            onClick={() => {
                              const newSteps = [...task.steps, ''];
                              const newTasks = [...parsedResult.tasks];
                              newTasks[index] = {
                                ...task,
                                steps: newSteps
                              };
                              setParsedResult({
                                ...parsedResult,
                                tasks: newTasks
                              });
                              saveData({
                                ...parsedResult,
                                tasks: newTasks
                              });
                            }}
                            style={{ 
                              borderColor: '#0ea5e9', 
                              color: '#0ea5e9',
                              marginTop: '8px',
                              width: '100%'
                            }}
                          >
                            添加步骤
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center mb-3">
                          <CheckCircleOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
                          <Text style={{ color: '#0ea5e9', fontWeight: 500 }}>
                            {getMessage('acceptanceCriteria')}
                          </Text>
                        </div>
                        <div className="space-y-2">
                          {task.acceptance_criteria.map((criteria, criteriaIdx) => (
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
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span className="text-gray-400">{getMessage('noSubTasks')}</span>}
            />
          )}
        </Panel>
        
        {/* 依赖关系 */}
        {parsedResult.dependencies && parsedResult.dependencies.length > 0 && (
          <Panel 
            header={
              <div style={panelHeaderStyle} className="flex items-center">
                <LinkOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                  {getMessage('taskDependencies')}
                </span>
              </div>
            } 
            key="4"
            className="mb-4"
          >
            <List
              dataSource={parsedResult.dependencies}
              split={false}
              className="space-y-4"
              renderItem={(dep, index) => (
                <List.Item className="p-0">
                  <Card 
                    bordered={false}
                    className="rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl" 
                    style={cardStyle}
                    bodyStyle={{ padding: '16px' }}
                  >
                    <div>
                      <div className="flex items-center mb-3">
                        <Badge 
                          status="processing" 
                          color="#0ea5e9" 
                          style={{ marginRight: '8px' }} 
                        />
                        <Text 
                          style={{ color: '#f8fafc', fontWeight: 600 }}
                          editable={{
                            onChange: (value) => updateDependency(index, 'task', value),
                            tooltip: 'Click to edit task',
                            icon: <EditOutlined style={{ color: '#0ea5e9' }} />,
                          }}
                        >
                          {dep.task}
                        </Text>
                      </div>
                      <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                        {getMessage('dependsOn')}:
                      </Text>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {dep.depends_on.map((depTask, idx) => (
                          <Input
                            key={idx}
                            value={depTask}
                            onChange={(e) => updateDependencyItem(index, idx, e.target.value)}
                            style={{ 
                              backgroundColor: '#0f172a',
                              color: '#0ea5e9',
                              border: '1px solid #0ea5e9',
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
                  </Card>
                </List.Item>
              )}
            />
          </Panel>
        )}
      </Collapse>
    </div>
  );
};

export default TaskSplitResultView; 