import ReactMarkdown from "react-markdown";
import MermaidDiagram from "./MermaidDiagram";

export default function MessageContent({ content }) {
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
