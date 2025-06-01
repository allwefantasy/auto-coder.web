import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
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
      rows: 30,        // 增加行数
      cols: 120,       // 增加列数以适应更宽的显示
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
    
    // 改进的 fit 逻辑，多次尝试以确保正确大小
    const performFit = () => {
      try {
        fitAddon.fit();
        // 强制刷新终端显示
        xterm.refresh(0, xterm.rows - 1);
        
        // 如果宽度还是太小，手动设置一个合理的最小大小
        if (xterm.cols < 80) {
          const container = terminalRef.current;
          if (container) {
            const { width, height } = container.getBoundingClientRect();
            const charWidth = 8; // 估算字符宽度
            const charHeight = 17; // 估算字符高度
            const newCols = Math.max(80, Math.floor(width / charWidth));
            const newRows = Math.max(24, Math.floor(height / charHeight));
            
            // 使用 resize 方法而不是直接设置
            xterm.resize(newCols, newRows);
          }
        }
      } catch (error) {
        console.error('Error during terminal fit:', error);
      }
    };

    // 延迟执行 fit，确保 DOM 完全渲染
    setTimeout(() => {
      performFit();
      // 再次尝试，确保大小正确
      setTimeout(performFit, 100);
    }, 0);

    // Initialize WebSocket connection with heartbeat
    // const host = window.location.host
    const host = useLocalHost ? "127.0.0.1:8007" : window.location.host;
    const ws = new WebSocket(`ws://${host}/ws/terminal`);
    websocketRef.current = ws;

    ws.onopen = () => {
      xterm.writeln('Connected to terminal backend');
      
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
          xterm.writeln('\r\nConnection lost. Attempting to reconnect...');
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

      // Send initial size with error handling - 确保发送正确的大小
      const sendInitialSize = () => {
        try {
          // 确保发送的是当前实际的终端大小
          const currentCols = Math.max(xterm.cols, 80);
          const currentRows = Math.max(xterm.rows, 24);
          
          ws.send(JSON.stringify({
            type: 'resize',
            cols: currentCols,
            rows: currentRows
          }));
          
          console.log(`Sent initial terminal size: ${currentCols}x${currentRows}`);
        } catch (error) {
          console.error('Failed to send initial size:', error);
          xterm.writeln('\r\nFailed to initialize terminal size');
        }
      };

      // 延迟发送初始大小，确保终端已经正确调整大小
      setTimeout(sendInitialSize, 200);
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
        xterm.writeln('\r\nError writing to terminal: ' + error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      xterm.writeln('\r\nWebSocket error: ' + error);
    };

    ws.onclose = (event) => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      xterm.writeln(`\r\nConnection closed. Code: ${event.code}, Reason: ${event.reason}`);
      
      if (!event.wasClean) {
        xterm.writeln('\r\nWebSocket closed unexpectedly. Reconnecting...');
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
      try {
        fitAddon.fit();
        
        // 确保最小大小
        const currentCols = Math.max(xterm.cols, 80);
        const currentRows = Math.max(xterm.rows, 24);
        
        if (xterm.cols !== currentCols || xterm.rows !== currentRows) {
          xterm.resize(currentCols, currentRows);
        }
        
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            type: 'resize',
            cols: currentCols,
            rows: currentRows
          }));
          console.log(`Terminal resized to: ${currentCols}x${currentRows}`);
        }
      } catch (error) {
        console.error('Error during resize:', error);
      }
    };

    // 防抖处理，避免频繁调整大小
    let resizeTimeout: NodeJS.Timeout;
    const debouncedHandleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedHandleResize);

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
      window.removeEventListener('resize', debouncedHandleResize);
    };
  }, [useLocalHost]); // 添加useLocalHost作为依赖

  return (
    <div className="h-full w-full bg-[#1e1e1e] min-h-[400px] min-w-[800px]">
      <div ref={terminalRef} className="h-full w-full" style={{ minWidth: '800px', minHeight: '400px' }} />
    </div>
  );
};

export default React.memo(Terminal);