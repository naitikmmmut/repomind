import { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import "./App.css";
import axios from "axios";

const MessageContent = lazy(() => import("./MarkdownRenderer"));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
    />
  );
}

// --- Ingest View ---
function IngestView({ onIngestStart, jobStatus, onBack, onToggleSidebar }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!repoUrl.trim()) return;
    setSubmitting(true);
    await onIngestStart(repoUrl.trim(), collectionName.trim() || undefined);
    setSubmitting(false);
  };

  const statusSteps = [
    { key: "queued", label: "Job queued" },
    { key: "cloning", label: "Cloning repository" },
    { key: "parsing", label: "Parsing code files" },
    { key: "parsing_complete", label: "Parsing complete" },
    { key: "embedding", label: "Generating embeddings" },
    { key: "upserting", label: "Storing vectors" },
    { key: "completed", label: "Ingestion complete" },
  ];

  const getStepClass = (stepKey) => {
    if (!jobStatus) return "";
    const currentIdx = statusSteps.findIndex((s) => s.key === jobStatus.status);
    const stepIdx = statusSteps.findIndex((s) => s.key === stepKey);
    if (jobStatus.status === "failed") {
      return stepIdx <= currentIdx ? "failed" : "";
    }
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "";
  };

  const progressPercent = (() => {
    if (!jobStatus) return 0;
    const idx = statusSteps.findIndex((s) => s.key === jobStatus.status);
    if (jobStatus.status === "completed") return 100;
    if (jobStatus.status === "failed") return 0;
    return Math.max(5, Math.round(((idx + 1) / statusSteps.length) * 100));
  })();

  return (
    <main className="main-content" data-testid="ingest-view">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-slate-400" onClick={onToggleSidebar}>
            <HamburgerIcon />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight font-[Chivo]">Ingest Repository</h2>
            <p className="text-sm text-slate-600 mt-1">Paste a public GitHub repository URL to analyze its codebase</p>
          </div>
        </div>
        <button className="btn-secondary text-xs" onClick={onBack} data-testid="btn-back">
          BACK
        </button>
      </div>

      <div className="p-6 max-w-3xl">
        <div className="mb-4">
          <label className="overline block mb-2">Repository URL</label>
          <input
            data-testid="input-repo-url"
            type="text"
            className="input-field"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={!!jobStatus}
          />
        </div>

        <div className="mb-6">
          <label className="overline block mb-2">Collection Name (optional)</label>
          <input
            data-testid="input-collection-name"
            type="text"
            className="input-field"
            placeholder="Auto-generated from URL"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            disabled={!!jobStatus}
          />
        </div>

        {!jobStatus && (
          <button
            data-testid="btn-ingest-repo"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!repoUrl.trim() || submitting}
          >
            {submitting ? "STARTING..." : "START INGESTION"}
          </button>
        )}

        {jobStatus && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="overline">Ingestion Progress</span>
              <span className="font-mono text-xs">{progressPercent}%</span>
            </div>
            <div className="progress-bar mb-4">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="status-terminal" data-testid="ingestion-status-terminal">
              {statusSteps.map((step) => (
                <div key={step.key} className={`status-line ${getStepClass(step.key)}`}>
                  {step.label}
                </div>
              ))}
              {jobStatus.status === "failed" && jobStatus.error && (
                <div className="status-line failed mt-2 text-red-400">
                  Error: {jobStatus.error}
                </div>
              )}
              {jobStatus.status === "completed" && jobStatus.report && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-green-400">
                    Files: {jobStatus.report.files_processed} | Chunks: {jobStatus.report.chunks_created} | Languages: {jobStatus.report.languages_detected?.join(", ")}
                  </div>
                  {jobStatus.report.ignored_files_count > 0 && (
                    <div className="text-slate-600">
                      Ignored: {jobStatus.report.ignored_files_count} files
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// --- Chat View ---
function ChatView({ repo, messages, onSendMessage, loading, onToggleSidebar }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="main-content" data-testid="chat-view">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-slate-400" onClick={onToggleSidebar}>
            <HamburgerIcon />
          </button>
          <div className="w-6 h-6 bg-[#002FA7] flex items-center justify-center">
            <span className="text-white font-mono text-[9px] font-bold">Q</span>
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight font-[Chivo]">
              {repo.collection_name}
            </h2>
            <p className="text-xs text-slate-600 font-mono truncate max-w-md">{repo.repo_url}</p>
          </div>
        </div>
      </div>

      <div className="chat-messages" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="overline mb-4">Ask a question about this codebase</div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {[
                "Explain the architecture of this project",
                "Find potential bugs or issues",
                "What are the main entry points?",
                "How is error handling done?",
              ].map((q) => (
                <button
                  key={q}
                  className="btn-secondary !text-[11px] !px-3 !py-2"
                  onClick={() => {
                    onSendMessage(q);
                  }}
                  data-testid={`suggestion-${q.slice(0, 10).replace(/\s/g, '-').toLowerCase()}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`message-bubble ${msg.role}`} data-testid={`message-${msg.role}-${i}`}>
              <div className="overline mb-2">{msg.role === "user" ? "You" : "RepoMind"}</div>
              {msg.role === "ai" ? (
                <Suspense fallback={<div className="text-xs text-slate-600 animate-pulse">Loading message...</div>}>
                  <MessageContent content={msg.content} />
                </Suspense>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>

            {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
              <div className="mb-4 pl-1">
                <span className="overline">Sources:</span>
                <div className="flex flex-wrap mt-1">
                  {msg.sources.map((s, j) => (
                    <span key={j} className="source-chip" data-testid={`source-chip-${j}`}>
                      {s.file_path}
                      <span className="text-[9px] opacity-50 ml-1">{s.language}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-bubble ai" data-testid="loading-indicator">
            <div className="overline mb-2">RepoMind</div>
            <div className="font-mono text-xs text-slate-600">
              <span className="animate-pulse">Analyzing codebase...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area" data-testid="chat-input-area">
        <div className="flex gap-3">
          <input
            data-testid="chat-input"
            type="text"
            className="input-field flex-1"
            placeholder="Ask about the codebase... (explain, find bugs, architecture)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            data-testid="btn-send-message"
            className="btn-primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            SEND
          </button>
        </div>
        <div className="mt-2 flex gap-4">
          <span className="overline opacity-50">Enter to send</span>
          {repo.report && (
            <span className="overline opacity-50">
              {repo.report.files_processed} files | {repo.report.chunks_created} chunks
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

// --- Empty State ---
function EmptyState({ onNewRepo, onToggleSidebar }) {
  return (
    <main className="main-content" data-testid="empty-state">
      <div className="p-4 md:hidden border-b border-border absolute top-0 left-0 right-0 bg-background z-10 flex items-center gap-3">
        <button className="text-slate-400" onClick={onToggleSidebar}>
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
    setIsSidebarMobileOpen(false);
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
        isOpen={isSidebarMobileOpen}
        onClose={() => setIsSidebarMobileOpen(false)}
      />

      {view === "empty" && <EmptyState onNewRepo={handleNewRepo} onToggleSidebar={() => setIsSidebarMobileOpen(true)} />}
      {view === "ingest" && (
        <IngestView
          onIngestStart={handleIngestStart}
          jobStatus={jobStatus}
          onToggleSidebar={() => setIsSidebarMobileOpen(true)}
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
        />
      )}
    </div>
  );
}

export default App;
