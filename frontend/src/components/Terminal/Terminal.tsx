import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { getMessage } from '../../lang';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  useLocalHost?: boolean; // 控制是否使用本地固定地址
}

// 检测是否为开发环境
const isDevEnvironment = (): boolean => {
  // 方法1: 检查 NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // 方法2: 检查是否在本地开发服务器端口运行
  const port = window.location.port;
  const hostname = window.location.hostname;
  
  // 常见的开发服务器端口和主机名
  const devPorts = ['3000', '3001', '5173'];
  const devHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
  
  if (devHosts.includes(hostname) && devPorts.includes(port)) {
    return true;
  }
  
  // 方法3: 检查URL中是否包含开发相关的标识
  const url = window.location.href;
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('dev')) {
    return true;
  }
  
  return false;
};

const Terminal: React.FC<TerminalProps> = ({ 
  useLocalHost = isDevEnvironment() // 根据环境自动设置默认值
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const xterm = new XTerminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      rows: 24,
      cols: 80,
    });

    // Initialize addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(searchAddon);

    // Open terminal in the container
    xterm.open(terminalRef.current);
    
    // Ensure dimensions are set before fitting
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    // Initialize WebSocket connection with heartbeat
    // const host = window.location.host
    const host = useLocalHost ? "127.0.0.1:8007" : window.location.host;
    const ws = new WebSocket(`ws://${host}/ws/terminal`);
    websocketRef.current = ws;

    ws.onopen = () => {
      xterm.writeln(getMessage('connectedToTerminal'));
      
      // Start heartbeat with error handling and retry mechanism
      const startHeartbeat = () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'heartbeat' }));
            } catch (error) {
              console.error('Failed to send heartbeat:', error);
              handleReconnect();
            }
          }
        }, 5000); // Reduced interval to 5 seconds
      };

      const handleReconnect = () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        if (websocketRef.current?.readyState === WebSocket.CLOSED) {
          xterm.writeln('\r\n' + getMessage('connectionLost'));
          // const host = window.location.host
          const host = useLocalHost ? "127.0.0.1:8007" : window.location.host;
          const newWs = new WebSocket(`ws://${host}/ws/terminal`);
          websocketRef.current = newWs;
          
          // Reattach all event handlers
          newWs.onopen = ws.onopen;
          newWs.onmessage = ws.onmessage;
          newWs.onclose = ws.onclose;
          newWs.onerror = ws.onerror;
        }
      };

      startHeartbeat();

      // Send initial size with error handling
      try {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows
        }));
      } catch (error) {
        console.error('Failed to send initial size:', error);
        xterm.writeln('\r\n' + getMessage('failedToInitTerminalSize'));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = event.data;
        if (typeof data === 'string') {
          let isHeartbeat = false;
          try {
            const jsonData = JSON.parse(data);
            isHeartbeat =
              typeof jsonData === 'object' &&
              jsonData !== null &&
              jsonData.type === 'heartbeat';
          } catch {
            /* Not JSON – fall through */
          }
          if (!isHeartbeat) {
            xterm.write(data);
          }
        } else if (data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            xterm.write(reader.result as string);
          };
          reader.readAsText(data);
        }
      } catch (error) {
        console.error('Error writing to terminal:', error);
        xterm.writeln('\r\n' + getMessage('errorWritingToTerminal') + error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      xterm.writeln('\r\n' + getMessage('websocketError') + error);
    };

    ws.onclose = (event) => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      xterm.writeln(`\r\n${getMessage('connectionClosed')}${event.code}${getMessage('reason')}${event.reason}`);
      
      if (!event.wasClean) {
        xterm.writeln('\r\n' + getMessage('websocketClosedUnexpectedly'));
        // Try to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (websocketRef.current?.readyState === WebSocket.CLOSED) {
            // const host = window.location.host
            const host = useLocalHost ? "127.0.0.1:8007" : window.location.host;
            const newWs = new WebSocket(`ws://${host}/ws/terminal`);
            websocketRef.current = newWs;
            // Reattach all event handlers
            newWs.onopen = ws.onopen;
            newWs.onmessage = ws.onmessage;
            newWs.onclose = ws.onclose;
            newWs.onerror = ws.onerror;
          }
        }, 3000);
      }
    };

    // Handle terminal input
    xterm.onData((data) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: 'stdin', payload: data }));
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    // Store refs for cleanup
    xtermRef.current = xterm;

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [useLocalHost]); // 添加useLocalHost作为依赖

  return (
    <div className="h-full w-full bg-[#1e1e1e]">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
};

export default React.memo(Terminal);