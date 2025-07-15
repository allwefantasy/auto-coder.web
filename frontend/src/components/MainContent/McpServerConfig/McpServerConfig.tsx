import React from 'react';
import { Tabs } from 'antd';
import { getMessage } from '../../../lang';
import MCPMarketplace from './MCPMarketplace'; // Renamed import
import ManuallyAddMCPServer from './ManuallyAddMCPServer';
import MCPInstalled from './MCPInstalled'; // Renamed import
import './McpServerConfig.css';
import '../../../styles/custom_antd.css'; // Ensure shared dark theme styles are applied

const { TabPane } = Tabs;

const McpServerConfig: React.FC = () => {
  return (
    <div className="mcp-server-container p-4 h-full overflow-y-auto">
      <Tabs defaultActiveKey="installed" className="settings-tabs dark-tabs">
        <TabPane
          tab={<span className="text-gray-300">{getMessage('installed') || 'Installed'}</span>}
          key="installed"
        >
          <MCPInstalled /> {/* Renamed component usage */}
        </TabPane>
        <TabPane
          tab={<span className="text-gray-300">{getMessage('marketplace') || 'Marketplace'}</span>}
          key="marketplace"
        >
          <MCPMarketplace /> {/* Renamed component usage */}
        </TabPane>
        <TabPane
          tab={<span className="text-gray-300">{getMessage('manualInstall') || 'Manual Add to Marketplace'}</span>}
          key="manual"
        >
          <ManuallyAddMCPServer />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default McpServerConfig;
