import { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import "./App.css";

// Smart Code Splitting: Lazy load heavy views, but keep EmptyState synchronous for fast LCP
const IngestView = lazy(() => import("./IngestView"));
const ChatView = lazy(() => import("./ChatView"));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Lightweight fetch helpers (replaces axios, saves ~13KB from bundle)
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.detail || res.statusText);
    err.data = data;
    throw err;
  }
  return data;
}
const apiGet = (url) => api(url);
const apiPost = (url, body) => api(url, { method: "POST", body: JSON.stringify(body) });
const apiDelete = (url) => api(url, { method: "DELETE" });

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

// --- Sidebar Component ---
function Sidebar({ repos, selectedRepo, onSelectRepo, onNewRepo, onDeleteRepo, loading, isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay md:hidden" onClick={onClose} />}
      <div className={`sidebar ${isOpen ? 'open' : ''}`} data-testid="sidebar">
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
                      aria-label={`Delete ${repo.collection_name}`}
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
    </>
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
      role="img"
      aria-label={`Status: ${status}`}
    />
  );
}

// --- Empty State ---
function EmptyState({ onNewRepo, onToggleSidebar }) {
  return (
    <main className="main-content" data-testid="empty-state">
      <div className="p-4 md:hidden border-b border-border absolute top-0 left-0 right-0 bg-background z-10 flex items-center gap-3">
        <button className="text-slate-400" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <HamburgerIcon />
        </button>
        <div className="w-6 h-6 bg-[#002FA7] flex items-center justify-center">
          <span className="text-white font-mono text-[9px] font-bold">RM</span>
        </div>
      </div>
      <div className="empty-state mt-16 md:mt-0">
        <div className="w-16 h-16 bg-[#002FA7] flex items-center justify-center mb-6">
          <span className="text-white font-mono text-2xl font-bold">RM</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight font-[Chivo] mb-2">
          CODEBASE ARCHAEOLOGIST
        </h2>
        <p className="text-sm text-slate-600 max-w-md mb-8">
          Ingest any public GitHub repository and ask intelligent questions about its code.
          Understand architecture, find bugs, and explore functions.
        </p>
        <button data-testid="btn-get-started" className="btn-primary" onClick={onNewRepo}>
          INGEST YOUR FIRST REPO
        </button>
        <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg">
          {[
            { label: "EXPLAIN", desc: "Understand any function or module" },
            { label: "DEBUG", desc: "Find bugs and security issues" },
            { label: "ARCHITECT", desc: "Analyze project structure" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="overline mb-1 text-[#001D66]">{item.label}</div>
              <p className="text-xs text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
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
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const pollRef = useRef(null);

  const fetchRepos = useCallback(async () => {
    try {
      const data = await apiGet(`${API}/repositories`);
      setRepos(data);
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
        const data = await apiGet(`${API}/ingest/status/${currentJobId}`);
        setJobStatus(data);

        if (data.status === "completed" || data.status === "failed") {
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
    setIsSidebarMobileOpen(false);
  };

  const handleIngestStart = async (repoUrl, collectionName) => {
    try {
      const data = await apiPost(`${API}/ingest`, {
        repo_url: repoUrl,
        collection_name: collectionName || undefined,
      });
      setCurrentJobId(data.job_id);
      setJobStatus({ status: "queued", progress_message: "Job queued" });
    } catch (e) {
      console.error("Ingest error:", e);
      setJobStatus({ status: "failed", error: e.data?.detail || e.message });
    }
  };

  const fetchSessions = useCallback(async (collectionName) => {
    try {
      const data = await apiGet(`${API}/chat/sessions/${collectionName}`);
      if (data.sessions && data.sessions.length > 0) {
        const sessionId = data.sessions[0].session_id;
        setCurrentSessionId(sessionId);
        
        setChatLoading(true);
        const historyData = await apiGet(`${API}/chat/history/${sessionId}`);
        const formattedMessages = historyData.messages.map(m => ({
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
    setIsSidebarMobileOpen(false);
    
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
      await apiDelete(`${API}/repository/${collectionName}`);
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
      const data = await apiPost(`${API}/chat`, {
        user_message: text,
        collection_name: selectedRepo.collection_name,
        session_id: currentSessionId || undefined
      });

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Error: ${data.error}`, sources: [] },
        ]);
      } else {
        // If it was a new session, update state
        if (!currentSessionId && data.session_id) {
          setCurrentSessionId(data.session_id);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.answer,
            sources: data.sources || [],
            intent: data.intent,
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `Error: ${e.data?.detail || e.message}`,
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
        isOpen={isSidebarMobileOpen}
        onClose={() => setIsSidebarMobileOpen(false)}
      />

      {view === "empty" && <EmptyState onNewRepo={handleNewRepo} onToggleSidebar={() => setIsSidebarMobileOpen(true)} />}
      
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-[#002FA7] font-mono text-xs">LOADING VIEW...</div></div>}>
        {view === "ingest" && (
          <IngestView
            onIngestStart={handleIngestStart}
            jobStatus={jobStatus}
            onToggleSidebar={() => setIsSidebarMobileOpen(true)}
            HamburgerIcon={HamburgerIcon}
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
            onToggleSidebar={() => setIsSidebarMobileOpen(true)}
            HamburgerIcon={HamburgerIcon}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
