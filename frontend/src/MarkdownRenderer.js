import ReactMarkdown from "react-markdown";
import MermaidDiagram from "./MermaidDiagram";

/**
 * Preprocess LLM output to wrap raw mermaid code in proper markdown code fences.
 * The LLM sometimes outputs "mermaid\nsequenceDiagram\n..." without backticks.
 * This detects that pattern and wraps it so ReactMarkdown renders it as a code block.
 */
function preprocessContent(text) {
  if (!text) return text;

  // If the content already has properly fenced mermaid blocks, leave it alone
  if (text.includes("```mermaid")) return text;

  // Simple detection: look for "mermaid" followed by a diagram type keyword
  const mermaidIdx = text.search(/mermaid\s+(sequenceDiagram|graph\s|flowchart\s|classDiagram|stateDiagram|erDiagram|pie|gantt|journey)/i);
  if (mermaidIdx === -1) return text;

  // Extract everything from "mermaid" onwards
  const fromMermaid = text.substring(mermaidIdx);

  // Find where the diagram code ends and prose begins.
  // Look for double-newline followed by a prose sentence.
  const proseBreak = fromMermaid.search(/\n\n(This |Here |The |Note:|Please |Based |In this|Source|Ask |\d+\. )/);

  let codeBlock, rest;
  if (proseBreak !== -1) {
    codeBlock = fromMermaid.substring(0, proseBreak).trim();
    rest = fromMermaid.substring(proseBreak);
  } else {
    // No prose detected — the entire remaining text might be the diagram
    codeBlock = fromMermaid.trim();
    rest = "";
  }

  // Strip the leading "mermaid" keyword
  const mermaidCode = codeBlock.replace(/^mermaid\s+/i, "");

  // Rebuild the text with proper fencing
  const before = text.substring(0, mermaidIdx);
  text = before + "```mermaid\n" + mermaidCode + "\n```\n" + rest;

  return text;
}

export default function MessageContent({ content }) {
  const processedContent = preprocessContent(content);

  return (
    <div className="prose prose-sm max-w-none" data-testid="message-content">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            if (!inline && (match || String(children).includes("\n"))) {
              if (match && match[1] === "mermaid") {
                return <MermaidDiagram chart={String(children).replace(/\n$/, "")} />;
              }
              return (
                <div>
                  {match && (
                    <div className="code-block-header">{match[1]}</div>
                  )}
                  <pre className="code-block">
                    <code {...props}>{String(children).replace(/\n$/, "")}</code>
                  </pre>
                </div>
              );
            }
            return (
              <code
                className="bg-slate-100 px-1.5 py-0.5 font-mono text-xs border border-slate-200"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-3 text-sm leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 mb-3 text-sm">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 mb-3 text-sm">{children}</ol>;
          },
          h1({ children }) {
            return <h1 className="text-lg font-bold mb-2 font-[Chivo]">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-base font-bold mb-2 font-[Chivo]">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm font-bold mb-1 font-[Chivo]">{children}</h3>;
          },
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
