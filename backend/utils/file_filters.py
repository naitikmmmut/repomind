import os

ALLOWED_EXTENSIONS = {
    '.py', '.js', '.ts', '.jsx', '.tsx',
    '.java', '.cpp', '.c', '.h',
    '.go', '.rs', '.rb', '.md'
}

SKIP_DIRS = {
    '.git', 'node_modules', '__pycache__', 'venv', '.venv',
    'dist', 'build', '.next', '.nuxt', 'target', 'bin', 'obj',
    '.tox', '.mypy_cache', '.pytest_cache', 'egg-info'
}

MAX_FILE_SIZE = 500 * 1024  # 500KB

def should_include_file(file_path: str, file_size: int) -> bool:
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False
    if file_size > MAX_FILE_SIZE:
        return False
    parts = file_path.replace('\\', '/').split('/')
    if any(skip in parts for skip in SKIP_DIRS):
        return False
    return True

def get_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()
