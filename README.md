# RepoMind: Codebase Archaeologist

A tool to ingest public GitHub repositories and ask intelligent codebase questions utilizing NVIDIA NIM, LangChain, ChromaDB, and FastAPI.

## Project Structure

- `frontend/`: React app with Tailwind CSS styling
- `backend/`: FastAPI backend providing API endpoints and background document ingestion

## Setup

### Backend

1. Navigate to `backend` directory
2. Create and activate a Virtual Environment
```sh
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```
3. Install Dependencies
```sh
pip install -r requirements.txt
```
4. Copy Environment Template
```sh
cp .env.example .env
```
Update `.env` with your desired keys (`NVIDIA_API_KEY`, MongoDB info, etc.). Ensure MongoDB is running locally or provide a valid URI in `MONGO_URL`.
5. Run the Server
```sh
uvicorn server:app --reload
```
Server runs on http://localhost:8000.

### Frontend

1. Navigate to the `frontend` directory.
2. Ensure you have Node and NPM/Yarn installed.
3. Install dependencies:
```sh
npm install
```
4. Configure ENV
Copy `.env.example` to `.env` if needed, `REACT_APP_BACKEND_URL` points to `http://localhost:8000`.
5. Run the Frontend 
```sh
npm start
```
Starts on http://localhost:3000.
