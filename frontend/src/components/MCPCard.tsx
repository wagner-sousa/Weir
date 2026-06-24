import type { MCPClient } from '../services/api';
import { Badge } from './Badge';
import { ConnectionIndicator } from './ConnectionIndicator';

interface MCPCardProps {
  client: MCPClient;
  online?: boolean;
  error?: string | null;
}

const transportVariant: Record<string, string> = {
  stdio: 'secondary',
  http: 'success',
  sse: 'default',
};

export function MCPCard({ client, online = true, error }: MCPCardProps) {
  const variant = transportVariant[client.transport] || 'outline';

  return (
    <div
      data-testid="mcp-card"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ConnectionIndicator online={online} />
          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <Badge variant={variant} label={client.transport} />
        </div>
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
