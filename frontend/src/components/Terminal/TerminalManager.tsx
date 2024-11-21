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
      className="flex h-full"
      sizes={[80, 20]}
      minSize={[400, 150]}
      gutterSize={4}
      cursor="col-resize"
    >
      {/* Left Panel - Terminal Content */}
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
          {terminals.map((terminal) => {
            const [isEditing, setIsEditing] = useState(false);
            const [editName, setEditName] = useState(terminal.name);
            
            const handleDoubleClick = () => {
              setIsEditing(true);
            };
            
            const handleBlur = () => {
              setIsEditing(false);
              if (editName.trim()) {
                renameTerminal(terminal.id, editName);
              } else {
                setEditName(terminal.name);
              }
            };
            
            const handleKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                handleBlur();
              }
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditName(terminal.name);
              }
            };

            return (
              <div
                key={terminal.id}
                className={`group flex items-center justify-between px-3 py-2 cursor-pointer 
                  ${activeTerminal === terminal.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                onClick={() => setActiveTerminal(terminal.id)}
                onDoubleClick={handleDoubleClick}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="bg-gray-800 text-white text-sm px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm truncate">{terminal.name}</span>
                )}
                {terminals.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTerminal(terminal.id);
                    }}
                    className={`p-1 rounded hover:bg-gray-600 
                      ${activeTerminal === terminal.id ? 'text-gray-300' : 'invisible group-hover:visible'}`}
                  >
                    <DeleteOutlined style={{ fontSize: '12px' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
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