import asyncio
import threading
from typing import List, Dict, Any, Optional
import queue
import uuid
import os
import subprocess

class TerminalSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.output_queue = queue.Queue()
        self.command_history: List[str] = []
        self.current_command = ""
        self.running = True
        self.current_process = None
        self.last_activity = asyncio.get_event_loop().time()
        
        # Set default working directory to project root
        self.working_directory = os.getcwd()
        
        # Copy current environment variables
        self.env = os.environ.copy()

    def write(self, data: str):
        """Write data to the terminal output queue"""
        if data:
            self.output_queue.put(data)
            self.last_activity = asyncio.get_event_loop().time()

    def read(self) -> List[str]:
        """Read all available output from the terminal"""
        self.last_activity = asyncio.get_event_loop().time()
        output = []
        while not self.output_queue.empty():
            output.append(self.output_queue.get())
        return output

    def execute_command(self, command: str) -> None:
        """Execute a command and store it in history"""
        if not command:
            return
            
        self.command_history.append(command)
        self.last_activity = asyncio.get_event_loop().time()
        
        try:
            # Kill previous process if it exists
            if self.current_process and self.current_process.poll() is None:
                try:
                    self.current_process.terminate()
                    self.current_process.wait(timeout=1)
                except:
                    try:
                        self.current_process.kill()
                    except:
                        pass
            
            # Special command handling
            if command.startswith('cd '):
                new_dir = command[3:].strip()
                try:
                    # Convert relative path to absolute
                    if not os.path.isabs(new_dir):
                        new_dir = os.path.join(self.working_directory, new_dir)
                    new_dir = os.path.abspath(new_dir)
                    
                    if os.path.isdir(new_dir):
                        self.working_directory = new_dir
                        self.write(f"Changed directory to {new_dir}\n")
                    else:
                        self.write(f"Directory not found: {new_dir}\n")
                except Exception as e:
                    self.write(f"Error changing directory: {str(e)}\n")
                return
                
            # Execute command
            self.current_process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,  # Line buffered
                cwd=self.working_directory,
                env=self.env
            )
            
            # Use non-blocking reads
            import select
            import fcntl
            import os

            # Set non-blocking mode for stdout and stderr
            for pipe in [self.current_process.stdout, self.current_process.stderr]:
                fd = pipe.fileno()
                fl = fcntl.fcntl(fd, fcntl.F_GETFL)
                fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)

            # Read output while process is running
            while True:
                reads = [self.current_process.stdout.fileno(), self.current_process.stderr.fileno()]
                ret = select.select(reads, [], [], 0.1)[0]

                for fd in ret:
                    if fd == self.current_process.stdout.fileno():
                        line = self.current_process.stdout.readline()
                        if line:
                            self.write(line)
                    if fd == self.current_process.stderr.fileno():
                        line = self.current_process.stderr.readline()
                        if line:
                            self.write(line)

                if self.current_process.poll() is not None:
                    break

            # Get any remaining output
            stdout, stderr = self.current_process.communicate()
            if stdout:
                self.write(stdout)
            if stderr:
                self.write(stderr)
                
            if self.current_process.returncode != 0:
                self.write(f"Command exited with status {self.current_process.returncode}\n")
                
        except Exception as e:
            self.write(f"Error executing command: {str(e)}\n")
        
        self.write("\n")

    def stop(self):
        """Stop the terminal session"""
        self.running = False
        if self.current_process and self.current_process.poll() is None:
            try:
                self.current_process.terminate()
                self.current_process.wait(timeout=1)
            except:
                try:
                    self.current_process.kill()
                except:
                    pass
        
        while not self.output_queue.empty():
            self.output_queue.get()

class TerminalManager:
    def __init__(self):
        self.sessions: Dict[str, TerminalSession] = {}

    def create_session(self) -> str:
        """Create a new terminal session"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = TerminalSession(session_id)
        return session_id

    def get_session(self, session_id: str) -> Optional[TerminalSession]:
        """Get an existing terminal session"""
        return self.sessions.get(session_id)

    def execute_command(self, session_id: str, command: str) -> None:
        """Execute a command in a specific session"""
        session = self.get_session(session_id)
        if session:
            session.execute_command(command)

    def get_output(self, session_id: str) -> Optional[List[str]]:
        """Get output from a specific session with validity check"""
        session = self.get_session(session_id)
        if not session or not session.running:
            if session_id in self.sessions:
                del self.sessions[session_id]  # Clean up invalid session
            return None
        return session.read()

    def delete_session(self, session_id: str) -> None:
        """Delete a terminal session"""
        if session_id in self.sessions:
            self.sessions[session_id].stop()
            del self.sessions[session_id]

# Global terminal manager instance
terminal_manager = TerminalManager()