export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-6xl">&#x1f4ed;</div>
      <h2 className="text-xl font-semibold text-theme-text">No MCP configured</h2>
      <p className="mt-2 text-theme-muted">
        Create a <code className="rounded bg-theme-panel px-2 py-0.5 text-sm text-theme-accent">.mcp.json</code>{' '}
        file in the project root with MCP servers.
      </p>
    </div>
  );
}
