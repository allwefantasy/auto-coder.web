import React from 'react';
import { Tabs } from 'antd';
import { getMessage } from '../../Sidebar/lang';
import MarketplaceTab from './MarketplaceTab';
import ManualInstallTab from './ManualInstallTab';
import InstalledTab from './InstalledTab';
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
          <InstalledTab />
        </TabPane>
        <TabPane
          tab={<span className="text-gray-300">{getMessage('marketplace') || 'Marketplace'}</span>}
          key="marketplace"
        >
          <MarketplaceTab />
        </TabPane>
        <TabPane
          tab={<span className="text-gray-300">{getMessage('manualInstall') || 'Manual Install'}</span>}
          key="manual"
        >
          <ManualInstallTab />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default McpServerConfig;