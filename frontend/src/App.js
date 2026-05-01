import { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import "./App.css";
import axios from "axios";
import EmptyState from "./EmptyState";

const IngestView = lazy(() => import("./IngestView"));
const ChatView = lazy(() => import("./ChatView"));
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// --- Sidebar Component ---
function Sidebar({ repos, selectedRepo, onSelectRepo, onNewRepo, onDeleteRepo, loading }) {
  return (
    <div className="sidebar" data-testid="sidebar">
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
            <span className="text-white font-mono text-xs font-bold">RM</span>
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight font-[Chivo]">REPOMIND</h1>
            <p className="overline mt-0.5">Codebase Archaeologist</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <button
          data-testid="btn-new-repo"
          className="btn-primary w-full"
          onClick={onNewRepo}
        >
          + NEW REPOSITORY
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-2">
          <span className="overline">Repositories ({repos.length})</span>
        </div>

        <div className="sidebar-repos mb-4">
          {loading ? (
            <div className="p-4 text-center">
              <span className="font-mono text-xs text-slate-600">LOADING...</span>
            </div>
          ) : repos.length === 0 ? (
            <div className="p-4 text-center">
              <span className="font-mono text-xs text-slate-600">NO REPOS YET</span>
            </div>
          ) : (
            repos.map((repo) => (
              <div
                key={repo.collection_name}
                data-testid={`repo-item-${repo.collection_name}`}
                className={`repo-item ${selectedRepo?.collection_name === repo.collection_name ? "active" : ""}`}
                onClick={() => onSelectRepo(repo)}
              >
                <div className="flex-1 truncate">
                  <div className="truncate font-bold text-[11px]">{repo.collection_name}</div>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <StatusDot status={repo.status} />
                  <button
                    data-testid={`btn-delete-repo-${repo.collection_name}`}
                    className="btn-destructive !p-1 !text-[8px] !h-5 !w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRepo(repo.collection_name);
                    }}
                  >
                    DEL
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    completed: "bg-green-500",
    ingesting: "bg-yellow-500 animate-pulse",
    failed: "bg-red-500",
  };
  return (
    <div
      className={`w-2 h-2 ${colors[status] || "bg-slate-400"}`}
      title={status}
    />
  );
}



// --- Main App ---
function App() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [view, setView] = useState("empty"); // empty, ingest, chat
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [reposLoading, setReposLoading] = useState(true);
  const [jobStatus, setJobStatus] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const pollRef = useRef(null);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/repositories`);
      setRepos(res.data);
    } catch (e) {
      console.error("Failed to fetch repos:", e);
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // Poll ingestion status
  useEffect(() => {
    if (!currentJobId) return;

    const poll = async () => {
      try {
        const res = await axios.get(`${API}/ingest/status/${currentJobId}`);
        setJobStatus(res.data);

        if (res.data.status === "completed" || res.data.status === "failed") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setCurrentJobId(null);
          fetchRepos();
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentJobId, fetchRepos]);

  const handleNewRepo = () => {
    setView("ingest");
    setJobStatus(null);
    setCurrentJobId(null);
  };

  const handleIngestStart = async (repoUrl, collectionName) => {
    try {
      const res = await axios.post(`${API}/ingest`, {
        repo_url: repoUrl,
        collection_name: collectionName || undefined,
      });
      setCurrentJobId(res.data.job_id);
      setJobStatus({ status: "queued", progress_message: "Job queued" });
    } catch (e) {
      console.error("Ingest error:", e);
      setJobStatus({ status: "failed", error: e.response?.data?.detail || e.message });
    }
  };

  const fetchSessions = useCallback(async (collectionName) => {
    try {
      const res = await axios.get(`${API}/chat/sessions/${collectionName}`);
      if (res.data.sessions && res.data.sessions.length > 0) {
        const sessionId = res.data.sessions[0].session_id;
        setCurrentSessionId(sessionId);
        
        setChatLoading(true);
        const historyRes = await axios.get(`${API}/chat/history/${sessionId}`);
        const formattedMessages = historyRes.data.messages.map(m => ({
          ...m,
          role: m.role === "assistant" ? "ai" : m.role
        }));
        setMessages(formattedMessages);
        setChatLoading(false);
      }
    } catch (e) {
      console.error("Failed to fetch sessions/history:", e);
      setChatLoading(false);
    }
  }, []);

  const handleSelectRepo = (repo) => {
    if (repo.status !== "completed") return;
    
    const isSameRepo = selectedRepo?.collection_name === repo.collection_name;
    setSelectedRepo(repo);
    setView("chat");
    
    // Only clear messages if we're switching to a DIFFERENT repo
    if (!isSameRepo) {
      setMessages([]);
      setCurrentSessionId(null);
      fetchSessions(repo.collection_name);
    } else if (messages.length === 0) {
      // If same repo but messages are empty (e.g. after refresh), fetch
      fetchSessions(repo.collection_name);
    }
  };


  const handleDeleteRepo = async (collectionName) => {
    try {
      await axios.delete(`${API}/repository/${collectionName}`);
      setRepos((prev) => prev.filter((r) => r.collection_name !== collectionName));
      if (selectedRepo?.collection_name === collectionName) {
        setSelectedRepo(null);
        setView("empty");
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedRepo) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, {
        user_message: text,
        collection_name: selectedRepo.collection_name,
        session_id: currentSessionId || undefined
      });

      if (res.data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Error: ${res.data.error}`, sources: [] },
        ]);
      } else {
        // If it was a new session, update state
        if (!currentSessionId && res.data.session_id) {
          setCurrentSessionId(res.data.session_id);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: res.data.answer,
            sources: res.data.sources || [],
            intent: res.data.intent,
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `Error: ${e.response?.data?.detail || e.message}`,
          sources: [],
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-root">
      <Sidebar
        repos={repos}
        selectedRepo={selectedRepo}
        onSelectRepo={handleSelectRepo}
        onNewRepo={handleNewRepo}
        onDeleteRepo={handleDeleteRepo}
        loading={reposLoading}
      />

      {view === "empty" && <EmptyState onNewRepo={handleNewRepo} />}
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-slate-500 font-mono text-xs">Loading...</div></div>}>
        {view === "ingest" && (
          <IngestView
            onIngestStart={handleIngestStart}
            jobStatus={jobStatus}
            onBack={() => {
              setView(selectedRepo ? "chat" : "empty");
              setJobStatus(null);
              setCurrentJobId(null);
            }}
          />
        )}
        {view === "chat" && selectedRepo && (
          <ChatView
            repo={selectedRepo}
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={chatLoading}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
