import { useState, useEffect, useCallback } from 'react';
import { ConfigState, FileGroup } from '../../types';
import { message as AntdMessage } from 'antd';

const useConfigState = () => {
  const [showConfig, setShowConfig] = useState(false);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [config, setConfig] = useState<ConfigState>({
    human_as_model: false,
    skip_build_index: true,
    project_type: "py",
    extra_conf: {},
    available_keys: []
  });

  const updateConfig = async (key: string, value: boolean | string) => {
    try {
      const response = await fetch('/api/conf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: String(value) })
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      setConfig(prev => ({ ...prev, [key]: value }));
      AntdMessage.success('Configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      AntdMessage.error('Failed to update configuration');
    }
  };

  const fetchFileGroups = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    
    if (timeSinceLastFetch >= 30000) {
      try {
        const response = await fetch('/api/file-groups');
        if (!response.ok) throw new Error('Failed to fetch file groups');
        const data = await response.json();
        setFileGroups(data.groups);
        setLastFetchTime(now);
      } catch (error) {
        console.error('Failed to load file groups');
      }
    }
  }, [lastFetchTime]);

  useEffect(() => {
    // Fetch initial config
    fetch('/api/conf')
      .then(response => response.json())
      .then(data => {
        const { human_as_model, skip_build_index, project_type, ...extraConf } = data.conf;
        setConfig({
          human_as_model: human_as_model === "true",
          skip_build_index: skip_build_index === "true",
          project_type: project_type,
          extra_conf: extraConf,
          available_keys: []
        });
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        AntdMessage.error('Failed to fetch configuration');
      });
  }, []);

  useEffect(() => {
    // Fetch available configuration keys
    fetch('/api/conf/keys')
      .then(response => response.json())
      .then(data => {
        setConfig(prev => ({
          ...prev,
          available_keys: data.keys
        }));
      })
      .catch(error => {
        console.error('Error fetching configuration keys:', error);
        AntdMessage.error('Failed to fetch configuration keys');
      });
  }, []);

  useEffect(() => {
    fetchFileGroups();
  }, []);

  return {
    showConfig,
    setShowConfig,
    config,
    setConfig,
    selectedGroups,
    setSelectedGroups,
    fileGroups,
    updateConfig,
    fetchFileGroups
  };
};

export default useConfigState;