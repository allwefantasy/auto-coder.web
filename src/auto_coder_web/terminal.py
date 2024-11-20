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
        loop = asyncio.get_running_loop()
        try:
            while self.running:
                try:
                    # 使用异步的方式读取数据
                    data = await loop.run_in_executor(None, os.read, self.fd, 1024)
                    if data:
                        await self.websocket.send_text(data.decode())
                    else:
                        break
                except (OSError, IOError) as e:
                    print(f"Error reading from PTY: {e}")
                    break
                
                # 给其他任务执行的机会
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
            try:
                os.close(self.fd)
            except OSError:
                # File descriptor may already be closed
                pass


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
        try:
            await websocket.accept()
            session = await self.create_session(websocket, session_id)
            
            try:
                while True:
                    try:
                        data = await websocket.receive_text()
                        try:
                            message = json.loads(data)
                            if message['type'] == 'resize':
                                session.resize(message['rows'], message['cols'])
                            else:
                                session.write(data)
                        except json.JSONDecodeError:
                            # 如果不是JSON，就当作普通输入处理
                            session.write(data)
                    except RuntimeError as e:
                        if "WebSocket is not connected" in str(e):
                            break
                        raise
            except websockets.exceptions.ConnectionClosed:
                pass
            finally:
                if session_id in self.sessions:
                    await self.close_session(session_id)
        except Exception as e:
            print(f"Error in terminal websocket: {str(e)}")
            if session_id in self.sessions:
                await self.close_session(session_id)
            raise

terminal_manager = TerminalManager()