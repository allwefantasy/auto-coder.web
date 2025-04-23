
import os
import asyncio
import pytest
import tempfile
import time
from pathlib import Path
from autocoder.common.directory_cache.cache import DirectoryCache, initialize_cache
from autocoder.common.file_monitor.monitor import get_file_monitor, FileMonitor

# Fixture to create a temporary directory structure for testing
@pytest.fixture(scope="function") # Use function scope for isolation between tests
def temp_project():
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        (root / "src").mkdir()
        (root / "src" / "main.py").write_text("print('hello')")
        (root / "src" / "utils.py").write_text("def helper(): pass")
        (root / "tests").mkdir()
        (root / "tests" / "test_main.py").write_text("import main")
        (root / ".gitignore").write_text("*.log\n__pycache__/\ndist/\n")
        (root / "data").mkdir()
        (root / "data" / "file.log").write_text("log data")
        (root / "dist").mkdir()
        (root / "dist" / "package.tar.gz").write_text("binary")
        yield root

# Fixture to reset the singleton instance and monitor before each test
@pytest.fixture(autouse=True)
def reset_singleton(monkeypatch):
    # Reset DirectoryCache singleton
    DirectoryCache._instance = None
    # Reset FileMonitor singleton and stop any running monitor
    if FileMonitor._instance:
        if FileMonitor._instance.is_running():
            FileMonitor._instance.stop()
        FileMonitor._instance = None
    yield # Run the test
    # Cleanup after test if needed (already done by resetting)


@pytest.mark.asyncio
async def test_initialization_and_build(temp_project):
    """Test cache initialization and initial file scanning."""
    root_str = str(temp_project)
    initialize_cache(root_str) # Initialize using the helper
    cache = DirectoryCache.get_instance() # Get the initialized instance

    # Check if non-ignored files are present
    expected_files = {
        os.path.abspath(temp_project / "src" / "main.py"),
        os.path.abspath(temp_project / "src" / "utils.py"),
        os.path.abspath(temp_project / "tests" / "test_main.py"),
        os.path.abspath(temp_project / ".gitignore"), # .gitignore itself is usually not ignored by default
    }
    # Allow some time for the initial scan to complete if it runs async internally
    # Although _build is sync, let's wait just in case of future changes
    await asyncio.sleep(0.1)

    async with cache.lock: # Access files_set safely
        # Use absolute paths for comparison
        cached_files_abs = {os.path.abspath(f) for f in cache.files_set}

    assert cached_files_abs == expected_files

    # Check if ignored files are absent
    ignored_files = {
        os.path.abspath(temp_project / "data" / "file.log"),
        os.path.abspath(temp_project / "dist" / "package.tar.gz"),
    }
    assert not any(f in cached_files_abs for f in ignored_files)


@pytest.mark.asyncio
async def test_query_all(temp_project):
    """Test querying all files."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    await asyncio.sleep(0.1) # Allow build time

    result = await cache.query(["*"]) # Query all
    result_abs = {os.path.abspath(f) for f in result}

    expected_files = {
        os.path.abspath(temp_project / "src" / "main.py"),
        os.path.abspath(temp_project / "src" / "utils.py"),
        os.path.abspath(temp_project / "tests" / "test_main.py"),
        os.path.abspath(temp_project / ".gitignore"),
    }
    assert result_abs == expected_files

@pytest.mark.asyncio
async def test_query_specific_pattern(temp_project):
    """Test querying with a specific glob pattern."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    await asyncio.sleep(0.1)

    result = await cache.query(["*.py"]) # Query python files
    result_abs = {os.path.abspath(f) for f in result}

    expected_files = {
        os.path.abspath(temp_project / "src" / "main.py"),
        os.path.abspath(temp_project / "src" / "utils.py"),
        os.path.abspath(temp_project / "tests" / "test_main.py"),
    }
    assert result_abs == expected_files

@pytest.mark.asyncio
async def test_query_subdir_pattern(temp_project):
    """Test querying files within a subdirectory."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    await asyncio.sleep(0.1)

    result = await cache.query(["src/*.py"]) # Query python files in src
    result_abs = {os.path.abspath(f) for f in result}

    expected_files = {
        os.path.abspath(temp_project / "src" / "main.py"),
        os.path.abspath(temp_project / "src" / "utils.py"),
    }
    assert result_abs == expected_files


@pytest.mark.asyncio
async def test_query_substring(temp_project):
    """Test querying with a substring."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    await asyncio.sleep(0.1)

    result = await cache.query(["main"]) # Query files containing "main"
    result_abs = {os.path.abspath(f) for f in result}

    expected_files = {
        os.path.abspath(temp_project / "src" / "main.py"),
        os.path.abspath(temp_project / "tests" / "test_main.py"),
    }
    assert result_abs == expected_files


