import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'IBM Plex Mono, monospace',
  sequence: {
    wrap: true
  }
});

/**
 * Sanitize and auto-fix common LLM Mermaid syntax mistakes before rendering.
 */
function sanitizeMermaid(raw) {
  let code = raw.trim();

  // Strip leading "mermaid" keyword if the LLM forgot backticks
  code = code.replace(/^mermaid\s+/i, '');

  // Fix "|>" labels  →  "|"  (common LLM hallucination)
  code = code.replace(/\|>/g, '|');

  // Fix "-->|Label|> Node" patterns  →  "-->|Label| Node"
  code = code.replace(/\|>\s*/g, '| ');

  // Detect mixed diagram: "graph" header + "participant" keyword
  const hasGraphHeader = /^(graph|flowchart)\s+(LR|TD|TB|RL|BT)/im.test(code);
  const hasParticipant = /\bparticipant\b/i.test(code);

  if (hasGraphHeader && hasParticipant) {
    // The LLM mixed flowchart + sequence diagram syntax.
    // Convert to a pure sequence diagram.
    code = code.replace(/^(graph|flowchart)\s+(LR|TD|TB|RL|BT)/im, 'sequenceDiagram');
    // Remove flowchart-style node definitions that are invalid in sequence diagrams
    // e.g.  A[Some Text]  →  keep only participant lines
    code = code.replace(/(\w+)\[([^\]]+)\]/g, '$1');
    // Remove style lines (only valid in flowcharts)
    code = code.replace(/^\s*style\s+.+$/gm, '');
    // Remove %%{init...}%% directives that may conflict
    code = code.replace(/%%\{init.*?\}%%/g, '');
  }

  // Fix semicolons after graph header (e.g. "graph LR;" → "graph LR")
  code = code.replace(/^(graph\s+\w+);/im, '$1');
  code = code.replace(/^(flowchart\s+\w+);/im, '$1');

  // Remove %%{init...}%% on the same line as graph header (causes parse errors)
  code = code.replace(/^((?:graph|flowchart)\s+\w+)\s*%%\{.*?\}%%/im, '$1');

  // Clean up multiple blank lines
  code = code.replace(/\n{3,}/g, '\n\n');

  return code.trim();
}

let renderCounter = 0;

export default function MermaidDiagram({ chart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !chart) return;

    const sanitized = sanitizeMermaid(chart);
    const id = `mermaid-${renderCounter++}-${Math.random().toString(36).substr(2, 6)}`;

    mermaid.render(id, sanitized)
      .then((result) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = result.svg;
        }
      })
      .catch((err) => {
        // If rendering still fails, show the raw code in a clean format
        // so the user can still read it
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding:16px;background:#1e293b;color:#e2e8f0;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:12px;overflow-x:auto;white-space:pre-wrap;">
              <div style="color:#f59e0b;margin-bottom:8px;font-weight:bold;">⚠ Diagram could not be rendered — showing raw code:</div>
              <code>${sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
            </div>`;
        }
      });
  }, [chart]);

  return <div ref={containerRef} className="my-4 overflow-x-auto bg-slate-50 p-4 border border-slate-200" />;
}
