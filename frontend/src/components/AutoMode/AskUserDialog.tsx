import React, { useState, useEffect, useRef } from 'react';
import { getMessage } from '../Sidebar/lang';

// Define the Message interface directly or import it if it's shared
// Assuming Message structure needed by AskUserDialog
interface Message {
  id: string;
  type: string;
  content: string;
  options?: string[];
  eventId?: string;
  responseRequired?: boolean;
  // Add other fields from the original Message type if needed
}

interface AskUserDialogProps {
  message: Message;
  onResponse: (response: string, eventId?: string) => Promise<void>;
  onClose: () => void;
}

const AskUserDialog: React.FC<AskUserDialogProps> = ({ message, onResponse, onClose }) => {
  const [customResponse, setCustomResponse] = useState(''); // 存储用户自定义输入的响应
  const customResponseRef = useRef<HTMLInputElement>(null); // 自定义响应输入框引用
  const hasOptions = message.options && message.options.length > 0; // 检查是否有预定义选项
  
  // 对话框引用，用于检测点击外部区域
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // 处理点击对话框外部关闭对话框的逻辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if the click is outside the dialog and response is not required
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node) && !message.responseRequired) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [message.responseRequired, onClose]);
  
  // 处理自定义响应提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customResponse.trim()) {
      onResponse(customResponse, message.eventId);
    }
  };
  
  return (
    // 模态对话框背景 - 覆盖整个屏幕，半透明黑色
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* 对话框内容容器 - 优化边框和阴影 */}
      <div 
        ref={dialogRef}
        className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-5 border border-gray-600"
      >
        {/* 对话框标题和关闭按钮 - 更紧凑的标题区域 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{getMessage('askUserDialogTitle')}</h3>
          {/* Only show close button if response is not required */}
          {!message.responseRequired && (
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* 对话框主体内容 - 更紧凑的内容区域 */}
        <div className="mb-4">
          {/* 消息内容 - 优化文本样式 */}
          <p className="text-gray-200 mb-3 text-sm leading-relaxed">{message.content}</p>
          
          {/* 选项按钮区域 - 当有预定义选项时显示，更紧凑的按钮布局 */}
          {hasOptions && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.options!.map((option, index) => (
                <button
                  key={index}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-white text-sm transition-colors"
                  onClick={() => onResponse(option, message.eventId)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          
          {/* 自定义响应输入框 - 优化输入框样式 */}
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="flex items-center">
              <input
                ref={customResponseRef}
                type="text"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-l py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder={getMessage('askUserDialogPlaceholder')}
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-r text-sm transition-colors border-l-0 border border-indigo-600 disabled:opacity-50"
                disabled={!customResponse.trim()}
              >
                {getMessage('askUserDialogSend')}
              </button>
            </div>
          </form>
        </div>
        
        {/* 必须响应提示 - 当需要响应才能继续时显示，优化警告样式 */}
        {message.responseRequired && (
          <div className="text-xs text-amber-400 flex items-center bg-amber-900 bg-opacity-20 p-2 rounded">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{getMessage('askUserDialogResponseRequired')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AskUserDialog;