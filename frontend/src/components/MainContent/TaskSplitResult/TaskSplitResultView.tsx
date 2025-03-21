import React, { useState, useEffect } from 'react';
import { JsonExtractor } from '../../../services/JsonExtractor';
import axios from 'axios';
import { Collapse, Typography, Alert, Tooltip, message as AntMessage, Badge } from 'antd';
import { getMessage } from '../../Sidebar/lang';
import { CaretRightOutlined, InfoCircleOutlined, NodeIndexOutlined, BranchesOutlined, LinkOutlined } from '@ant-design/icons';

// Import sub-components
import TaskAnalysisPanel from './TaskAnalysisPanel';
import SubTasksPanel from './SubTasksPanel';
import TaskDependenciesPanel from './TaskDependenciesPanel';

// Import types
import { TaskSplitResult, TaskSplitResultViewProps, SubTask, TaskReference } from './types';

const { Title } = Typography;

const TaskSplitResultView: React.FC<TaskSplitResultViewProps> = ({ visible, result, todoId }) => {
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
        let parsedData;
        if (typeof result === 'string') {
          parsedData = JsonExtractor.extract(result) || {};
        } else {
          parsedData = result;
        }
        
        // 确保每个任务都有id字段
        if (parsedData.tasks && Array.isArray(parsedData.tasks)) {
          parsedData.tasks = parsedData.tasks.map((task: SubTask, index: number) => ({
            ...task,
            id: task.id !== undefined ? task.id : index // 如果没有id，使用索引作为id
          }));
        }
        
        setParsedResult(parsedData);
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
    if (!updatedResult) {
      console.log('saveData: No data provided to save');
      return;
    }
    
    console.log('saveData: Starting save operation', { updatedResult });
    setSaving(true);
    try {
      // Get todoId from the result object itself
      if (!todoId) {
        console.error('saveData: No todoId found in result object');
        throw new Error('No todoId found in result');
      }
      
      // 准备更新数据 - 只发送与后端模型一致的字段
      const updateData = {
        tasks: updatedResult.tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          references: task.references,
          steps: task.steps,
          acceptance_criteria: task.acceptance_criteria,
          priority: task.priority,
          estimate: task.estimate,
          status: task.status || 'pending'
        })),
        analysis: updatedResult.analysis,
        dependencies: updatedResult.dependencies
      };
      console.log('saveData: Prepared update data', { updateData });
      
      // 调用API保存数据
      console.log(`saveData: Sending PUT request to /api/todos/${todoId}`);
      const response = await axios.put(`/api/todos/${todoId}`, updateData);
      console.log('saveData: Received response', { 
        status: response.status, 
        statusText: response.statusText,
        data: response.data
      });
      
      if (response.status !== 200) {
        console.error('saveData: API returned non-200 status', { 
          status: response.status, 
          statusText: response.statusText 
        });
        throw new Error(`Failed to save changes: ${response.statusText}`);
      }
      
      console.log('saveData: Changes saved successfully');
      AntMessage.success('Changes saved successfully');
    } catch (error) {
      console.error('saveData: Error saving changes:', error);
      if (axios.isAxiosError(error)) {
        console.error('saveData: Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      }
      AntMessage.error(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('saveData: Operation complete');
      setSaving(false);
    }
  };
  
  // 更新任务数据
  const updateTaskData = (taskIndex: number, field: string | number | symbol, value: any) => {
    if (!parsedResult) return;
    
    const updatedResult = { ...parsedResult };
    const updatedTasks = [...updatedResult.tasks];
    // Use type assertion to safely update the field
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      ...(({ [field]: value } as any))
    };
    updatedResult.tasks = updatedTasks;
    
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };
  
  // 更新数组类型的字段
  const updateArrayField = (taskIndex: number, field: string | number | symbol, itemIndex: number, value: string) => {
    if (!parsedResult) return;
    
    const updatedResult = { ...parsedResult };
    const updatedTasks = [...updatedResult.tasks];
    // Use type assertion to safely access the field
    const currentArray = [...((updatedTasks[taskIndex] as any)[field] as string[])];
    currentArray[itemIndex] = value;
    
    // Use type assertion to safely update the field
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      ...(({ [field]: currentArray } as any))
    };
    
    updatedResult.tasks = updatedTasks;
    setParsedResult(updatedResult);
    saveData(updatedResult);
  };
  
  // 原始任务更新函数已移除
  
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
        {/* 原始任务部分已移除 */}
        
        {/* 分析结果 - Panel key="2" */}
        <Collapse.Panel 
          header={
            <div style={{ background: '#0f172a', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', borderLeft: '3px solid #0ea5e9' }} className="flex items-center">
              <NodeIndexOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                {getMessage('taskAnalysis')}
              </span>
            </div>
          } 
          key="2"
          className="mb-4"
        >
          <TaskAnalysisPanel 
            analysis={parsedResult.analysis}
            updateAnalysis={updateAnalysis}
          />
        </Collapse.Panel>
        
        {/* 子任务列表 - Panel key="3" */}
        <Collapse.Panel 
          header={
            <div style={{ background: '#0f172a', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', borderLeft: '3px solid #0ea5e9' }} className="flex items-center">
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
          <SubTasksPanel 
            tasks={parsedResult.tasks}
            tasksCount={parsedResult.tasks_count || parsedResult.tasks?.length || 0}
            updateTaskData={updateTaskData}
            updateArrayField={updateArrayField}
            saveData={saveData}
            parsedResult={parsedResult}
            setParsedResult={setParsedResult}
          />
        </Collapse.Panel>
        
        {/* 依赖关系 - Panel key="4" */}
        {parsedResult.dependencies && parsedResult.dependencies.length > 0 && (
          <Collapse.Panel 
            header={
              <div style={{ background: '#0f172a', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', borderLeft: '3px solid #0ea5e9' }} className="flex items-center">
                <LinkOutlined style={{ color: '#0ea5e9', marginRight: '8px' }} />
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                  {getMessage('taskDependencies')}
                </span>
              </div>
            } 
            key="4"
            className="mb-4"
          >
            <TaskDependenciesPanel 
              dependencies={parsedResult.dependencies}
              updateDependency={updateDependency}
              updateDependencyItem={updateDependencyItem}
            />
          </Collapse.Panel>
        )}
      </Collapse>
    </div>
  );
};

export default TaskSplitResultView; 