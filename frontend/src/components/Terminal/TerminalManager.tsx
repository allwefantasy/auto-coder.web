import React, { useState, useEffect } from 'react';
import Terminal from './Terminal';
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { Tooltip, Dropdown, Menu, Modal } from 'antd';
import { getMessage } from '../../lang';

interface TerminalTab {
  id: string;
  name: string;
}

const TerminalManager: React.FC = () => {
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: '1', name: `${getMessage('terminal')} 1` }
  ]);
  
  // 在组件挂载时触发resize事件
  // 注释掉，暂时没发现这里去掉后有什么影响，其他监听的都有自己的完整的监听卸载事件
  // useEffect(() => {
  //   const handleResize = () => {
  //     window.dispatchEvent(new Event('resize'));
  //   };
  //   handleResize(); // 初始化时触发一次
  //   window.addEventListener('resize', handleResize);
  //   return () => window.removeEventListener('resize', handleResize);
  // }, []);
  const [activeTerminal, setActiveTerminal] = useState<string>('1');
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);

  const addTerminal = () => {
    const newId = String(terminals.length + 1);
    setTerminals([...terminals, { id: newId, name: `${getMessage('terminal')} ${newId}` }]);
    setActiveTerminal(newId);
  };

  const removeTerminal = (id: string) => {
    if (terminals.length > 1) {
      const newTerminals = terminals.filter(t => t.id !== id);
      setTerminals(newTerminals);
      if (activeTerminal === id) {
        setActiveTerminal(newTerminals[0].id);
      }
    }
  };

  const renameTerminal = (id: string, newName: string) => {
    setTerminals(terminals.map(t => 
      t.id === id ? { ...t, name: newName } : t
    ));
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Terminal */}
      <div className="h-full flex-grow" style={{ minWidth: '400px' }}>
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            className={`h-full ${activeTerminal === terminal.id ? 'block' : 'hidden'}`}
          >
            <Terminal />
          </div>
        ))}
      </div>

      {/* Right Panel - Terminal Management */}
      <div className="bg-gray-900 flex flex-col" style={{ width: '20%', minWidth: '150px' }}>
        <div className="p-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Tooltip title={getMessage('newTerminal')}>
                <button 
                  onClick={addTerminal}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                >
                  <PlusOutlined style={{ fontSize: '14px' }} />
                </button>
              </Tooltip>
              <Tooltip title={getMessage('terminalSettings')}>
                <button 
                  onClick={() => setIsSettingsVisible(true)}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                >
                  <SettingOutlined style={{ fontSize: '14px' }} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer 
                ${activeTerminal === terminal.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              onClick={() => setActiveTerminal(terminal.id)}
            >
              <input 
                className={`text-xs truncate bg-transparent outline-none w-full ${
                  activeTerminal === terminal.id ? 'text-white' : 'text-gray-400'
                }`}
                value={terminal.name}
                onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
                onChange={(e) => renameTerminal(terminal.id, (e.target as HTMLInputElement).value)}
                onBlur={(e) => {
                  if (!(e.target as HTMLInputElement).value.trim()) {
                    renameTerminal(terminal.id, `${getMessage('terminal')} ${terminal.id}`);
                  }
                }}
              />
              {terminals.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTerminal(terminal.id);
                  }}
                  className={`p-1 rounded hover:bg-gray-600 
                    ${activeTerminal === terminal.id ? 'text-gray-300' : 'invisible group-hover:visible'}`}
                >
                  <DeleteOutlined style={{ fontSize: '11px' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        title={getMessage('terminalSettings')}
        open={isSettingsVisible}
        onCancel={() => setIsSettingsVisible(false)}
        footer={null}
        className="dark-theme-modal"
      >
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">{getMessage('shellConfiguration')}</h3>
            <select className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-2">
              <option value="bash">{getMessage('bash')}</option>
              <option value="zsh">{getMessage('zsh')}</option>
              <option value="powershell">{getMessage('powershell')}</option>
            </select>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">{getMessage('fontSize')}</h3>
            <input
              type="number"
              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-2"
              defaultValue={14}
              min={8}
              max={24}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TerminalManager;