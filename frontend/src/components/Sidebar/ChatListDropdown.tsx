import React from 'react';
import { Dropdown, Button, Tooltip, message as AntdMessage, Modal } from 'antd';
import { MessageOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
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
}

const ChatListDropdown: React.FC<ChatListDropdownProps> = ({
  chatListName,
  chatLists,
  setChatListName,
  loadChatList,
  setCurrentSessionName,
  showNewChatModal,
  deleteChatList,
  getChatTitle
}) => {
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

  const [showAllChats, setShowAllChats] = React.useState(false);
  
  const chatListMenuItems = React.useMemo(() => {
    const maxRecentChats = 10;
    const maxTotalChats = 100;
    const recentChats = chatLists.slice(0, maxRecentChats);
    const hasMoreChats = chatLists.length > maxRecentChats;
    const allChatsToShow = showAllChats 
      ? chatLists.slice(0, maxTotalChats)
      : recentChats;

    return [
      {
        key: 'new-chat',
        label: (
          <div className="flex items-center w-full group text-white font-medium">
            <PlusOutlined className="mr-1" style={{ fontSize: '12px' }} />
            <span>新建对话</span>
          </div>
        ),
      },
      ...(allChatsToShow.length > 0 ? [{ type: 'divider' as const }] : []),
      ...allChatsToShow.map(name => ({
        key: name,
        label: (
          <div className={`flex justify-between items-center w-full group ${chatListName === name ? 'bg-indigo-700/40 rounded-sm' : ''}`}>
            <span className={`truncate max-w-[180px] ${chatListName === name ? 'text-white font-medium' : 'text-gray-200'}`}>{name}</span>
            <Button 
              type="text" 
              size="small" 
              className="opacity-0 group-hover:opacity-100 transition-opacity text-white" 
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteChat(name);
              }}
            />
          </div>
        ),
      })),
      ...(hasMoreChats && !showAllChats ? [
        { type: 'divider' as const },
        {
          key: 'show-more',
          label: (
            <div 
              className="flex items-center w-full group text-gray-400 hover:text-white cursor-pointer"
              onClick={() => setShowAllChats(true)}
            >
              <span className="text-xs">显示更多 ({chatLists.length - maxRecentChats} 条)...</span>
            </div>
          ),
        }
      ] : []),
    ];
  }, [chatLists, chatListName, showAllChats]);

  return (
    <Dropdown 
      menu={{ 
        items: chatListMenuItems,
        onClick: async ({ key }) => {
          if (key === 'new-chat') {
            showNewChatModal();
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