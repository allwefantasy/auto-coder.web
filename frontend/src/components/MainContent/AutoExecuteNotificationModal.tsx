import React from 'react';
import { Modal, Result, Button, Spin } from 'antd';
import { RocketOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { getMessage } from '../../lang';

interface AutoExecuteNotificationModalProps {
  visible: boolean;
  todo: {
    id: string;
    title: string;
  } | null;
  onClose: () => void;
  onConfirm?: () => void;
  isExecuting: boolean;
  confirmMode: boolean;
}

const AutoExecuteNotificationModal: React.FC<AutoExecuteNotificationModalProps> = ({
  visible,
  todo,
  onClose,
  onConfirm,
  isExecuting,
  confirmMode = true
}) => {
  // 根据模式决定图标和内容
  const getIcon = () => {
    if (isExecuting) {
      return <Spin size="large" />;
    } else if (confirmMode) {
      return <QuestionCircleOutlined style={{ color: '#faad14' }} />;
    } else {
      return <RocketOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // 根据模式决定副标题
  const getSubtitle = () => {
    if (isExecuting) {
      return getMessage('taskExecutingMessage');
    } else if (confirmMode) {
      return getMessage('taskConfirmExecuteMessage');
    } else {
      return getMessage('taskAutoExecuteMessage');
    }
  };

  // 根据模式决定底部描述
  const getDescription = () => {
    if (!isExecuting && confirmMode) {
      return getMessage('taskConfirmExecuteDescription');
    } else if (!isExecuting) {
      return getMessage('taskAutoExecuteDescription');
    }
    return null;
  };

  // 简单关闭弹窗，不恢复任务状态
  const handleSimpleClose = () => {
    // 仅关闭弹窗，不改变任务状态
    if (confirmMode) {
      // 确认模式时使用onClose处理取消操作（会恢复任务状态）
      onClose();
    } else {
      // 非确认模式时仅关闭弹窗
      document.dispatchEvent(new CustomEvent('closeExecuteModal'));
    }
  };

  // 根据模式决定底部按钮
  const getFooterButtons = () => {
    if (isExecuting) {
      return [
        <Button 
          key="close" 
          onClick={handleSimpleClose} 
          disabled={true}
          className="bg-gray-700 border-none text-gray-400"
        >
          {getMessage('close')}
        </Button>
      ];
    } else if (confirmMode) {
      return [
        <Button 
          key="cancel" 
          onClick={onClose}  // 点击取消时，会触发onClose恢复任务状态
          className="bg-gray-700 hover:bg-gray-600 border-none text-gray-200"
        >
          {getMessage('cancel')}
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={onConfirm}
          className="bg-blue-600 hover:bg-blue-700 border-none"
        >
          {getMessage('confirm')}
        </Button>
      ];
    } else {
      return [
        <Button 
          key="close" 
          onClick={handleSimpleClose}  // 这里使用简单关闭，不恢复任务状态
          className="bg-gray-700 hover:bg-gray-600 border-none text-gray-200"
        >
          {getMessage('close')}
        </Button>
      ];
    }
  };

  return (
    <Modal
      title={getMessage('taskAutoExecuteTitle')}
      open={visible}
      onCancel={!isExecuting ? handleSimpleClose : undefined}
      footer={getFooterButtons()}
      closable={!isExecuting}
      maskClosable={!isExecuting}
      className="dark-theme-modal"
      styles={{
        content: {
          backgroundColor: '#1f2937',
          padding: '20px',
        },
        header: {
          backgroundColor: '#1f2937',
          borderBottom: '1px solid #374151',
        },
        body: {
          backgroundColor: '#1f2937',
        }
      }}
      width={500}
    >
      <Result
        icon={getIcon()}
        title={<span className="text-gray-200">
          {todo?.title}
        </span>}
        subTitle={<span className="text-gray-400">
          {getSubtitle()}
        </span>}
        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
      />
      {getDescription() && (
        <div className="mt-4 text-gray-400 text-sm">
          <p>{getDescription()}</p>
        </div>
      )}
    </Modal>
  );
};

export default AutoExecuteNotificationModal; 