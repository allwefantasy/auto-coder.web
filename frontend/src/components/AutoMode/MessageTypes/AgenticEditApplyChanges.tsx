import React from 'react';
import type { MessageProps } from '../MessageList';
import { getMessage } from '../../../lang';
import './MessageStyles.css';
import eventBus, { EVENTS } from '../../../services/eventBus';
import { FilterByCommitEventData } from '../../../services/event_bus_data';
import { message as antMessage } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface AgenticEditApplyChangesProps {
  message: MessageProps;
}

const AgenticEditApplyChanges: React.FC<AgenticEditApplyChangesProps> = ({ message }) => {
  let commitHash = '';
  let diffFileNum = 0;
  let eventFile = '';
  let haveCommit = false;
  const action_file = message.metadata?.action_file;

  try {
    const parsed = JSON.parse(message.content || '{}');
    commitHash = parsed.commit_hash || '';
    diffFileNum = parsed.diff_file_num || 0;
    eventFile = parsed.event_file || '';
    haveCommit = parsed.have_commit !== false; // Default to true if not specified
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
        <>
          <div className="message-title flex items-center py-1 px-2">
            <span className="message-title-icon">
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
            <span className="message-title-text ml-0.5 text-green-400 font-semibold text-xs">
              {getMessage('codeChangesCommitted')}
            </span>
          </div>

          <div className="mt-1 p-1.5 bg-gray-800 rounded-md text-xs">
            <div className="flex items-center mb-1">
              <span className="text-gray-300 text-xs">{getMessage('commitId')}:</span>
              <span 
                className="ml-1 font-mono text-green-300 text-xs cursor-pointer hover:text-green-400 hover:underline"
                onClick={handleCommitClick}
                title={getMessage('clickToFilterHistory')}
              >
                {commitHash.length > 8 ? commitHash.substring(0, 8) + '...' : commitHash}
              </span>
              <button 
                className="ml-1 text-gray-400 hover:text-green-400 focus:outline-none" 
                onClick={copyCommitHash}
                title={getMessage('copyFullCommitId') || 'Copy full commit ID'}
              >
                <CopyOutlined style={{ fontSize: '12px' }} />
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-gray-300 text-xs">{getMessage('modifiedFiles')}:</span>
              <span className="ml-1 text-green-300 text-xs">{diffFileNum}</span>
            </div>
          </div>
        </>
    </div>
  );
};

export default AgenticEditApplyChanges;
