import React, { useState, useRef } from 'react';
import { Dropdown, Button, Tooltip, message as AntdMessage, Modal, Input } from 'antd';
import { MessageOutlined, PlusOutlined, DeleteOutlined, DownOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { getMessage } from './lang';

interface ChatListDropdownProps {
  chatListName: string;
  chatLists: string[];
  setChatListName: (name: string) => void;
  loadChatList: (name: string) => Promise<void>;
  setCurrentSessionName: (name: string) => Promise<boolean>;
  showNewChatModal: () => void;
  deleteChatList: (name: string) => Promise<void>;
  getChatTitle: () => string;
  renameChatList?: (oldName: string, newName: string) => Promise<boolean>;
}

const ChatListDropdown: React.FC<ChatListDropdownProps> = ({
  chatListName,
  chatLists,
  setChatListName,
  loadChatList,
  setCurrentSessionName,
  showNewChatModal,
  deleteChatList,
  getChatTitle,
  renameChatList = async () => false
}) => {
  const [showAllChats, setShowAllChats] = useState(false);
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState('');
  const inputRef = useRef<Input>(null);
  const MAX_DEFAULT_CHATS = 10;
  const MAX_TOTAL_CHATS = 100;
  const handleDeleteChat = async (name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除对话 "${name}" 吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteChatList(name);
        AntdMessage.success('对话已删除');
      },
    });
  };

  const startEditing = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingChat(name);
    setNewChatName(name);
    // 使用 setTimeout 确保在下一个渲染周期后聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingChat(null);
  };

  const handleRenameChat = async (oldName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!newChatName.trim()) {
      AntdMessage.error('对话名称不能为空');
      return;
    }

    if (newChatName === oldName) {
      setEditingChat(null);
      return;
    }

    if (chatLists.includes(newChatName)) {
      AntdMessage.error('已存在同名对话');
      return;
    }

    const success = await renameChatList(oldName, newChatName);
    if (success) {
      AntdMessage.success('对话已重命名');
      // 如果当前选中的是被重命名的对话，更新当前选中的对话名称
      if (chatListName === oldName) {
        setChatListName(newChatName);
        await setCurrentSessionName(newChatName);
      }
    } else {
      AntdMessage.error('重命名失败');
    }
    setEditingChat(null);
  };

  // 决定显示哪些聊天记录
  const visibleChatLists = showAllChats 
    ? chatLists.slice(0, MAX_TOTAL_CHATS) 
    : chatLists.slice(0, MAX_DEFAULT_CHATS);
  
  // 是否需要显示"更多"选项
  const hasMoreChats = chatLists.length > MAX_DEFAULT_CHATS;

  const chatListMenuItems = [
    {
      key: 'new-chat',
      label: (
        <div className="flex items-center w-full group text-white font-medium">
          <PlusOutlined className="mr-1" style={{ fontSize: '12px' }} />
          <span>新建对话</span>
        </div>
      ),
    },
    ...(visibleChatLists.length > 0 ? [{ type: 'divider' as const }] : []),
    ...visibleChatLists.map(name => ({
      key: name,
      label: (
        <div 
          className={`flex justify-between items-center w-full group ${chatListName === name ? 'bg-indigo-700/40 rounded-sm' : ''}`}
          onClick={(e) => {
            if (editingChat === name) {
              e.stopPropagation();
            }
          }}
        >
          {editingChat === name ? (
            <div className="flex items-center w-full" onClick={e => e.stopPropagation()}>
              <Input
                ref={inputRef}
                value={newChatName}
                onChange={e => setNewChatName(e.target.value)}
                onPressEnter={() => handleRenameChat(name)}
                size="small"
                className="mr-1 text-black"
                autoFocus
              />
              <Button 
                type="text" 
                size="small"
                className="text-green-500 p-0 flex items-center justify-center" 
                icon={<CheckOutlined />}
                onClick={e => handleRenameChat(name, e)}
              />
              <Button 
                type="text" 
                size="small"
                className="text-red-500 p-0 flex items-center justify-center" 
                icon={<CloseOutlined />}
                onClick={cancelEditing}
              />
            </div>
          ) : (
            <>
              <span className={`truncate max-w-[150px] ${chatListName === name ? 'text-white font-medium' : 'text-gray-200'}`}>{name}</span>
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  type="text" 
                  size="small" 
                  className="text-white p-0 mx-1 flex items-center justify-center" 
                  icon={<EditOutlined />}
                  onClick={e => startEditing(name, e)}
                />
                <Button 
                  type="text" 
                  size="small" 
                  className="text-white p-0 flex items-center justify-center" 
                  icon={<DeleteOutlined />}
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteChat(name);
                  }}
                />
              </div>
            </>
          )}
        </div>
      ),
    })),
    // 如果有更多聊天记录且当前未显示全部，则添加"更多"选项
    ...(hasMoreChats && !showAllChats ? [
      {
        key: 'show-more',
        label: (
          <div className="flex items-center justify-center w-full text-gray-300 hover:text-white py-1 border-t border-gray-700 mt-1">
            <DownOutlined className="mr-1" style={{ fontSize: '10px' }} />
            <span>显示更多 ({Math.min(chatLists.length - MAX_DEFAULT_CHATS, MAX_TOTAL_CHATS - MAX_DEFAULT_CHATS)})</span>
          </div>
        ),
      }
    ] : []),
    // 如果当前显示全部，则添加"收起"选项
    ...(showAllChats && hasMoreChats ? [
      {
        key: 'show-less',
        label: (
          <div className="flex items-center justify-center w-full text-gray-300 hover:text-white py-1 border-t border-gray-700 mt-1">
            <span>收起</span>
          </div>
        ),
      }
    ] : []),
  ];

  return (
    <Dropdown 
      menu={{ 
        items: chatListMenuItems,
        onClick: async ({ key }) => {
          if (key === 'new-chat') {
            showNewChatModal();
          } else if (key === 'show-more') {
            setShowAllChats(true);
          } else if (key === 'show-less') {
            setShowAllChats(false);
          } else {
            setChatListName(key);
            await loadChatList(key);
            await setCurrentSessionName(key);
          }
        },
        style: { backgroundColor: '#1F2937', borderColor: '#4B5563', color: '#FFFFFF' }
      }} 
      trigger={['click']}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
    >
      <Tooltip title={chatListName || getChatTitle()}>
        <Button 
          icon={<MessageOutlined style={{ fontSize: '12px' }} />}
          size="small" 
          className={`flex items-center justify-center text-gray-300 border-gray-600 ${chatListName ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500' : 'bg-gray-700 hover:bg-gray-600'} px-1 py-0 h-6 w-6`}
        />
      </Tooltip>
    </Dropdown>
  );
};

export default ChatListDropdown;