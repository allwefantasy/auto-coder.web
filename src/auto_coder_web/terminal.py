
from fastapi import WebSocket
import asyncio
import websockets
import pty
import os
import json
import struct
import fcntl
import termios
import signal
from typing import Dict, Optional
import threading
import select

class TerminalSession:
    def __init__(self, websocket: WebSocket, shell: str = '/bin/bash'):
        self.websocket = websocket
        self.shell = shell
        self.fd: Optional[int] = None
        self.pid: Optional[int] = None
        self.running = False
        self._lock = threading.Lock()

    async def start(self):
        """Start the terminal session"""
        # Fork a new process for the shell
        self.pid, self.fd = pty.fork()
        
        if self.pid == 0:  # Child process
            # Execute the shell
            env = os.environ.copy()
            env["TERM"] = "xterm-256color"
            os.execvpe(self.shell, [self.shell], env)
        else:  # Parent process
            self.running = True
            await self._handle_io()

    def resize(self, rows: int, cols: int):
        """Resize the terminal"""
        with self._lock:
            if self.fd is not None:
                # Get the current window size
                size = struct.pack("HHHH", rows, cols, 0, 0)
                # Set new window size
                fcntl.ioctl(self.fd, termios.TIOCSWINSZ, size)

    async def _handle_io(self):
        """Handle I/O between websocket and PTY"""
        try:
            while self.running:
                # Use select to check if there's data to read
                r, _, _ = select.select([self.fd], [], [], 0.1)
                
                if r:
                    try:
                        data = os.read(self.fd, 1024)
                        if data:
                            await self.websocket.send_text(data.decode())
                        else:
                            break
                    except (OSError, IOError):
                        break
                
                # Small delay to prevent high CPU usage
                await asyncio.sleep(0.01)
                
        except Exception as e:
            print(f"Error in terminal I/O: {str(e)}")
        finally:
            self.cleanup()

    def write(self, data: str):
        """Write data to the terminal"""
        with self._lock:
            if self.fd is not None:
                os.write(self.fd, data.encode())

    def cleanup(self):
        """Clean up the terminal session"""
        self.running = False
        if self.pid:
            try:
                os.kill(self.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        if self.fd is not None:
            os.close(self.fd)


class TerminalManager:
    def __init__(self):
        self.sessions: Dict[str, TerminalSession] = {}

    async def create_session(self, websocket: WebSocket, session_id: str):
        """Create a new terminal session"""
        if session_id in self.sessions:
            await self.close_session(session_id)
            
        session = TerminalSession(websocket)
        self.sessions[session_id] = session
        await session.start()
        return session

    async def close_session(self, session_id: str):
        """Close a terminal session"""
        if session_id in self.sessions:
            self.sessions[session_id].cleanup()
            del self.sessions[session_id]

    async def handle_websocket(self, websocket: WebSocket, session_id: str):
        """Handle websocket connection for a terminal session"""
        await websocket.accept()
        session = await self.create_session(websocket, session_id)
        
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    if message['type'] == 'input':
                        session.write(message['data'])
                    elif message['type'] == 'resize':
                        session.resize(message['rows'], message['cols'])
                except json.JSONDecodeError:
                    # If not JSON, treat as raw input
                    print(f"Received non-JSON data: {data}")
                    session.write(data)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.close_session(session_id)

terminal_manager = TerminalManager()