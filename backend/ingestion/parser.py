import os
import git
from typing import List, Tuple, Dict
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter
from utils.file_filters import ALLOWED_EXTENSIONS, SKIP_DIRS, MAX_FILE_SIZE
from utils.logger import get_logger

logger = get_logger(__name__)

EXTENSION_TO_LANGUAGE = {
    '.py': Language.PYTHON,
    '.js': Language.JS,
    '.jsx': Language.JS,
    '.ts': Language.TS,
    '.tsx': Language.TS,
    '.java': Language.JAVA,
    '.cpp': Language.CPP,
    '.c': Language.CPP,
    '.h': Language.CPP,
    '.go': Language.GO,
    '.rs': Language.RUST,
    '.rb': Language.RUBY,
    '.md': Language.MARKDOWN,
}

def get_commit_history(repo_path: str, file_path: str, max_count: int = 100) -> List[Dict]:
    """Extracts commit history for a specific file using GitPython."""
    try:
        repo = git.Repo(repo_path)
        commits = []
        # Use paths=file_path to get commits that affected this file
        for commit in repo.iter_commits(paths=file_path, max_count=max_count):
            commits.append({
                "hash": commit.hexsha[:8],
                "author": commit.author.name,
                "date": commit.committed_datetime.isoformat(),
                "message": commit.message.strip(),
            })
        return commits
    except Exception as e:
        logger.warning(f"Could not extract commit history for {file_path}: {e}")
        return []

def parse_repository(repo_path: str, repo_url: str, collection_name: str) -> Tuple[List[dict], dict]:
    chunks = []
    report = {
        "files_processed": 0,
        "chunks_created": 0,
        "languages_detected": set(),
        "ignored_files_count": 0
    }

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for filename in files:
            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, repo_path)
            ext = os.path.splitext(filename)[1].lower()

            if ext not in ALLOWED_EXTENSIONS:
                report["ignored_files_count"] += 1
                continue

            try:
                file_size = os.path.getsize(file_path)
                if file_size > MAX_FILE_SIZE:
                    report["ignored_files_count"] += 1
                    continue

                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                if not content.strip():
                    report["ignored_files_count"] += 1
                    continue

                language = EXTENSION_TO_LANGUAGE.get(ext)
                lang_name = language.value if language else "text"
                report["languages_detected"].add(lang_name)

                if language:
                    splitter = RecursiveCharacterTextSplitter.from_language(
                        language=language,
                        chunk_size=600,
                        chunk_overlap=50
                    )
                else:
                    splitter = RecursiveCharacterTextSplitter(
                        chunk_size=600,
                        chunk_overlap=50
                    )

                docs = splitter.create_documents([content])

                for i, doc in enumerate(docs):
                    chunks.append({
                        "content": doc.page_content,
                        "metadata": {
                            "file_path": relative_path,
                            "repo_url": repo_url,
                            "collection_name": collection_name,
                            "language": lang_name,
                            "chunk_index": i
                        }
                    })

                report["files_processed"] += 1

                # --- Extract and add commit history chunks ---
                history = get_commit_history(repo_path, relative_path)
                for entry in history:
                    chunks.append({
                        "content": f"File: {relative_path}\nCommit: {entry['message']}\nAuthor: {entry['author']}\nDate: {entry['date']}",
                        "metadata": {
                            "type": "commit_history",
                            "file_path": relative_path,
                            "repo_url": repo_url,
                            "collection_name": collection_name,
                            "commit_hash": entry["hash"],
                            "author": entry["author"],
                            "date": entry["date"]
                        }
                    })

            except Exception as e:
                logger.warning(f"Error processing {relative_path}: {e}")
                report["ignored_files_count"] += 1

    report["chunks_created"] = len(chunks)
    report["languages_detected"] = list(report["languages_detected"])

    return chunks, report
