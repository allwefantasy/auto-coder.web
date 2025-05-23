import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, Input, Button, Tooltip, message } from 'antd';
import { SearchOutlined, BookOutlined, ReloadOutlined } from '@ant-design/icons';
import { getMessage } from './lang';

const { Option } = Select;

interface Library {
  domain: string;
  username: string;
  lib_name: string;
  full_path: string;
  is_added: boolean;
}

const LibSelector: React.FC = () => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedLibs, setSelectedLibs] = useState<string[]>([]);

  // 获取所有可用的库
  const fetchLibraries = async () => {
    setLoading(true);
    try {
      // 获取所有可用库
      const allLibsResponse = await axios.get('/api/lib/list-all');
      
      // 获取已选择的库
      const selectedLibsResponse = await axios.get('/api/lib/list');
      
      if (
        allLibsResponse.data.success && 
        allLibsResponse.data.data && 
        allLibsResponse.data.data.libraries &&
        selectedLibsResponse.data.success && 
        selectedLibsResponse.data.data
      ) {
        // 获取所有库
        const allLibraries = allLibsResponse.data.data.libraries;
        
        // 获取已选择的库列表
        const selectedLibraryNames = selectedLibsResponse.data.data.libraries || [];
        
        // 标记已选择的库
        const mergedLibraries = allLibraries.map((lib: Library) => ({
          ...lib,
          is_added: selectedLibraryNames.includes(lib.lib_name)
        }));
        
        setLibraries(mergedLibraries);
        setSelectedLibs(selectedLibraryNames);
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
      message.error(getMessage('fetchLibrariesFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 刷新库仓库
  const refreshRepository = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/lib/refresh');
      if (response.data.success) {
        message.success(getMessage('repositoryRefreshSuccess'));
        fetchLibraries(); // 刷新完成后重新获取列表
      } else {
        message.error(getMessage('refreshFailed') + response.data.message);
      }
    } catch (error) {
      console.error('Error refreshing repository:', error);
      message.error(getMessage('repositoryRefreshFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 添加库
  const addLibrary = async (libName: string) => {
    try {
      const response = await axios.post('/api/lib/add', { lib_name: libName });
      if (response.data.success) {
        message.success(getMessage('libraryAdded') + libName);
        // 在本地标记该库为已添加
        setLibraries(prevLibs => 
          prevLibs.map(lib => 
            lib.lib_name === libName ? { ...lib, is_added: true } : lib
          )
        );
      } else {
        message.error(getMessage('addFailed') + response.data.message);
      }
    } catch (error) {
      console.error('Error adding library:', error);
      message.error(getMessage('addFailed') + libName);
    }
  };

  // 移除库
  const removeLibrary = async (libName: string) => {
    try {
      const response = await axios.post('/api/lib/remove', { lib_name: libName });
      if (response.data.success) {
        message.success(getMessage('libraryRemoved') + libName);
        // 在本地标记该库为未添加
        setLibraries(prevLibs => 
          prevLibs.map(lib => 
            lib.lib_name === libName ? { ...lib, is_added: false } : lib
          )
        );
      } else {
        message.error(getMessage('removeFailed') + response.data.message);
      }
    } catch (error) {
      console.error('Error removing library:', error);
      message.error(getMessage('removeFailed') + libName);
    }
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  // 处理选择变化
  const handleChange = (values: string[]) => {
    // 找出新增的库
    const addedLibs = values.filter(v => !selectedLibs.includes(v));
    // 找出移除的库
    const removedLibs = selectedLibs.filter(v => !values.includes(v));
    
    // 处理新增的库
    addedLibs.forEach(libName => {
      addLibrary(libName);
    });
    
    // 处理移除的库
    removedLibs.forEach(libName => {
      removeLibrary(libName);
    });
    
    setSelectedLibs(values);
  };

  // 筛选库
  const filteredLibraries = libraries.filter(lib => {
    const searchLower = searchText.toLowerCase();
    return (
      lib.lib_name.toLowerCase().includes(searchLower) || 
      lib.domain.toLowerCase().includes(searchLower) || 
      lib.username.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">{getMessage('llmFriendlyPackages')}</span>
        <Tooltip title={getMessage('refreshRepository')}>
          <Button 
            type="text" 
            icon={<ReloadOutlined className="text-white" />} 
            size="small"
            loading={loading}
            onClick={refreshRepository}
            className="text-white"
          />
        </Tooltip>
      </div>
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder={getMessage('selectLibraries')}
        loading={loading}
        value={selectedLibs}
        onChange={handleChange}
        optionFilterProp="children"
        maxTagCount={1}
        maxTagTextLength={10}
        className="text-white"
        dropdownRender={menu => (
          <div>
            <div style={{ padding: '4px' }}>
              <Input
                placeholder={getMessage('searchLibraries')}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
                size="small"
              />
            </div>
            {menu}
          </div>
        )}
      >
        {filteredLibraries.map(lib => (
          <Option key={lib.lib_name} value={lib.lib_name}>
            <div className="flex items-center">
              <BookOutlined style={{ marginRight: 4 }} />
              <span>{lib.lib_name}</span>
              <span className="text-xs text-gray-400 ml-1">
                {lib.domain}/{lib.username}
              </span>
            </div>
          </Option>
        ))}
      </Select>
    </div>
  );
};

export default LibSelector; 
 