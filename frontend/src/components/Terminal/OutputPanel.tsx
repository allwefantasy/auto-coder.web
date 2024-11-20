import React, { useEffect, useState } from 'react';

interface OutputPanelProps {
  requestId: string;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ requestId }) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/terminal/${requestId}`);
        const data = await response.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [requestId]);

  return (
    <div className="p-2 text-gray-300 font-mono text-sm whitespace-pre-wrap overflow-auto h-full bg-[#1e1e1e]">
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
};

export default OutputPanel;