import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

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
      // Send initial size to backend
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows
        }));
      }
    }, 0);

    // Initialize WebSocket connection
    const ws = new WebSocket('ws://localhost:8007/ws/terminal');
    websocketRef.current = ws;

    ws.onopen = () => {
      xterm.writeln('Connected to terminal backend');
    };

    ws.onmessage = (event) => {
      try {
        xterm.write(event.data);
      } catch (error) {
        console.error('Error writing to terminal:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      xterm.writeln('\r\nWebSocket error: ' + error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      xterm.writeln('\r\nConnection closed');
    };

    // 使用onData处理所有输入
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
        } catch (error) {
          console.error('Error sending data:', error);
        }
      }
    });

    // 处理所有键盘事件
    xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      // 始终返回true以允许所有键盘输入
      return true;
    });

    // Make terminal focusable
    xterm.focus();

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    xtermRef.current = xterm;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      xterm.dispose();
    };
  }, []);

  return (
    <div className="h-full w-full bg-[#1e1e1e]">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
};

export default Terminal;