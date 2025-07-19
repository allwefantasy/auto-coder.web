import React, { useState } from 'react';
import { Modal, Input, Button, Spin, message as AntMessage } from 'antd';
import { MessageOutlined, SendOutlined } from '@ant-design/icons';
import { getMessage } from '../../lang';
import '../../styles/custom_antd.css';

interface ModelChatDialogProps {
  visible: boolean;
  onClose: () => void;
  model?: any;
}

const ModelChatDialog: React.FC<ModelChatDialogProps> = ({ visible, onClose, model }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setMessages(msgs => [...msgs, { role: 'user', content: input }]);
    try {
      // 调用真实API
      const reply = await directChat(input, model);
      if (reply && typeof reply === 'object' && reply.error) {
        setMessages(msgs => [...msgs, { role: 'error', content: reply.error }]);
      } else {
        setMessages(msgs => [...msgs, { role: 'assistant', content: reply }]);
        setInput('');
      }
    } catch (e) {
      setMessages(msgs => [...msgs, { role: 'error', content: e.message || '对话失败' }]);
    } finally {
      setLoading(false);
    }
  };

  // 调用后端 /api/direct_chat
  const directChat = async (msg: string, model: any) => {
    try {
      const res = await fetch('/api/direct_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: typeof model === 'string' ? model : (model?.name || 'v3_chat'),
          content: msg,
          product_mode: (model?.product_mode || 'lite')
        })
      });
      const data = await res.json();
      if (data.success) {
        return data.result;
      } else {
        return { error: data.error || '模型返回失败' };
      }
    } catch (e: any) {
      return { error: e.message || '请求失败' };
    }
  };

  return (
    <Modal
      open={visible}
      title={getMessage('modelDialogTestTitle')}
      onCancel={onClose}
      footer={null}
      width={540}
      className="dark-modal"
      destroyOnClose
    >
      <div style={{ minHeight: 240, maxHeight: 340, overflowY: 'auto', background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        {messages.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', marginTop: 60 }}>{getMessage('noDialogMessages') || '暂无消息'}</div>}
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: 8, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <span
              style={{
                display: 'inline-block',
                background:
                  msg.role === 'user'
                    ? '#0ea5e9'
                    : msg.role === 'error'
                    ? '#fff1f0'
                    : '#334155',
                color:
                  msg.role === 'user'
                    ? '#fff'
                    : msg.role === 'error'
                    ? '#d4380d'
                    : '#e0e7ef',
                borderRadius: 6,
                padding: '6px 12px',
                maxWidth: 320,
                wordBreak: 'break-all',
                border: msg.role === 'error' ? '1.5px solid #ff4d4f' : undefined,
                fontWeight: msg.role === 'error' ? 500 : undefined,
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}
        {loading && <div style={{ textAlign: 'center', marginTop: 12 }}><Spin /></div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 4 }}>
        <Input
          style={{ flex: 1, color: '#fff', height: 40, borderRadius: 8 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={handleSend}
          disabled={loading}
          placeholder={getMessage('dialogInputPlaceholder') || '请输入内容...'}
          autoFocus
          className="model-chat-input-dark"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim()}
          style={{
            height: 40,
            borderRadius: 8,
            padding: '0 24px',
            fontWeight: 500,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(30,64,175,0.10)',
            background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
            border: 'none',
            color: '#fff'
          }}
        >
          {getMessage('send') || '发送'}
        </Button>
      </div>
    </Modal>
  );
};

export default ModelChatDialog;