@pytest.mark.asyncio
async def test_file_addition(temp_project):
    """Test adding a file and cache update."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    monitor = get_file_monitor(root_str) # Ensure monitor is active

    # Add a new file
    new_file_path = temp_project / "src" / "new_module.py"
    new_file_abs = os.path.abspath(new_file_path)
    new_file_path.write_text("def new_func(): pass")

    # Allow time for the monitor to detect the change and update the cache
    await asyncio.sleep(monitor.debounce * 1.5) # Wait longer than debounce

    async with cache.lock:
        assert new_file_abs in cache.files_set

    # Verify query reflects the addition
    result = await cache.query(["*.py"])
    result_abs = {os.path.abspath(f) for f in result}
    assert new_file_abs in result_abs


@pytest.mark.asyncio
async def test_file_deletion(temp_project):
    """Test deleting a file and cache update."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    monitor = get_file_monitor(root_str)

    file_to_delete_path = temp_project / "src" / "utils.py"
    file_to_delete_abs = os.path.abspath(file_to_delete_path)

    # Ensure file exists initially
    async with cache.lock:
        assert file_to_delete_abs in cache.files_set

    # Delete the file
    os.remove(file_to_delete_path)

    # Allow time for the monitor to detect the change
    await asyncio.sleep(monitor.debounce * 1.5)

    # Check cache and query results
    async with cache.lock:
        assert file_to_delete_abs not in cache.files_set

    result = await cache.query(["*.py"])
    result_abs = {os.path.abspath(f) for f in result}
    assert file_to_delete_abs not in result_abs


@pytest.mark.asyncio
async def test_file_modification(temp_project):
    """Test modifying a file (should not affect cache set)."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    monitor = get_file_monitor(root_str)

    file_to_modify_path = temp_project / "src" / "main.py"
    file_to_modify_abs = os.path.abspath(file_to_modify_path)

    initial_size = len(cache.files_set)

    # Modify the file
    with open(file_to_modify_path, "a") as f:
        f.write("\n# modified")

    # Allow time for monitor detection
    await asyncio.sleep(monitor.debounce * 1.5)

    # Check that the file is still in the cache set and set size is unchanged
    async with cache.lock:
        assert file_to_modify_abs in cache.files_set
        assert len(cache.files_set) == initial_size


@pytest.mark.asyncio
async def test_ignored_file_addition(temp_project):
    """Test adding a file that should be ignored."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    monitor = get_file_monitor(root_str)

    ignored_file_path = temp_project / "src" / "temp.log"
    ignored_file_abs = os.path.abspath(ignored_file_path)

    # Add an ignored file type
    ignored_file_path.write_text("log content")

    # Allow time for the monitor
    await asyncio.sleep(monitor.debounce * 1.5)

    # Check it was NOT added to the cache
    async with cache.lock:
        assert ignored_file_abs not in cache.files_set

@pytest.mark.asyncio
async def test_gitignore_update_makes_file_ignored(temp_project):
    """Test updating .gitignore to ignore an existing file."""
    root_str = str(temp_project)
    cache = DirectoryCache.get_instance(root_str)
    monitor = get_file_monitor(root_str)

    file_to_ignore_path = temp_project / "src" / "utils.py"
    file_to_ignore_abs = os.path.abspath(file_to_ignore_path)

    # Ensure file is initially tracked
    async with cache.lock:
        assert file_to_ignore_abs in cache.files_set

    # Update .gitignore to ignore the file
    gitignore_path = temp_project / ".gitignore"
    with open(gitignore_path, "a") as f:
        f.write("\nsrc/utils.py\n")

    # Trigger a change event for the *ignored file* itself (e.g., modify it)
    # This is necessary because simply changing .gitignore doesn't automatically
    # trigger re-evaluation of existing files in the monitor unless they change.
    # A more robust cache might need a way to re-scan on .gitignore changes.
    # For this test, we simulate a change to the file *after* .gitignore is updated.
    time.sleep(0.1) # Ensure gitignore write is flushed
    file_to_ignore_path.touch() # Trigger modification event

    # Allow time for monitor detection and cache update
    await asyncio.sleep(monitor.debounce * 1.5)

    # Check the file is now removed from the cache
    # Note: This depends on the monitor detecting the change AND the callback
    # re-checking the ignore status based on the *updated* .gitignore.
    # The current `should_ignore` likely needs to clear its own cache if .gitignore changes.
    # Let's assume `should_ignore` handles this for the test.
    # TODO: Verify `should_ignore` clears its cache or re-reads .gitignore appropriately.
    # For now, we expect the file to be removed upon its own change event.
    async with cache.lock:
        assert file_to_ignore_abs not in cache.files_set


@pytest.mark.asyncio
async def test_different_root_reinitialization(temp_project, monkeypatch):
    """Test that requesting a different root re-initializes the cache."""
    root1 = str(temp_project)
    cache1 = DirectoryCache.get_instance(root1)
    assert cache1.root == os.path.abspath(root1)

    # Create a second temporary directory
    with tempfile.TemporaryDirectory() as tmpdir2:
        root2 = Path(tmpdir2)
        (root2 / "another_file.txt").write_text("test")
        root2_str = str(root2)

        # Request instance with a different root
        cache2 = DirectoryCache.get_instance(root2_str)

        # Check if the instance was re-initialized
        assert cache2 is DirectoryCache._instance # Should update the singleton
        assert cache2.root == os.path.abspath(root2_str)
        assert cache1 is not cache2 # Should be a new instance conceptually

        # Verify the content of the new cache
        await asyncio.sleep(0.1) # Allow build time
        async with cache2.lock:
            assert len(cache2.files_set) == 1
            assert os.path.abspath(root2 / "another_file.txt") in cache2.files_set
