import { useState, useRef, useEffect, Suspense, lazy } from "react";

const MessageContent = lazy(() => import("./MarkdownRenderer"));

export default function ChatView({ repo, messages, onSendMessage, loading }) {
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
