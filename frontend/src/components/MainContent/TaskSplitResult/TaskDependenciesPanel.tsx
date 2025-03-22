import React from 'react';
import { Collapse, Card, List, Typography, Badge, Input, Tooltip } from 'antd';
import { LinkOutlined, EditOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';
import { TaskReference, TaskDependenciesPanelProps } from './types';

const { Panel } = Collapse;
const { Text } = Typography;

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

const TaskDependenciesPanel: React.FC<TaskDependenciesPanelProps> = ({
  dependencies,
  updateDependency,
  updateDependencyItem,
  onDependencyBlur,
  onDependencyItemBlur
}) => {
  if (!dependencies || dependencies.length === 0) {
    return null;
  }

  return (
    <div>
      <List
        dataSource={dependencies}
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
                      onEnd: onDependencyBlur
                    }}
                  >
                    {dep.task}
                  </Text>
                </div>
                <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                  {getMessage('dependsOn')}:
                </Text>
                <div className="flex flex-wrap gap-2 mt-2">
                  {dep.depends_on.map((depTask: string, idx: number) => (
                    <Input
                      key={idx}
                      value={depTask}
                      onChange={(e) => updateDependencyItem(index, idx, e.target.value)}
                      onBlur={onDependencyItemBlur}
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
    </div>
  );
};

export default TaskDependenciesPanel;
