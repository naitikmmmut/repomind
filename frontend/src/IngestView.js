import { useState } from "react";

export default function IngestView({ onIngestStart, jobStatus, onBack }) {
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
        <div>
          <h2 className="text-xl font-bold tracking-tight font-[Chivo]">Ingest Repository</h2>
          <p className="text-sm text-slate-600 mt-1">Paste a public GitHub repository URL to analyze its codebase</p>
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
