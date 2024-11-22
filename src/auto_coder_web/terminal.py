from fastapi import WebSocket
import asyncio
import websockets
import os
import json
import struct
import signal
from typing import Dict, Optional
import threading
import select
import psutil
import time
import sys
import platform

# 为不同平台选择合适的终端库
if platform.system() == 'Windows':
    import winpty
else:
    import pty
    import fcntl
    import termios

class TerminalSession:
    def __init__(self, websocket: WebSocket, shell: str = None):
        self.websocket = websocket
        # 根据平台选择默认shell
        if shell is None:
            if platform.system() == 'Windows':
                self.shell = 'cmd.exe'
            else:
                self.shell = '/bin/bash'
        else:
            self.shell = shell
        
        self.fd: Optional[int] = None
        self.pid: Optional[int] = None
        self.running = False
        self._lock = threading.Lock()
        self._last_heartbeat = time.time()
        self.platform = platform.system()
        self.pty = None  # 用于Windows的winpty实例

    async def start(self):
        """Start the terminal session"""
        if self.platform == 'Windows':
            # Windows下使用winpty
            try:
                self.pty = winpty.PTY(
                    cols=80,
                    rows=24
                )
                # 在Windows下，pid就是process.pid
                self.pid = self.pty.spawn(self.shell)
                self.fd = self.pty.fd  # winpty提供了类似的文件描述符
                self.running = True
                asyncio.create_task(self._handle_io())
            except Exception as e:
                print(f"Failed to start Windows terminal: {e}")
                raise
        else:
            # Unix系统使用原有的pty
            self.pid, self.fd = pty.fork()

            if self.pid == 0:  # Child process
                # Execute the shell
                env = os.environ.copy()
                env["TERM"] = "xterm-256color"
                os.execvpe(self.shell, [self.shell], env)
            else:  # Parent process
                self.running = True
                asyncio.create_task(self._handle_io())

    def resize(self, rows: int, cols: int):
        """Resize the terminal"""
        if not self.running:
            return
            
        if self.platform == 'Windows':
            if self.pty:
                self.pty.set_size(rows, cols)
        else:
            if self.fd is not None:
                # Get the current window size
                size = struct.pack("HHHH", rows, cols, 0, 0)
                # Set new window size
                fcntl.ioctl(self.fd, termios.TIOCSWINSZ, size)

    async def _handle_io(self):
        """Handle I/O between PTY and WebSocket"""
        loop = asyncio.get_running_loop()

        def _read_pty(fd, size=1024):
            """Synchronous PTY read with timeout"""
            try:
                if self.platform == 'Windows':
                    # Windows下使用winpty的读取方法
                    if self.pty:
                        try:
                            data = self.pty.read(size)
                            return data.encode('utf-8') if isinstance(data, str) else data
                        except Exception as e:
                            print(f"Error reading from winpty: {e}")
                            return None
                else:
                    # Unix系统使用select
                    r, _, _ = select.select([fd], [], [], 0.1)
                    if r:
                        try:
                            data = os.read(fd, size)
                            return data if data else None
                        except (OSError, EOFError) as e:
                            print(f"Error reading PTY: {e}")
                            return None
                    return b''
            except Exception as e:
                print(f"Fatal error in PTY read: {e}")
                return None

        async def _safe_send(data: bytes):
            """Safely send data to websocket with error handling"""
            try:
                if self.websocket.client_state.CONNECTED:
                    await self.websocket.send_text(data.decode('utf-8', errors='replace'))
                    return True
                else:
                    print("WebSocket disconnected")
                    return False
            except Exception as e:
                print(f"WebSocket send error: {e}")
                return False

        read_errors = 0
        MAX_READ_ERRORS = 3

        try:
            while self.running:
                try:                    
                    if self.fd is None:
                        break
                    data = await loop.run_in_executor(None, _read_pty, self.fd)

                    if not self.running:
                        break

                    if data is None:
                        read_errors += 1
                        if read_errors >= MAX_READ_ERRORS:
                            print(f"Too many PTY read errors ({read_errors}), stopping")
                            break
                        await asyncio.sleep(0.1)
                        continue

                    read_errors = 0

                    if data:
                        if not await _safe_send(data):
                            break

                    await asyncio.sleep(0.001)

                except Exception as e:
                    print(f"IO handling error: {e}")
                    read_errors += 1
                    if read_errors >= MAX_READ_ERRORS:
                        break
                    await asyncio.sleep(0.1)

        except Exception as e:
            print(f"Fatal error in IO handling: {e}")
        finally:
            self.running = False
            print("IO handling stopped")
            self.cleanup()

    def write(self, data: str):
        """Write data to the terminal"""        
        if not self.running:
            return
            
        try:
            encoded_data = data.encode('utf-8')
            if self.platform == 'Windows':
                if self.pty:
                    self.pty.write(data)  # winpty接受字符串输入
            else:
                if self.fd is not None:
                    os.write(self.fd, encoded_data)
        except Exception as e:
            print(f"Error writing to terminal: {e}")

    def cleanup(self):
        """Clean up the terminal session"""
        print("Cleaning up terminal session...")
        self.running = False
        
        if self.platform == 'Windows':
            if self.pty:
                try:
                    self.pty.close()
                except Exception as e:
                    print(f"Error closing winpty: {e}")
        else:
            if self.pid:
                try:
                    os.kill(self.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            if self.fd is not None:
                try:
                    os.close(self.fd)
                except OSError:
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
                                session.resize(
                                    message['rows'], message['cols'])
                            elif message['type'] == 'heartbeat':
                                session._last_heartbeat = time.time()
                            else:
                                session.write(data)
                        except json.JSONDecodeError:
                            session.write(data)
                    except RuntimeError as e:
                        if "WebSocket is not connected" in str(e):
                            break
                        raise
            except websockets.exceptions.ConnectionClosed:
                print("WebSocket closed normally during terminal session")
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