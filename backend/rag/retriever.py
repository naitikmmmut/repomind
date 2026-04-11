from services.vector_store import get_vector_store
from services.llm import get_embeddings, chat_completion
from rag.intent_router import detect_intent
from rag.prompts import EXPLAIN_PROMPT, BUG_PROMPT, ARCHITECTURE_PROMPT, GENERAL_PROMPT
from utils.logger import get_logger
from typing import List

logger = get_logger(__name__)

INTENT_TO_PROMPT = {
    "explain": EXPLAIN_PROMPT,
    "bug": BUG_PROMPT,
    "architecture": ARCHITECTURE_PROMPT,
    "general": GENERAL_PROMPT,
}

def build_context(results: List[dict]) -> str:
    context_parts = []
    for r in results:
        meta = r.get("metadata", {})
        file_path = meta.get("file_path", "unknown")
        language = meta.get("language", "")
        content = r.get("content", "")
        context_parts.append(f"--- File: {file_path} ({language}) ---\n{content}\n")
    return "\n".join(context_parts)

def query_codebase(user_message: str, collection_name: str) -> dict:
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

    context = build_context(results)
    system_prompt = INTENT_TO_PROMPT.get(intent, GENERAL_PROMPT).format(context=context)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

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
