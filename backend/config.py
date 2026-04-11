import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment: development or production
ENV = os.environ.get('ENV', 'development')

# NVIDIA NIM
NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY', '')
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_EMBED_MODEL = "nvidia/nv-embedqa-e5-v5"
NVIDIA_CHAT_MODEL = "meta/llama-3.1-70b-instruct"

# MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'repomind_db')

# Pinecone (production)
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY', '')
PINECONE_INDEX_NAME = os.environ.get('PINECONE_INDEX_NAME', 'repomind')

# ChromaDB (development)
CHROMA_PERSIST_DIR = str(ROOT_DIR / 'chroma_db')
