from sqlalchemy.orm import Session
from db.database import ChatMessage, ChatSession, Repository, RepositoryFile
from datetime import datetime, timezone
import uuid

def create_session(db: Session, collection_name: str, first_message: str) -> ChatSession:
    """Creates a new chat session, auto-titles it from the first message."""
    # Title = first 60 chars of the first message
    title = first_message[:60] + ("..." if len(first_message) > 60 else "")
    
    session = ChatSession(
        id=str(uuid.uuid4()),
        collection_name=collection_name,
        title=title,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def save_message(
    db: Session,
    session_id: str,
    collection_name: str,
    role: str,
    content: str,
    intent: str = None,
) -> ChatMessage:
    """Saves a single message (user or assistant) to the DB."""
    msg = ChatMessage(
        session_id=session_id,
        collection_name=collection_name,
        role=role,
        content=content,
        intent=intent,
    )
    db.add(msg)

    # Update session's updated_at timestamp
    db.query(ChatSession).filter(ChatSession.id == session_id).update(
        {"updated_at": datetime.now(timezone.utc)}
    )
    db.commit()
    return msg

def get_session_messages(db: Session, session_id: str) -> list[ChatMessage]:
    """Returns all messages in a session, ordered by time."""
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp)
        .all()
    )

def get_repo_messages(db: Session, collection_name: str) -> list[ChatMessage]:
    """Returns all messages for a repo across all sessions, ordered by time."""
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.collection_name == collection_name)
        .order_by(ChatMessage.timestamp)
        .all()
    )

def get_sessions_for_repo(db: Session, collection_name: str) -> list[ChatSession]:
    """Returns all chat sessions for a given repo, newest first."""
    return (
        db.query(ChatSession)
        .filter(ChatSession.collection_name == collection_name)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

def get_all_sessions(db: Session) -> list[ChatSession]:
    """Returns every session across all repos."""
    return db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()

def delete_session(db: Session, session_id: str):
    """Deletes a session and all its messages."""
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.query(ChatSession).filter(ChatSession.id == session_id).delete()
    db.commit()

# --- Repository CRUD ---

def save_repo(db: Session, repo_url: str, collection_name: str, status: str, report: dict = None) -> Repository:
    """Updates or creates a repository record."""
    repo = db.query(Repository).filter(Repository.collection_name == collection_name).first()
    if repo:
        repo.status = status
        repo.report = report
        repo.updated_at = datetime.now(timezone.utc)
    else:
        repo = Repository(
            collection_name=collection_name,
            repo_url=repo_url,
            status=status,
            report=report
        )
        db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo

def get_repo(db: Session, collection_name: str) -> Repository:
    """Fetches a single repo's metadata."""
    return db.query(Repository).filter(Repository.collection_name == collection_name).first()

def get_all_repos(db: Session) -> list[Repository]:
    """Returns all repositories ordered by update time."""
    return db.query(Repository).order_by(Repository.updated_at.desc()).all()

def delete_repo(db: Session, collection_name: str):
    """Deletes a repository and all its chat history."""
    # Delete related chat history first
    db.query(ChatMessage).filter(ChatMessage.collection_name == collection_name).delete()
    db.query(ChatSession).filter(ChatSession.collection_name == collection_name).delete()
    # Delete related files
    db.query(RepositoryFile).filter(RepositoryFile.collection_name == collection_name).delete()
    # Delete repo
    db.query(Repository).filter(Repository.collection_name == collection_name).delete()
    db.commit()

def save_repo_file(db: Session, collection_name: str, file_path: str, content: str):
    """Saves the full content of a file for CAG."""
    repo_file = RepositoryFile(
        collection_name=collection_name,
        file_path=file_path,
        content=content
    )
    db.add(repo_file)

def get_repo_files_by_paths(db: Session, collection_name: str, file_paths: list[str]) -> list[RepositoryFile]:
    """Retrieves full file contents by their paths."""
    return db.query(RepositoryFile).filter(
        RepositoryFile.collection_name == collection_name,
        RepositoryFile.file_path.in_(file_paths)
    ).all()
