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
import psutil
import time


class TerminalSession:
    def __init__(self, websocket: WebSocket, shell: str = '/bin/bash'):
        self.websocket = websocket
        self.shell = shell
        self.fd: Optional[int] = None
        self.pid: Optional[int] = None
        self.running = False
        self._lock = threading.Lock()
        self._last_heartbeat = time.time()

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
            asyncio.create_task(self._handle_io())
            # await self._handle_io()

    def resize(self, rows: int, cols: int):
        """Resize the terminal"""        
        if self.fd is not None:
            # Get the current window size
            size = struct.pack("HHHH", rows, cols, 0, 0)
            # Set new window size
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, size)

    async def _send_heartbeat(self):
        while self.running:
            try:
                # Shorter heartbeat timeout
                if time.time() - self._last_heartbeat > 15:  # Reduced from 30 to 15 seconds
                    print(
                        "No heartbeat received for 15 seconds, initiating reconnection")
                    self.running = False
                    try:
                        await self.websocket.close(code=1000, reason="Heartbeat timeout")
                    except Exception:
                        pass
                    break

                if self.websocket.client_state.CONNECTED:
                    await self.websocket.send_json({"type": "heartbeat"})
                else:
                    print("WebSocket disconnected, stopping heartbeat")
                    break

                await asyncio.sleep(5)  # Reduced from 15 to 5 seconds

            except websockets.exceptions.ConnectionClosed:
                print("Connection closed normally during heartbeat")
                break
            except Exception as e:
                print(f"Error in heartbeat: {str(e)}")
                if not self.running:
                    break
                await asyncio.sleep(1)  # Brief pause before retry
                continue

    async def _handle_io(self):
        """Handle I/O between PTY and WebSocket"""
        loop = asyncio.get_running_loop()

        def _read_pty(fd, size=1024):
            """Synchronous PTY read with timeout"""
            try:
                r, _, _ = select.select([fd], [], [], 0.1)
                if r:
                    try:
                        data = os.read(fd, size)
                        return data if data else None  # 返回None表示EOF
                    except (OSError, EOFError) as e:
                        print(f"Error reading PTY: {e}")
                        return None
                return b''  # 没有数据可读但不是错误
            except Exception as e:
                print(f"Fatal error in PTY read: {e}")
                return None  # 严重错误

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

        read_errors = 0  # 跟踪连续读取错误
        MAX_READ_ERRORS = 3  # 最大允许的连续读取错误

        try:
            while self.running:
                try:                    
                    if self.fd is None:
                        break
                    data = await loop.run_in_executor(None, _read_pty, self.fd)

                    if not self.running:
                        break

                    if data is None:  # 严重错误或EOF
                        read_errors += 1
                        if read_errors >= MAX_READ_ERRORS:
                            print(
                                f"Too many PTY read errors ({read_errors}), stopping")
                            break
                        await asyncio.sleep(0.1)  # 错误后短暂等待
                        continue

                    read_errors = 0  # 重置错误计数

                    if data:  # 有实际数据
                        print(f"Received data from PTY: {data.decode('utf-8', errors='replace')}")
                        if not await _safe_send(data):
                            break

                    await asyncio.sleep(0.001)  # 防止CPU过度使用

                except Exception as e:
                    print(f"IO handling error: {e}")
                    read_errors += 1
                    if read_errors >= MAX_READ_ERRORS:
                        break
                    await asyncio.sleep(0.1)

        except Exception as e:
            print(f"Fatal error in IO handling: {e}")
        finally:
            self.running = False  # 确保设置运行状态
            print("IO handling stopped")
            # 确保清理
            if self.fd is not None:
                try:
                    os.close(self.fd)
                except:
                    pass
                self.fd = None

    def write(self, data: str):
        """Write data to the terminal"""        
        if self.fd is not None:
            try:
                print(f"Writing data to pty: {data}")
                encoded_data = data.encode('utf-8')
                bytes_written = os.write(self.fd, encoded_data)
                if bytes_written != len(encoded_data):
                    print(
                        f"Warning: Not all bytes written. Expected {len(encoded_data)}, wrote {bytes_written}")
            except Exception as e:
                print(f"Error writing to terminal: {e}")

    def cleanup(self):
        """Clean up the terminal session"""
        print("Cleaning up terminal session...")
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

        # if self.sessions:
        #     return list(self.sessions.values())[-1]
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
                            # 如果不是JSON，就当作普通输入处理
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
