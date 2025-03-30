import React, { useState, useEffect } from 'react';
import { Select, Tooltip, Spin } from 'antd';

interface Rag {
  name: string;
  base_url: string;
  api_key: string;
}

const RagSelector: React.FC = () => {
  const [rags, setRags] = useState<Rag[]>([]);
  const [selectedRag, setSelectedRag] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);

  const fetchRags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rags');
      const data = await response.json();
      setRags(data.data || []);
    } catch (err) {
      console.error('Failed to fetch RAGs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRags();
  }, []);

  return (
    <div className="w-full mb-1">
      <Tooltip title="Select a Retrieval-Augmented Generation provider">
        <span className="text-gray-300 text-xs mb-1 block">RAG Provider</span>
      </Tooltip>
      <Select
        className="w-full"
        size="small"
        loading={loading}
        placeholder="Select RAG"
        value={selectedRag}
        onChange={(value) => setSelectedRag(value)}
        options={rags.map(r => ({ label: r.name, value: r.name }))}
        dropdownMatchSelectWidth={false}
      />
    </div>
  );
};

export default RagSelector;