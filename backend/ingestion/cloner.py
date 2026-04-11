import tempfile
import git
from utils.logger import get_logger

logger = get_logger(__name__)

def clone_repository(repo_url: str) -> tempfile.TemporaryDirectory:
    tmp_dir = tempfile.TemporaryDirectory()
    logger.info(f"Cloning {repo_url} into {tmp_dir.name}")
    git.Repo.clone_from(repo_url, tmp_dir.name)
    logger.info(f"Clone complete: {tmp_dir.name}")
    return tmp_dir
