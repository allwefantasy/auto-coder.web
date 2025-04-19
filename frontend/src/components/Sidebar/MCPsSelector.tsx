import React, { useState, useEffect } from 'react';
import EventBus, { EVENTS } from '../../services/eventBus';
import { Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import './ragSelectorStyles.css'; // Reusing styles

const MCPsSelector: React.FC = () => {
  // 用于跟踪MCPs是否启用的状态
  const [enableMCPs, setEnableMCPs] = useState<boolean>(false);

  // 初始加载时可以考虑从某个地方（如localStorage或API）获取初始状态
  // useEffect(() => {
  //   const initialStatus = localStorage.getItem('mcpEnabled') === 'true';
  //   setEnableMCPs(initialStatus);
  //   // Publish initial state if needed, or let ChatPanel fetch it
  // }, []);

  const toggleMCPs = () => {
    const newValue = !enableMCPs;
    setEnableMCPs(newValue);
    // 可以选择将状态持久化，例如存入 localStorage
    // localStorage.setItem('mcpEnabled', newValue.toString());
    // 发布状态变更事件
    EventBus.publish(EVENTS.MCPS.ENABLED_CHANGED, newValue);
  };

  return (
    <div className="w-full mb-0">
      <div className="flex items-center justify-between h-5">
        <Tooltip title={enableMCPs ? "Disable Multi-Agent Collaboration Pattern" : "Enable Multi-Agent Collaboration Pattern"}>
          <div
            className="flex items-center cursor-pointer hover:text-green-400"
            onClick={toggleMCPs}
          >
            <SettingOutlined
              className={`mr-1 ${enableMCPs ? 'text-green-400 animate-spin-slow' : 'text-gray-400'}`}
              style={{ fontSize: '11px' }}
            />
            <span className={`text-xxs truncate ${enableMCPs ? 'text-green-400' : 'text-gray-400'}`}>
              MCPs Provider
            </span>
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default MCPsSelector;