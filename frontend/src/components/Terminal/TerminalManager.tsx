import React, { useState } from 'react';
import Terminal from './Terminal';
import Split from 'react-split';
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { Tooltip, Dropdown, Menu, Modal } from 'antd';

interface TerminalTab {
  id: string;
  name: string;
}

const TerminalManager: React.FC = () => {
  // Add CSS classes for height inheritance
  const splitStyles = {
    height: '100%',
    display: 'flex',
  };
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: '1', name: 'Terminal 1' }
  ]);
  const [activeTerminal, setActiveTerminal] = useState<string>('1');
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);

  const addTerminal = () => {
    const newId = String(terminals.length + 1);
    setTerminals([...terminals, { id: newId, name: `Terminal ${newId}` }]);
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
    <Split
      className="flex"
      sizes={[80, 20]}
      minSize={[400, 150]}
      gutterSize={4}
      cursor="col-resize"
      style={splitStyles}
    >
      {/* Left Panel - Terminal Management */}
      {/* Left Panel - Active Terminal */}
      <div className="h-full">
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
      <div className="bg-gray-900 flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Tooltip title="New Terminal">
                <button 
                  onClick={addTerminal}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                >
                  <PlusOutlined style={{ fontSize: '14px' }} />
                </button>
              </Tooltip>
              <Tooltip title="Terminal Settings">
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
                    renameTerminal(terminal.id, `Terminal ${terminal.id}`);
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
        title="Terminal Settings"
        open={isSettingsVisible}
        onCancel={() => setIsSettingsVisible(false)}
        footer={null}
        className="dark-theme-modal"
      >
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Shell Configuration</h3>
            <select className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-2">
              <option value="bash">Bash</option>
              <option value="zsh">Zsh</option>
              <option value="powershell">PowerShell</option>
            </select>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Font Size</h3>
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
    </Split>
  );
};

export default TerminalManager;