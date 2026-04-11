from datetime import datetime, timezone
import uuid
from typing import Dict, Optional

_jobs: Dict[str, dict] = {}

def create_job(repo_url: str, collection_name: str) -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id": job_id,
        "repo_url": repo_url,
        "collection_name": collection_name,
        "status": "queued",
        "progress_message": "Job queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "report": None,
        "error": None
    }
    return job_id

def update_job(job_id: str, **kwargs):
    if job_id in _jobs:
        _jobs[job_id].update(kwargs)

def get_job(job_id: str) -> Optional[dict]:
    return _jobs.get(job_id)

def get_all_jobs() -> list:
    return list(_jobs.values())
