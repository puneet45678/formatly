// Phase 2 must render Mermaid with securityLevel: "strict" before passing the SVG in.
export function DiagramView({ svg }: { svg: string }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-auto p-4">
      <div className="m-auto [&>svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
