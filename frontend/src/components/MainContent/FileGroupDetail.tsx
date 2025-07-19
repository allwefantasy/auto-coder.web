import React, { useState } from 'react';
import { Button, Table, Empty, Input, message } from 'antd';
import { DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { getMessage } from '../../lang';

interface FileGroup {
  name: string;
  description: string;
  files: string[];
}

interface FileGroupDetailProps {
  selectedGroup: FileGroup | null;
  onFileSelect: (path: string) => void;
  onRemoveFile: (groupName: string, filePath: string) => void;
  onUpdateDescription: (groupName: string, description: string) => Promise<void>;
  onAddExternalFile: () => void;
}

const FileGroupDetail: React.FC<FileGroupDetailProps> = ({ 
  selectedGroup, 
  onFileSelect, 
  onRemoveFile,
  onUpdateDescription,
  onAddExternalFile
}) => {
  const [editingDesc, setEditingDesc] = useState(false);
  const [currentDesc, setCurrentDesc] = useState('');

  if (!selectedGroup) {
    return (
      <div className="text-gray-400 text-center mt-4">
        {getMessage('fileGroupDetail.selectGroup')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-medium text-lg">{selectedGroup.name}</h3>
          <Button
            type="primary"
            size="small"
            className="bg-blue-600 hover:bg-blue-700 border-none"
            icon={editingDesc ? <SaveOutlined /> : <EditOutlined />}
            onClick={async () => {
              if (editingDesc) {
                try {
                  await onUpdateDescription(selectedGroup.name, currentDesc);
                  message.success(getMessage('fileGroupDetail.descriptionUpdated'));
                } catch (error) {
                  message.error(getMessage('fileGroupDetail.descriptionUpdateFailed'));
                }
              } else {
                setCurrentDesc(selectedGroup.description || '');
              }
              setEditingDesc(!editingDesc);
            }}
          >
            {editingDesc ? getMessage('fileGroupDetail.saveDescription') : getMessage('fileGroupDetail.editDescription')}
          </Button>
        </div>
        {editingDesc ? (
          <div className="h-48">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={currentDesc}
              onChange={(value) => setCurrentDesc(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'off',
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            {selectedGroup.description || getMessage('fileGroupDetail.noDescription')}
          </p>
        )}
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-white font-medium">{getMessage('fileGroupDetail.files')} ({selectedGroup.files.length})</h4>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onAddExternalFile}
            className="bg-blue-600 hover:bg-blue-700 border-none"
          >
            {getMessage('fileGroupDetail.addExternalFile')}
          </Button>
        </div>
        {selectedGroup.files.length === 0 ? (
          <div className="empty-files-container">
            <Empty 
              description={<span className="text-gray-400">{getMessage('fileGroupDetail.noFiles')}</span>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="custom-empty-state"
            />
          </div>
        ) : (
          <Table
            dataSource={selectedGroup.files.map(file => ({ path: file }))}
            rowKey="path"
            showHeader={false}
            columns={[
              {
                title: 'Path',
                dataIndex: 'path',
                key: 'path',
                render: (path) => {
                  const fileName = path.split('/').pop(); // 获取路径的最后一部分
                  return (
                    <span
                      className="text-gray-300 cursor-pointer hover:text-blue-400"
                      title={path} // 鼠标悬停时显示完整路径
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onFileSelect(path);
                      }}
                    >
                      {fileName}
                    </span>
                  );
                }
              },
              {
                title: 'Action',
                key: 'action',
                width: 40,
                render: (_, { path }) => (
                  <DeleteOutlined
                    className="text-red-400 cursor-pointer hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(selectedGroup.name, path);
                    }}
                  />
                )
              }
            ]}
            pagination={false}
            size="small"
            className="dark-mode-table"
            locale={{
              emptyText: (
                <div className="py-4">
                  <Empty 
                    description={<span className="text-gray-400">{getMessage('fileGroupDetail.noFilesInGroup')}</span>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    className="custom-empty-state"
                  />
                </div>
              )
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FileGroupDetail; 