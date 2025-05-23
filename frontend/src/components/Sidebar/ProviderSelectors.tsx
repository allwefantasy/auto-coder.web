import React, { useState } from 'react';
import RagSelector from './RagSelector';
import MCPsSelector from './MCPsSelector';
import CodeModelSelector from './CodeModelSelector';
import LibSelector from './LibSelector';
import { Tabs } from 'antd';
import { CodeOutlined, ApiOutlined, DatabaseOutlined, BookOutlined } from '@ant-design/icons';
import './ProviderSelectors.css';

interface ProviderSelectorsProps {
    isWriteMode: boolean;
}

const ProviderSelectors: React.FC<ProviderSelectorsProps> = ({ isWriteMode }) => {
  // 默认选中"代码模型"标签
  const [activeKey, setActiveKey] = useState<string>("code-model");
  
  // 创建标签项
  const items = [
    {
      key: 'code-model',
      label: (
        <span className="flex items-center text-xs">
          <CodeOutlined className="mr-1" />
          代码模型
        </span>
      ),
      children: <CodeModelSelector />
    },
    // 仅在非写作模式下显示RAG选择器
    ...(isWriteMode ? [] : [{
      key: 'rag',
      label: (
        <span className="flex items-center text-xs">
          <DatabaseOutlined className="mr-1" />
          RAG
        </span>
      ),
      children: <RagSelector />
    }]),
    {
      key: 'mcps',
      label: (
        <span className="flex items-center text-xs">
          <ApiOutlined className="mr-1" />
          MCPs
        </span>
      ),
      children: <MCPsSelector />
    },
    {
      key: 'lib',
      label: (
        <span className="flex items-center text-xs">
          <BookOutlined className="mr-1" />
          LLM友好包
        </span>
      ),
      children: <LibSelector />
    }
  ];

  return (
    <div className="w-full px-1"> 
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items}
        size="small"
        tabBarStyle={{ margin: 0, border: 'none' }}
        tabBarGutter={8}
        animated={{ inkBar: true, tabPane: false }}
        className="provider-tabs"
      />
    </div>
  );
};

export default ProviderSelectors;