import os
import json
import asyncio
import aiofiles
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from typing import List, Optional
from threading import Thread
import time

class ProjectFileCacheHandler(FileSystemEventHandler):
    """
    监听文件系统变化，自动标记缓存为dirty
    """
    def __init__(self, cacher: 'FileCacher'):
        self.cacher = cacher

    def on_any_event(self, event):
        self.cacher.mark_dirty()

class FileCacher:
    def __init__(self, project_path: str, cache_file: Optional[str] = None):
        self.project_path = os.path.abspath(project_path)
        self.cache_file = cache_file or os.path.join(self.project_path, '.auto-coder', 'file_cache.json')
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)

        self.file_list: List[str] = []
        self.exclude_dirs = ['.git', 'node_modules', 'dist', 'build', '__pycache__', '.venv', '.auto-coder']
        self._dirty = True
        self._lock = asyncio.Lock()
        try:
            self.loop = asyncio.get_running_loop()
        except RuntimeError:
            self.loop = asyncio.get_event_loop()

        # 启动watchdog监听线程
        self.observer = Observer()
        event_handler = ProjectFileCacheHandler(self)
        self.observer.schedule(event_handler, self.project_path, recursive=True)
        self.observer.start()

        # 后台线程自动保存缓存
        self._start_persist_loop()

    def mark_dirty(self):
        self._dirty = True

    def _start_persist_loop(self):
        def run():
            while True:
                time.sleep(2)
                if self._dirty:
                    asyncio.run_coroutine_threadsafe(self.save_cache(), self.loop)
                    self._dirty = False
        t = Thread(target=run, daemon=True)
        t.start()

    async def build_cache(self):
        """
        扫描项目文件，重建缓存
        """
        async with self._lock:
            all_files = []
            for root, dirs, files in os.walk(self.project_path, followlinks=True):
                dirs[:] = [d for d in dirs if d not in self.exclude_dirs and not d.startswith('.')]
                for file in files:
                    rel_path = os.path.relpath(os.path.join(root, file), self.project_path)
                    # 再次过滤路径中任意一部分
                    if not any(part in self.exclude_dirs or part.startswith('.') for part in rel_path.split(os.sep)):
                        all_files.append(rel_path)
            self.file_list = all_files
            await self.save_cache()

    async def save_cache(self):
        """
        持久化缓存到json文件
        """
        async with self._lock:
            try:
                async with aiofiles.open(self.cache_file, 'w', encoding='utf-8') as f:
                    await f.write(json.dumps(self.file_list, ensure_ascii=False, indent=2))
            except Exception:
                pass  # ignore errors during save

    async def load_cache(self):
        """
        加载缓存文件
        """
        try:
            async with aiofiles.open(self.cache_file, 'r', encoding='utf-8') as f:
                content = await f.read()
                self.file_list = json.loads(content)
            self._dirty = False
        except Exception:
            # 缓存不存在或损坏，重新生成
            await self.build_cache()

    async def get_files(self, patterns: List[str]) -> List[str]:
        """
        根据模式匹配文件，支持简单的字符串包含
        """
        async with self._lock:
            if self._dirty:
                await self.build_cache()

            if not patterns or (len(patterns) == 1 and patterns[0] == ""):
                return [os.path.join(self.project_path, f) for f in self.file_list]

            matches = set()
            for pattern in patterns:
                for f in self.file_list:
                    filename = os.path.basename(f)
                    if pattern in filename:
                        matches.add(os.path.join(self.project_path, f))
            return list(matches)

    def shutdown(self):
        self.observer.stop()
        self.observer.join()