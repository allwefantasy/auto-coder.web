import React from 'react';
import { Card, Typography, Collapse } from 'antd';
import { NodeIndexOutlined, EditOutlined } from '@ant-design/icons';
import { getMessage } from '../../Sidebar/lang';

const { Panel } = Collapse;
const { Paragraph } = Typography;

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

interface TaskAnalysisPanelProps {
  analysis: string;
  updateAnalysis: (value: string) => void;
}

const TaskAnalysisPanel: React.FC<TaskAnalysisPanelProps> = ({
  analysis,
  updateAnalysis
}) => {

  return (
      <Card bordered={false} style={cardStyle} className="rounded-lg overflow-hidden">
        <Paragraph 
          style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '14px' }}
          editable={{
            onChange: updateAnalysis,
            tooltip: 'Click to edit analysis',
            icon: <EditOutlined style={{ color: '#0ea5e9' }} />,
          }}
        >
          {analysis}
        </Paragraph>
      </Card>

  );
};

export default TaskAnalysisPanel;
