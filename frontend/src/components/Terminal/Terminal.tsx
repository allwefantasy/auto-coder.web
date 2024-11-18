import React, { useState, useEffect } from 'react';

interface TerminalProps {
  requestId: string;
}

const Terminal: React.FC<TerminalProps> = ({ requestId }) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!requestId) return;

    const fetchLogs = async () => {
      while (true) {
        try {
          const response = await fetch(`/api/terminal/${requestId}`);
          const data = await response.json();
          if (!data.logs) break;
          setLogs(prevLogs => [...prevLogs, ...data.logs]);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Error fetching logs:', error);
          break;
        }
      }
    };

    fetchLogs();
  }, [requestId]);

  return (
    <div className="bg-gray-900 text-gray-300 p-4 rounded-lg h-full overflow-auto font-mono text-sm">
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
};

export default Terminal;