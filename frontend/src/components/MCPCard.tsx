import type { MCPClient } from '../services/api';
import { ShieldAlert, CircleCheck, CircleX, LoaderCircle, Circle, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface MCPCardProps {
  client: MCPClient;
  onRemove?: (name: string) => void;
  onEdit?: (client: MCPClient) => void;
  onReconnect?: (client: MCPClient) => void;
  onAuth?: (client: MCPClient) => void;
  removing?: boolean;
  reconnecting?: boolean;
}

const badgeColors: Record<string, string> = {
  stdio: 'bg-blue-100 text-blue-800',
  http: 'bg-green-100 text-green-800',
  sse: 'bg-purple-100 text-purple-800',
  unknown: 'bg-gray-100 text-gray-800',
};

interface StatusIcon {
  icon: ReactNode;
  color: string;
  label: string;
}

const statusIcons: Record<string, StatusIcon> = {
  connected: { icon: <CircleCheck className="h-5 w-5" />, color: 'text-green-500', label: 'Connected' },
  error: { icon: <CircleX className="h-5 w-5" />, color: 'text-red-500', label: 'Error' },
  connecting: { icon: <LoaderCircle className="h-5 w-5 animate-spin" />, color: 'text-yellow-500', label: 'Connecting...' },
  disconnected: { icon: <Circle className="h-5 w-5" />, color: 'text-gray-400', label: 'Disconnected' },
};

export function MCPCard({ client, onRemove, onEdit, onReconnect, onAuth, removing, reconnecting }: MCPCardProps) {
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
            className={si.color}
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
              title={client.toolCount === 0 ? 'No tools available' : `${client.toolCount} tools`}
            >
              {client.toolCount === 0 && status !== 'connected' ? '?' : client.toolCount}
            </span>
          )}
        </div>
      </div>
      {client.command && (
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-medium">Command:</span> {client.command}
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
      <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-2">
        {client.needsAuth && client.authUrl && (
          <button
            onClick={() => onAuth?.(client)}
            aria-label="Authorize MCP"
            title="OAuth2 authorization required"
            className="rounded p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-700"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onEdit?.(client)}
          aria-label="Edit MCP"
          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onReconnect?.(client)}
          disabled={reconnecting}
          aria-label="Reconnect MCP"
          className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
        >
          {reconnecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onRemove?.(client.name)}
          disabled={removing}
          aria-label="Remove MCP"
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {removing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
