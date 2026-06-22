import type { MCPClient } from '../services/api';

interface MCPCardProps {
  client: MCPClient;
  onRemove?: (name: string) => void;
  removing?: boolean;
}

const badgeColors: Record<string, string> = {
  stdio: 'bg-blue-100 text-blue-800',
  http: 'bg-green-100 text-green-800',
  sse: 'bg-purple-100 text-purple-800',
  unknown: 'bg-gray-100 text-gray-800',
};

const statusIcons: Record<string, { icon: string; color: string; label: string }> = {
  connected: { icon: '\u2713', color: 'text-green-500', label: 'Conectado' },
  error: { icon: '\u2717', color: 'text-red-500', label: 'Erro' },
  connecting: { icon: '\u23F3', color: 'text-yellow-500', label: 'Conectando...' },
  disconnected: { icon: '\u25CB', color: 'text-gray-400', label: 'Desconectado' },
};

export function MCPCard({ client, onRemove, removing }: MCPCardProps) {
  const badgeClass = badgeColors[client.transport] || badgeColors.unknown;
  const status = client.status || 'disconnected';
  const si = statusIcons[status] || statusIcons.disconnected;

  return (
    <div
      data-testid="mcp-card"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-lg ${si.color}`}
            aria-label={si.label}
            title={client.error ? `${si.label}: ${client.error}` : si.label}
          >
            {si.icon}
          </span>
          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${badgeClass}`}
          >
            {client.transport}
          </span>
          {client.toolCount !== undefined && (
            <span
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              title={client.toolCount === 0 ? 'Nenhuma tool dispon\u00EDvel' : `${client.toolCount} tools`}
            >
              {client.toolCount === 0 && status !== 'connected' ? '?' : client.toolCount}
            </span>
          )}
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
      {client.error && (
        <p className="mt-2 text-xs text-red-500" title={client.error}>
          {client.error}
        </p>
      )}
      <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
        <button
          onClick={() => onRemove?.(client.name)}
          disabled={removing}
          className="rounded px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:text-gray-400"
        >
          {removing ? 'Removendo...' : 'Remover'}
        </button>
      </div>
    </div>
  );
}
