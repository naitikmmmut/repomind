import os
from abc import ABC, abstractmethod
from typing import List, Optional
from config import ENV, CHROMA_PERSIST_DIR, PINECONE_API_KEY, PINECONE_INDEX_NAME
from utils.logger import get_logger

logger = get_logger(__name__)

class VectorStoreBase(ABC):
    @abstractmethod
    def upsert(self, collection_name: str, ids: List[str], embeddings: List[List[float]], documents: List[str], metadatas: List[dict]):
        pass

    @abstractmethod
    def query(self, collection_name: str, query_embedding: List[float], n_results: int = 5, filter_metadata: Optional[dict] = None) -> List[dict]:
        pass

    @abstractmethod
    def delete_collection(self, collection_name: str):
        pass

    @abstractmethod
    def list_collections(self) -> List[str]:
        pass

class ChromaVectorStore(VectorStoreBase):
    def __init__(self):
        import chromadb
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
        self._client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        logger.info(f"ChromaDB initialized at {CHROMA_PERSIST_DIR}")

    def _get_or_create_collection(self, name: str):
        return self._client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )

    def upsert(self, collection_name, ids, embeddings, documents, metadatas):
        collection = self._get_or_create_collection(collection_name)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            collection.upsert(
                ids=ids[i:i + batch_size],
                embeddings=embeddings[i:i + batch_size],
                documents=documents[i:i + batch_size],
                metadatas=metadatas[i:i + batch_size]
            )

    def query(self, collection_name, query_embedding, n_results=5, filter_metadata=None):
        try:
            collection = self._client.get_collection(collection_name)
        except Exception:
            return []

        kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": n_results
        }
        if filter_metadata:
            kwargs["where"] = filter_metadata

        results = collection.query(**kwargs)

        output = []
        if results and results['documents'] and results['documents'][0]:
            for i in range(len(results['documents'][0])):
                output.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if results['distances'] else None
                })
        return output

    def delete_collection(self, collection_name):
        try:
            self._client.delete_collection(collection_name)
            logger.info(f"Deleted collection: {collection_name}")
        except Exception as e:
            logger.warning(f"Could not delete collection {collection_name}: {e}")

    def list_collections(self):
        collections = self._client.list_collections()
        result = []
        for c in collections:
            if isinstance(c, str):
                result.append(c)
            elif hasattr(c, 'name'):
                result.append(c.name)
            else:
                result.append(str(c))
        return result

class PineconeVectorStore(VectorStoreBase):
    def __init__(self):
        from pinecone import Pinecone, ServerlessSpec
        import time

        self._pc = Pinecone(api_key=PINECONE_API_KEY)

        # Auto-create the index if it doesn't exist
        existing_indexes = [idx.name for idx in self._pc.list_indexes()]
        if PINECONE_INDEX_NAME not in existing_indexes:
            logger.info(f"Creating Pinecone index '{PINECONE_INDEX_NAME}'...")
            self._pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=1024,  # nvidia/nv-embedqa-e5-v5 output dimension
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
            # Wait for the index to be ready
            while not self._pc.describe_index(PINECONE_INDEX_NAME).status.get("ready", False):
                logger.info("Waiting for Pinecone index to be ready...")
                time.sleep(2)
            logger.info(f"Pinecone index '{PINECONE_INDEX_NAME}' created and ready.")

        self._index = self._pc.Index(PINECONE_INDEX_NAME)
        logger.info("Pinecone initialized")

    def upsert(self, collection_name, ids, embeddings, documents, metadatas):
        vectors = []
        for i in range(len(ids)):
            meta = {**metadatas[i], "document": documents[i][:1000]}
            vectors.append({
                "id": ids[i],
                "values": embeddings[i],
                "metadata": meta
            })

        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            self._index.upsert(
                vectors=vectors[i:i + batch_size],
                namespace=collection_name
            )

    def query(self, collection_name, query_embedding, n_results=5, filter_metadata=None):
        kwargs = {
            "vector": query_embedding,
            "top_k": n_results,
            "include_metadata": True,
            "namespace": collection_name
        }
        if filter_metadata:
            kwargs["filter"] = filter_metadata

        results = self._index.query(**kwargs)

        output = []
        for match in results.matches:
            meta = dict(match.metadata) if match.metadata else {}
            doc = meta.pop("document", "")
            output.append({
                "content": doc,
                "metadata": meta,
                "score": match.score
            })
        return output

    def delete_collection(self, collection_name):
        try:
            self._index.delete(delete_all=True, namespace=collection_name)
            logger.info(f"Deleted namespace: {collection_name}")
        except Exception as e:
            logger.warning(f"Could not delete namespace {collection_name}: {e}")

    def list_collections(self):
        return []

_store_instance = None

def get_vector_store() -> VectorStoreBase:
    global _store_instance
    if _store_instance is None:
        if ENV == "production":
            _store_instance = PineconeVectorStore()
        else:
            _store_instance = ChromaVectorStore()
    return _store_instance
