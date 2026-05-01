import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'IBM Plex Mono, monospace'
});

export default function MermaidDiagram({ chart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then((result) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = result.svg;
          }
        })
        .catch((error) => {
          console.error("Mermaid parsing error:", error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="text-red-500 text-xs font-mono">Failed to render diagram: ${error.message}</div>`;
          }
        });
    }
  }, [chart]);

  return <div ref={containerRef} className="my-4 overflow-x-auto bg-slate-50 p-4 border border-slate-200" />;
}
