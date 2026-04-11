from openai import OpenAI
from config import NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_EMBED_MODEL, NVIDIA_CHAT_MODEL
from utils.logger import get_logger
from typing import List

logger = get_logger(__name__)

_client = None

def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=NVIDIA_BASE_URL,
            api_key=NVIDIA_API_KEY
        )
    return _client

def get_embeddings(texts: List[str], input_type: str = "passage") -> List[List[float]]:
    """
    Generate embeddings via NVIDIA NIM.
    input_type: "passage" for documents being stored, "query" for search queries.
    NVIDIA asymmetric models require this parameter.
    """
    client = get_client()
    all_embeddings = []
    batch_size = 50

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch = [t[:600] if len(t) > 600 else t for t in batch]
        response = client.embeddings.create(
            model=NVIDIA_EMBED_MODEL,
            input=batch,
            encoding_format="float",
            extra_body={"input_type": input_type}
        )
        all_embeddings.extend([item.embedding for item in response.data])

    return all_embeddings

def chat_completion(messages: list, temperature: float = 0.3, max_tokens: int = 2048) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model=NVIDIA_CHAT_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response.choices[0].message.content
