import sys
from pathlib import Path

# Ensure backend root is in path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, APIRouter, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import re
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from config import ENV, NVIDIA_API_KEY
from ingestion.job_tracker import create_job, update_job, get_job, get_all_jobs
from ingestion.cloner import shallow_clone
from ingestion.parser import parse_repository
from services.llm import get_embeddings
from services.vector_store import get_vector_store
from rag.retriever import query_codebase
from utils.logger import get_logger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = get_logger(__name__)

# ── In-memory repository store (replaces MongoDB) ──────────────────────────
repositories_store: dict = {}

app = FastAPI(title="RepoMind - Codebase Archaeologist")
api_router = APIRouter(prefix="/api")

# --- Models ---
class IngestRequest(BaseModel):
    repo_url: str
    collection_name: Optional[str] = None

class ChatRequest(BaseModel):
    user_message: str
    collection_name: str

class IngestResponse(BaseModel):
    status: str
    job_id: str
    collection_name: str

# --- Helper: sanitize collection name ---
def sanitize_collection_name(repo_url: str) -> str:
    parts = repo_url.rstrip("/").split("/")
    if len(parts) >= 2:
        name = f"{parts[-2]}_{parts[-1]}"
    else:
        name = parts[-1]
    name = re.sub(r'[^a-zA-Z0-9_]', '_', name).lower()
    # ChromaDB requires collection names 3-63 chars, start/end with alphanumeric
    name = name.strip('_')
    if len(name) < 3:
        name = name + "_repo"
    if len(name) > 63:
        name = name[:63]
    return name

# --- Background Ingestion Task ---
def run_ingestion(job_id: str, repo_url: str, collection_name: str):
    update_job(job_id, status="cloning", progress_message="Cloning repository...")
    tmp_dir = None
    try:
        tmp_dir = shallow_clone(repo_url)
        update_job(job_id, status="parsing", progress_message="Parsing and chunking code files...")

        chunks, report = parse_repository(tmp_dir.name, repo_url, collection_name)
        update_job(job_id, status="parsing_complete",
                   progress_message=f"Parsed {report['files_processed']} files into {report['chunks_created']} chunks")

        if not chunks:
            update_job(
                job_id, status="completed",
                progress_message="No code files found in repository",
                report={**report, "message": "No code files found"},
                completed_at=datetime.now(timezone.utc).isoformat()
            )
            repositories_store[collection_name] = {
                **repositories_store.get(collection_name, {}),
                "status": "completed",
                "report": report,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            return

        update_job(job_id, status="embedding",
                   progress_message=f"Generating embeddings for {len(chunks)} chunks...")

        texts = [c["content"] for c in chunks]
        embeddings = get_embeddings(texts)

        update_job(job_id, status="upserting",
                   progress_message="Storing vectors in database...")

        store = get_vector_store()
        ids = [f"{collection_name}_{i}" for i in range(len(chunks))]
        documents = [c["content"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        store.upsert(collection_name, ids, embeddings, documents, metadatas)

        update_job(
            job_id, status="completed",
            progress_message="Ingestion complete",
            report=report,
            completed_at=datetime.now(timezone.utc).isoformat()
        )

        repositories_store[collection_name] = {
            **repositories_store.get(collection_name, {}),
            "status": "completed",
            "report": report,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        logger.info(f"Ingestion complete for {repo_url}: {report}")

    except Exception as e:
        logger.error(f"Ingestion failed for {repo_url}: {e}")
        update_job(
            job_id, status="failed",
            progress_message=f"Ingestion failed: {str(e)}",
            error=str(e),
            completed_at=datetime.now(timezone.utc).isoformat()
        )
        repositories_store[collection_name] = {
            **repositories_store.get(collection_name, {}),
            "status": "failed",
            "error": str(e),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    finally:
        if tmp_dir:
            try:
                tmp_dir.cleanup()
            except Exception:
                pass

# --- API Routes ---
@api_router.get("/")
async def root():
    return {"message": "RepoMind API", "environment": ENV}

@api_router.post("/ingest", response_model=IngestResponse)
async def ingest_repo(request: IngestRequest, background_tasks: BackgroundTasks):
    repo_url = request.repo_url.strip()

    if not repo_url:
        return {"error": "repo_url is required"}

    collection_name = request.collection_name
    if not collection_name:
        collection_name = sanitize_collection_name(repo_url)

    job_id = create_job(repo_url, collection_name)

    repositories_store[collection_name] = {
        "repo_url": repo_url,
        "collection_name": collection_name,
        "status": "ingesting",
        "job_id": job_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    background_tasks.add_task(run_ingestion, job_id, repo_url, collection_name)

    return IngestResponse(
        status="Ingestion started in background",
        job_id=job_id,
        collection_name=collection_name
    )

@api_router.get("/ingest/status/{job_id}")
async def get_ingest_status(job_id: str):
    job = get_job(job_id)
    if not job:
        return {"error": "Job not found", "job_id": job_id}
    return job

@api_router.get("/ingest/jobs")
async def list_jobs():
    return get_all_jobs()

@api_router.post("/chat")
async def chat(request: ChatRequest):
    if not NVIDIA_API_KEY:
        return {"error": "NVIDIA API key not configured. Set NVIDIA_API_KEY in .env"}

    try:
        result = query_codebase(request.user_message, request.collection_name)
        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"error": str(e)}

@api_router.get("/repositories")
async def list_repositories():
    return list(repositories_store.values())

@api_router.delete("/repository/{collection_name}")
async def delete_repository(collection_name: str):
    store = get_vector_store()
    store.delete_collection(collection_name)
    repositories_store.pop(collection_name, None)
    return {"status": "deleted", "collection_name": collection_name}

# --- App Setup ---
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
