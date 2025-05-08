import React from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../../components/Sidebar/lang';
import './MessageStyles.css';
import eventBus, { EVENTS } from '../../../services/eventBus';
import { FilterByCommitEventData } from '../../../services/event_bus_data';
import { message as antMessage } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface AgenticEditApplyPreChangesProps {
  message: MessageProps;
}

const AgenticEditApplyPreChanges: React.FC<AgenticEditApplyPreChangesProps> = ({ message }) => {
  let have_commit = false;
  let commitHash = '';
  let diffFileNum = 0;
  let eventFile = '';
  const action_file = message.metadata?.action_file;

  try {
    const parsed = JSON.parse(message.content || '{}');
    commitHash = parsed.commit_hash || '';
    diffFileNum = parsed.diff_file_num || 0;
    eventFile = parsed.event_file || '';
    have_commit = parsed.have_commit || false;
  } catch (e) {
    console.error('Failed to parse apply changes content:', e);
  }
  
  // 处理commit hash点击
  const handleCommitClick = () => {
    if (!commitHash) return;
    
    // 先切换到历史面板
    eventBus.publish(EVENTS.UI.ACTIVATE_PANEL, 'history');
    
    // 然后发送过滤事件
    eventBus.publish(EVENTS.HISTORY.FILTER_BY_COMMIT, new FilterByCommitEventData(commitHash));
  };

  // 复制完整commit hash到剪贴板
  const copyCommitHash = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发handleCommitClick
    if (!commitHash) return;
    
    navigator.clipboard.writeText(commitHash)
      .then(() => {
        antMessage.success(getMessage('commitIdCopied') || 'Commit ID copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy commit ID:', err);
        antMessage.error(getMessage('failedToCopyCommitId') || 'Failed to copy commit ID');
      });
  };

  return (
    <div className="message-font text-xs">      
      <div className="mt-1 p-1.5 bg-gray-800 rounded-md text-xs">
        <div className="text-gray-300">
         {getMessage('manualChangesCommited')}
        </div>
        
        {have_commit && commitHash && (
          <div className="mt-1 pt-1 border-t border-gray-700">
            <div className="flex items-center">
              <span className="text-gray-400 text-xs">{getMessage('commitId')}:</span>
              <span 
                className="ml-1 font-mono text-blue-300 text-xs cursor-pointer hover:text-blue-400 hover:underline"
                onClick={handleCommitClick}
                title={getMessage('clickToFilterHistory')}
              >
                {commitHash.length > 8 ? commitHash.substring(0, 8) + '...' : commitHash}
              </span>
              <button 
                className="ml-1 text-gray-400 hover:text-blue-400 focus:outline-none" 
                onClick={copyCommitHash}
                title={getMessage('copyFullCommitId') || 'Copy full commit ID'}
              >
                <CopyOutlined style={{ fontSize: '12px' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgenticEditApplyPreChanges;
