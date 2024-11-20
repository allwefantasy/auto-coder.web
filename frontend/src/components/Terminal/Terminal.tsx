import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  requestId: string;
}

const Terminal: React.FC<TerminalProps> = ({ requestId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const commandBufferRef = useRef<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    // Initialize terminal
    const initTerminal = async () => {
      if (!terminalRef.current) return;

      console.log('[Terminal] Initializing terminal instance');
      // Initialize terminal instance
      const terminal = new XTerm({
        theme: {
          background: '#1E1E1E',
          foreground: '#D4D4D4',
          cursor: '#D4D4D4',          
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        allowTransparency: true,
        convertEol: true,
        windowsMode: false,
        windowOptions: {
          setWinLines: true
        },
        tabStopWidth: 8,
        allowProposedApi: true,
      });

      // Create and attach addons
      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      const webLinksAddon = new WebLinksAddon();
      const unicode11Addon = new Unicode11Addon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(searchAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(unicode11Addon);
      terminal.unicode.activeVersion = '11';

      // Store references
      (xtermRef as React.MutableRefObject<XTerm>).current = terminal;
      (fitAddonRef as React.MutableRefObject<FitAddon>).current = fitAddon;

      // Open terminal in container
      terminal.open(terminalRef.current);
      fitAddon.fit();

      console.log('[Terminal] Creating new terminal session');
      // Create terminal session
      try {
        const response = await fetch('/api/terminal/create', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to create terminal session');
        const data = await response.json();        
        sessionIdRef.current = data.session_id;
        setIsConnected(true);

        terminal.writeln('\x1b[1;32mTerminal connected\x1b[0m');
        terminal.writeln('\x1b[1;34mType "help" for available commands\x1b[0m');
        terminal.write('\r\n\x1b[1;32m$\x1b[0m ');
      } catch (error) {
        console.error('Failed to create terminal session:', error);
        terminal.writeln('\x1b[1;31mFailed to connect to terminal server\x1b[0m');
      }

      // Handle input with proper control sequences
      terminal.onData((data) => {
        console.log('[Terminal] Received input data:', data.charCodeAt(0)); 
        if (data === '\r') { // Enter key
          console.log('[Terminal] Enter key pressed, executing command:', commandBufferRef.current);
          const command = commandBufferRef.current.trim();
          if (command) {
            handleCommand(command);
          }
          commandBufferRef.current = '';
          terminal.write('\r\n\x1b[1;32m$\x1b[0m ');
        } else if (data === '\u007f') { // Backspace
          if (commandBufferRef.current.length > 0) {
            commandBufferRef.current = commandBufferRef.current.slice(0, -1);
            terminal.write('\b \b');
          }
        } else if (data === '\u0003') { // Ctrl+C
          terminal.write('^C\r\n\x1b[1;32m$\x1b[0m ');
          commandBufferRef.current = '';
        } else if (!/[\x00-\x1F]/.test(data)) { // Only handle printable characters
          commandBufferRef.current += data;
          terminal.write(data);
        }
      });

      // Handle resize with ResizeObserver
      resizeObserverRef.current = new ResizeObserver(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      });

      resizeObserverRef.current.observe(terminalRef.current);

      // Start polling for output
      startPolling();

      // Cleanup
      return () => {
        resizeObserverRef.current?.disconnect();
        stopPolling();
        if (sessionIdRef.current) {
          fetch(`/api/terminal/${sessionIdRef.current}/delete`, { 
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          }).catch(error => {
            console.error('Failed to delete terminal session:', error);
          });
        }
        terminal.dispose();
      };
    };

    initTerminal();
  }, []);

  const startPolling = () => {
    console.log('[Terminal] Starting output polling');
    if (pollingIntervalRef.current) return;
    
    pollingIntervalRef.current = setInterval(async () => {
      if (!sessionIdRef.current || !xtermRef.current) return;

      try {
        console.log('[Terminal] Polling output for session:', sessionIdRef.current);
        const response = await fetch(`/api/terminal/${sessionIdRef.current}/output`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        console.log('[Terminal] Received output response:', response.status);
        if (response.status === 404) {
          // Session expired, try to reconnect
          sessionIdRef.current = null;
          stopPolling();
          xtermRef.current.write('\r\n\x1b[1;31mTerminal session expired. Reconnecting...\x1b[0m\r\n');
          
          try {
            const newSession = await fetch('/api/terminal/create', { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (!newSession.ok) throw new Error('Failed to create new session');
            const data = await newSession.json();
            sessionIdRef.current = data.session_id;
            xtermRef.current.write('\x1b[1;32mReconnected successfully\x1b[0m\r\n');
            startPolling();
            return;
          } catch (e) {
            xtermRef.current.write('\x1b[1;31mFailed to reconnect. Please refresh the page.\x1b[0m\r\n');
            return;
          }
        }

        if (!response.ok) throw new Error('Failed to fetch terminal output');
        const data = await response.json();
        
        if (data.status === "error") {
          xtermRef.current?.write('\r\n\x1b[1;31m' + data.message + '\x1b[0m\r\n');
          return;
        }
        
        if (data.output && data.output.length > 0) {
          console.log('[Terminal] Received output data:', data.output);
          data.output.forEach((line: string) => {
            xtermRef.current?.write(line);
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Terminal output request timed out');
          return;
        }
        console.error('Failed to fetch terminal output:', error);
        if (xtermRef.current) {
          xtermRef.current.write('\r\n\x1b[1;31mConnection error. Retrying...\x1b[0m\r\n');
        }
      }
    }, 1000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleCommand = async (command: string) => {
    if (!sessionIdRef.current || !xtermRef.current) {
      console.log('[Terminal] Cannot execute command - missing session or terminal reference');
      return;
    }
    console.log('[Terminal] Executing command:', command);

    try {
      const response = await fetch(`/api/terminal/${sessionIdRef.current}/input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
      });

      if (!response.ok) {
        throw new Error('Failed to send command');
      }
    } catch (error) {
      console.error('Failed to send command:', error);
      xtermRef.current.write('\r\n\x1b[1;31mFailed to send command\x1b[0m\r\n');
    }
  };

  return (
    <div className="h-full bg-[#1E1E1E]">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
};

export default Terminal;