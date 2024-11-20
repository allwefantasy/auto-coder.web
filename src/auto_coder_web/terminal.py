import asyncio
import threading
from typing import List, Dict, Any, Optional
import queue
import uuid

class TerminalSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.output_queue = queue.Queue()
        self.command_history: List[str] = []
        self.current_command = ""
        self.running = True

    def write(self, data: str):
        """Write data to the terminal output queue"""
        if data:
            self.output_queue.put(data)

    def read(self) -> List[str]:
        """Read all available output from the terminal"""
        output = []
        while not self.output_queue.empty():
            output.append(self.output_queue.get())
        return output

    def execute_command(self, command: str) -> None:
        """Execute a command and store it in history"""
        if not command:
            return
            
        self.command_history.append(command)
        
        try:
            import subprocess
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate()
            
            if stdout:
                self.write(stdout)
            if stderr:
                self.write(stderr)
                
            if process.returncode != 0:
                self.write(f"Command exited with status {process.returncode}\n")
                
        except Exception as e:
            self.write(f"Error executing command: {str(e)}\n")
        
        self.write(f"\n")

    def stop(self):
        """Stop the terminal session"""
        self.running = False
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

    def get_output(self, session_id: str) -> List[str]:
        """Get output from a specific session"""
        session = self.get_session(session_id)
        if session:
            return session.read()
        return []

    def delete_session(self, session_id: str) -> None:
        """Delete a terminal session"""
        if session_id in self.sessions:
            self.sessions[session_id].stop()
            del self.sessions[session_id]

# Global terminal manager instance
terminal_manager = TerminalManager()