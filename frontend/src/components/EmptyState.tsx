export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-6xl">📭</div>
      <h2 className="text-xl font-semibold text-gray-700">Nenhum MCP configurado</h2>
      <p className="mt-2 text-gray-500">
        Crie um arquivo <code className="rounded bg-gray-100 px-2 py-0.5 text-sm">.mcp.json</code>{' '}
        na raiz do projeto com servidores MCP.
      </p>
    </div>
  );
}
