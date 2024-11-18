import React, { useEffect, useState, useRef } from 'react';

interface TerminalProps {
  requestId: string | null;
}

const Terminal: React.FC<TerminalProps> = ({ requestId }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Function to fetch logs
  const fetchLogs = async () => {
    if (!requestId) return;
    
    try {
      const response = await fetch(`/api/terminal/${requestId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      if (data.logs && data.logs.length > 0) {
        setLogs(prev => [...prev, ...data.logs]);
        
        // Auto scroll to bottom
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }
      
      // If logs are null, stop polling
      if (data.logs === null) {
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setIsPolling(false);
    }
  };

  // Start polling when requestId changes
  useEffect(() => {
    if (requestId) {
      setLogs([]); // Clear previous logs
      setIsPolling(true);
    } else {
      setIsPolling(false);
    }
  }, [requestId]);

  // Polling effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPolling) {
      fetchLogs(); // Initial fetch
      intervalId = setInterval(fetchLogs, 1000); // Poll every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling]);

  return (
    <div className="h-full bg-gray-900 text-gray-300 p-4 overflow-hidden">
      <div 
        ref={terminalRef}
        className="font-mono text-sm h-full overflow-y-auto whitespace-pre-wrap"
      >
        {logs.map((log, index) => (
          <div key={index} className="mb-1">
            {log}
          </div>
        ))}
        {isPolling && <div className="text-gray-500">Polling for logs...</div>}
      </div>
    </div>
  );
};

export default Terminal;