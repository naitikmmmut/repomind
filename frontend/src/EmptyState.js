export default function EmptyState({ onNewRepo }) {
  return (
    <main className="main-content" data-testid="empty-state">
      <div className="empty-state">
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
