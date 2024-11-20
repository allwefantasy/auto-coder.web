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
            await self._handle_io()

    def resize(self, rows: int, cols: int):
        """Resize the terminal"""
        with self._lock:
            if self.fd is not None:
                # Get the current window size
                size = struct.pack("HHHH", rows, cols, 0, 0)
                # Set new window size
                fcntl.ioctl(self.fd, termios.TIOCSWINSZ, size)

    async def _send_heartbeat(self):
        while self.running:
            try:
                if time.time() - self._last_heartbeat > 30:  # No heartbeat for 30 seconds
                    print("No heartbeat received for 30 seconds, closing connection")
                    break
                await self.websocket.send_json({"type": "heartbeat"})
                await asyncio.sleep(15)  # Send heartbeat every 15 seconds
            except Exception as e:
                print(f"Error sending heartbeat: {e}")
                break

    async def _handle_io(self):
        try:
            try:
                heartbeat_task = asyncio.create_task(self._send_heartbeat())
                loop = asyncio.get_running_loop()
                
                while self.running:
                    try:
                        # Use select to check if there's data to read with timeout
                        r, _, _ = await loop.run_in_executor(None, select.select, [self.fd], [], [], 0.1)
                        
                        if not self.running:
                            break
                            
                        if r:
                            try:
                                data = await loop.run_in_executor(None, os.read, self.fd, 1024)
                                if data:
                                    try:
                                        if self.websocket.client_state.CONNECTED:
                                            await self.websocket.send_text(data.decode('utf-8', errors='replace'))
                                        else:
                                            print("WebSocket not connected, stopping terminal session")
                                            break
                                    except Exception as e:
                                        print(f"Error sending data to websocket: {str(e)}")
                                        break
                                else:
                                    if self.pid is None or not psutil.pid_exists(self.pid):
                                        print(f"Process {self.pid} is not alive")
                                        break
                            except (EOFError, OSError) as e:
                                print(f"Error reading from PTY: {str(e)}")
                                break
                        
                        await asyncio.sleep(0.001)
                        
                    except Exception as e:
                        print(f"Unexpected error in terminal I/O: {str(e)}")
                        if not self.running:
                            break
            except asyncio.CancelledError:
                print("Terminal I/O task cancelled")
                raise
            except Exception as e:
                print(f"Fatal error in terminal I/O: {str(e)}")
                    
        finally:
            heartbeat_task.cancel()
            self.cleanup()

    def write(self, data: str):
        """Write data to the terminal"""
        with self._lock:
            if self.fd is not None:
                try:
                    # Ensure data is properly encoded                    
                    encoded_data = data.encode('utf-8')
                    print(f"Getting data from websocket: {encoded_data}")
                    os.write(self.fd, encoded_data)
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
                                session.resize(message['rows'], message['cols'])
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