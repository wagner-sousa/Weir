export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-6xl">📭</div>
      <h2 className="text-xl font-semibold text-gray-700">No MCP configured</h2>
      <p className="mt-2 text-gray-500">
        Create a <code className="rounded bg-gray-100 px-2 py-0.5 text-sm">.mcp.json</code> file{' '}
        at the project root with MCP servers.
      </p>
    </div>
  );
}
