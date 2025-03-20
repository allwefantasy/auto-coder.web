import React, { useState, useEffect } from 'react';
import { Collapse, Card, Tag, List, Typography, Divider, Empty, Steps, Badge, Alert } from 'antd';
import { getMessage } from '../../Sidebar/lang';
import { CaretRightOutlined, FileTextOutlined, BranchesOutlined, NodeIndexOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

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

const getPriorityColor = (priority: string) => {
  const priorities: Record<string, string> = {
    'P0': 'red',
    'P1': 'orange',
    'P2': 'blue',
    'P3': 'gray',
  };
  return priorities[priority] || 'blue';
};

const TaskSplitResultView: React.FC<TaskSplitResultViewProps> = ({ visible, result }) => {
  const [activeKey, setActiveKey] = useState<string[]>(['1']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<TaskSplitResult | null>(null);

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

  if (!visible) {
    return null;
  }

  if (loading) {
    return (
      <div className="task-split-result-view bg-gray-800 rounded-lg p-4 mb-4">
        <div className="text-center py-4">
          <div className="loading-spinner"></div>
          <p className="text-gray-400 mt-2">{getMessage('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !parsedResult) {
    return (
      <div className="task-split-result-view bg-gray-800 rounded-lg p-4 mb-4">
        <Alert
          message={getMessage('errorTitle')}
          description={error || getMessage('noSplitResultData')}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="task-split-result-view bg-gray-800 rounded-lg p-4 mb-4 animate-fadeIn">
      <Title level={4} className="text-blue-300 mb-4">
        {getMessage('taskSplitResultTitle')}
      </Title>
      
      <Collapse 
        activeKey={activeKey}
        onChange={(keys) => setActiveKey(keys as string[])}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} className="text-blue-400" />}
        className="bg-gray-700 border-gray-600"
      >
        {/* 原始任务 */}
        <Panel 
          header={
            <span className="text-blue-200">
              <FileTextOutlined className="mr-2 text-blue-300" />
              {getMessage('originalTask')}
            </span>
          } 
          key="1"
          className="bg-gray-700 border-gray-600"
        >
          <Card className="bg-gray-800 border-gray-700">
            <Title level={5} className="text-blue-200">{parsedResult.original_task.title}</Title>
            <Paragraph className="text-gray-200">{parsedResult.original_task.description}</Paragraph>
          </Card>
        </Panel>
        
        {/* 分析结果 */}
        <Panel 
          header={
            <span className="text-blue-200">
              <NodeIndexOutlined className="mr-2 text-blue-300" />
              {getMessage('taskAnalysis')}
            </span>
          } 
          key="2"
          className="bg-gray-700 border-gray-600"
        >
          <Card className="bg-gray-800 border-gray-700">
            <Paragraph className="text-gray-200">{parsedResult.analysis}</Paragraph>
          </Card>
        </Panel>
        
        {/* 子任务列表 */}
        <Panel 
          header={
            <span className="text-blue-200">
              <BranchesOutlined className="mr-2 text-blue-300" />
              {getMessage('subTasks')} ({parsedResult.tasks_count || parsedResult.tasks?.length || 0})
            </span>
          } 
          key="3"
          className="bg-gray-700 border-gray-600"
        >
          {parsedResult.tasks && parsedResult.tasks.length > 0 ? (
            <List
              dataSource={parsedResult.tasks}
              renderItem={(task, index) => (
                <List.Item>
                  <Card 
                    title={
                      <div className="flex justify-between items-center">
                        <Badge status="processing" color="blue" text={
                          <Text className="text-blue-200">
                            #{index + 1}: {task.title}
                          </Text>
                        } />
                        <div className="flex items-center">
                          <Tag color={getPriorityColor(task.priority)} className="mr-2">
                            {task.priority}
                          </Tag>
                          <Tag icon={<ClockCircleOutlined />} color="default" className="bg-gray-700 text-gray-200">
                            {task.estimate}
                          </Tag>
                        </div>
                      </div>
                    }
                    className="w-full bg-gray-800 border-gray-700"
                  >
                    <Paragraph className="text-gray-200">{task.description}</Paragraph>
                    
                    {task.references && task.references.length > 0 && (
                      <>
                        <Divider orientation="left" className="text-blue-400 border-gray-600">
                          {getMessage('references')}
                        </Divider>
                        <div className="mb-4">
                          {task.references.map((ref, idx) => (
                            <Tag key={idx} className="mb-1 bg-gray-700 border-gray-600 text-blue-100">
                              {ref}
                            </Tag>
                          ))}
                        </div>
                      </>
                    )}
                    
                    {task.steps && task.steps.length > 0 && (
                      <>
                        <Divider orientation="left" className="text-blue-400 border-gray-600">
                          {getMessage('implementationSteps')}
                        </Divider>
                        <Steps 
                          direction="vertical" 
                          size="small" 
                          current={-1}
                          items={task.steps.map((step) => ({
                            title: <Text className="text-gray-200">{step}</Text>,
                            status: 'wait'
                          }))}
                          className="mb-4"
                        />
                      </>
                    )}
                    
                    {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
                      <>
                        <Divider orientation="left" className="text-blue-400 border-gray-600">
                          {getMessage('acceptanceCriteria')}
                        </Divider>
                        <List
                          size="small"
                          dataSource={task.acceptance_criteria}
                          renderItem={(criteria) => (
                            <List.Item className="text-gray-200 border-gray-700">
                              {criteria}
                            </List.Item>
                          )}
                          className="mb-2"
                        />
                      </>
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
              <span className="text-blue-200">
                <NodeIndexOutlined className="mr-2 text-blue-300" />
                {getMessage('taskDependencies')}
              </span>
            } 
            key="4"
            className="bg-gray-700 border-gray-600"
          >
            <List
              dataSource={parsedResult.dependencies}
              renderItem={(dep) => (
                <List.Item className="text-gray-200">
                  <Card className="w-full bg-gray-800 border-gray-700">
                    <div>
                      <Badge color="blue" text={<Text className="text-blue-200">{dep.task}</Text>} />
                      <Text className="text-gray-300 ml-2 mr-2">{getMessage('dependsOn')}</Text>
                      <div className="mt-2">
                        {dep.depends_on.map((depTask, idx) => (
                          <Tag key={idx} color="purple" className="mb-1 mr-1 text-blue-100">
                            {depTask}
                          </Tag>
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