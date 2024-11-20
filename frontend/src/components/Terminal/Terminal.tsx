
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

    // Handle terminal input - ensure terminal is focusable and handles input
    xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      return true; // Allow all key events to be processed
    });

    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // 如果是回车键，发送特殊的换行符序列
          if (data === '\r') {
            ws.send(JSON.stringify({ type: 'input', data: '\n' }));
          } else {
            ws.send(JSON.stringify({ type: 'input', data }));
          }
          
          // 如果是可打印字符，在本地回显
          if (data >= ' ' || data === '\r' || data === '\n' || data === '\b') {
            xterm.write(data);
          }
        } catch (error) {
          console.error('Error sending data:', error);
        }
      }
    });

    // 处理特殊键
    xterm.onKey((event) => {
      const ev = event.domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode === 13) { // Enter
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data: '\n' }));
        }
      } else if (ev.keyCode === 8) { // Backspace
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data: '\b' }));
        }
      }
    });

    // Make terminal focusable
    xterm.focus();

    // Handle window resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          const { rows, cols } = xterm;
          ws.send(JSON.stringify({ type: 'resize', rows, cols }));
        }
      } catch (error) {
        console.error('Error resizing terminal:', error);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial fit

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