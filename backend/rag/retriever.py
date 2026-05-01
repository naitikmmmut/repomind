from services.vector_store import get_vector_store
from services.llm import get_embeddings, chat_completion
from rag.intent_router import detect_intent
from rag.prompts import EXPLAIN_PROMPT, BUG_PROMPT, ARCHITECTURE_PROMPT, GENERAL_PROMPT, HISTORY_PROMPT, SECURITY_PROMPT
from utils.logger import get_logger
from typing import List
from sqlalchemy.orm import Session
from db.chat_store import get_repo_files_by_paths

logger = get_logger(__name__)

INTENT_TO_PROMPT = {
    "explain": EXPLAIN_PROMPT,
    "bug": BUG_PROMPT,
    "architecture": ARCHITECTURE_PROMPT,
    "history": HISTORY_PROMPT,
    "security": SECURITY_PROMPT,
    "general": GENERAL_PROMPT,
}

def build_context(results: List[dict], db: Session, collection_name: str) -> str:
    context_parts = []
    file_paths = set()
    for r in results:
        meta = r.get("metadata", {})
        fp = meta.get("file_path")
        if fp:
            file_paths.add(fp)

    if file_paths:
        repo_files = get_repo_files_by_paths(db, collection_name, list(file_paths))
        for rf in repo_files:
            context_parts.append(f"--- Full File: {rf.file_path} ---\n{rf.content}\n")

    # Also include commit history chunks if they are retrieved
    for r in results:
        meta = r.get("metadata", {})
        if meta.get("type") == "commit_history":
            content = r.get("content", "")
            context_parts.append(f"--- Git Commit History ---\n{content}\n")

    return "\n".join(context_parts)

def query_codebase(db: Session, user_message: str, collection_name: str, chat_history: List[dict] = None) -> dict:
    intent = detect_intent(user_message)
    logger.info(f"Detected intent: {intent} for query: {user_message[:80]}")

    query_emb = get_embeddings([user_message], input_type="query")[0]

    store = get_vector_store()
    results = store.query(
        collection_name=collection_name,
        query_embedding=query_emb,
        n_results=8
    )

    if not results:
        return {
            "answer": "No relevant code found in this repository. Make sure the repository has been fully ingested.",
            "intent": intent,
            "sources": [],
            "collection_name": collection_name
        }

    context = build_context(results, db, collection_name)
    system_prompt = INTENT_TO_PROMPT.get(intent, GENERAL_PROMPT).format(context=context)

    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    if chat_history:
        for msg in chat_history[-10:]: # Pass the last 10 messages for context memory
            messages.append({"role": msg["role"], "content": msg["content"]})
    else:
        messages.append({"role": "user", "content": user_message})

    answer = chat_completion(messages)

    sources = []
    seen = set()
    for r in results:
        fp = r.get("metadata", {}).get("file_path", "")
        if fp and fp not in seen:
            seen.add(fp)
            sources.append({
                "file_path": fp,
                "language": r.get("metadata", {}).get("language", ""),
                "snippet": r.get("content", "")[:300]
            })

    return {
        "answer": answer,
        "intent": intent,
        "sources": sources,
        "collection_name": collection_name
    }
