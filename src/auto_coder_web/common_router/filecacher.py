import os
import json
import threading
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class FileCacheHandler(FileSystemEventHandler):
    def __init__(self, cacher):
        super().__init__()
        self.cacher = cacher

    def on_created(self, event):
        if not event.is_directory:
            self.cacher._update_file(event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self.cacher._update_file(event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self.cacher._remove_file(event.src_path)

    def on_moved(self, event):
        if not event.is_directory:
            self.cacher._remove_file(event.src_path)
            self.cacher._update_file(event.dest_path)


class FileCacher:
    def __init__(self, project_path):
        self.project_path = project_path
        self.index_file = os.path.join(project_path, ".auto-coder", "cache", "file_cache.json")
        self.file_info = {}  # key: absolute path, value: metadata dict
        self.ready = False
        self.lock = threading.RLock()
        self.observer = None

    def start(self):
        """启动缓存构建和监控"""
        # 启动索引构建线程
        t = threading.Thread(target=self._build_cache_thread, daemon=True)
        t.start()

    def _build_cache_thread(self):
        """后台构建索引并启动watchdog监控"""
        try:
            self._build_cache()
        finally:
            self.ready = True
            self._save_cache()
            self._start_watchdog()

    def _build_cache(self):
        """遍历项目目录，构建初始缓存"""
        exclude_dirs = {".git", "node_modules", "dist", "build", "__pycache__", ".venv", ".auto-coder"}
        for root, dirs, files in os.walk(self.project_path, followlinks=True):
            # 过滤目录
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            for f in files:
                abs_path = os.path.join(root, f)
                self._update_file(abs_path)

    def _update_file(self, abs_path):
        """添加或更新单个文件的缓存信息"""
        try:
            if not os.path.isfile(abs_path):
                return
            stat = os.stat(abs_path)
            rel_path = os.path.relpath(abs_path, self.project_path)
            with self.lock:
                self.file_info[rel_path] = {
                    "mtime": stat.st_mtime,
                    "size": stat.st_size,
                    "abs_path": abs_path,
                    "name": os.path.basename(abs_path),
                }
        except Exception:
            pass  # ignore errors

    def _remove_file(self, abs_path):
        try:
            rel_path = os.path.relpath(abs_path, self.project_path)
            with self.lock:
                if rel_path in self.file_info:
                    del self.file_info[rel_path]
        except Exception:
            pass

    def _start_watchdog(self):
        """启动watchdog监控项目目录变更"""
        event_handler = FileCacheHandler(self)
        self.observer = Observer()
        self.observer.schedule(event_handler, self.project_path, recursive=True)
        self.observer.daemon = True
        self.observer.start()

    def stop(self):
        """停止监控"""
        if self.observer:
            self.observer.stop()
            self.observer.join()

    def _save_cache(self):
        """将缓存写入磁盘"""
        try:
            cache_dir = os.path.dirname(self.index_file)
            os.makedirs(cache_dir, exist_ok=True)
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump(self.file_info, f)
        except Exception:
            pass

    def load_cache(self):
        """尝试加载磁盘缓存"""
        try:
            if os.path.exists(self.index_file):
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    self.file_info = json.load(f)
                self.ready = True
        except Exception:
            pass

    def search_files(self, patterns):
        """
        根据模式列表查找匹配文件
        :param patterns: list[str]
        :return: list[str] 相对路径
        """
        matched = set()
        with self.lock:
            for rel_path, info in self.file_info.items():
                filename = info.get("name", "")
                for pattern in patterns:
                    if pattern == "" or pattern in filename:
                        matched.add(rel_path)
        return list(matched)