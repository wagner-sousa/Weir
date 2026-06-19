import type { MCPClient } from '../services/api';

interface MCPCardProps {
  client: MCPClient;
}

const badgeColors: Record<string, string> = {
  stdio: 'bg-blue-100 text-blue-800',
  http: 'bg-green-100 text-green-800',
  sse: 'bg-purple-100 text-purple-800',
  unknown: 'bg-gray-100 text-gray-800',
};

export function MCPCard({ client }: MCPCardProps) {
  const badgeClass = badgeColors[client.transport] || badgeColors.unknown;

  return (
    <div
      data-testid="mcp-card"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${badgeClass}`}>
          {client.transport}
        </span>
      </div>
      {client.command && (
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-medium">Comando:</span> {client.command}
        </p>
      )}
      {client.url && (
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-medium">URL:</span> {client.url}
        </p>
      )}
    </div>
  );
}
