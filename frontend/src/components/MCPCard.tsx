import type { MCPClient } from '../services/api';
import { Badge } from './Badge';
import { ShieldAlert, CircleCheck, CircleX, LoaderCircle, Circle, Pencil, RotateCcw, Trash2, Plug } from 'lucide-react';
import type { ReactNode } from 'react';

interface MCPCardProps {
  client: MCPClient;
  onRemove?: (name: string) => void;
  onEdit?: (client: MCPClient) => void;
  onReconnect?: (client: MCPClient) => void;
  onAuth?: (client: MCPClient) => void;
  onConfig?: (name: string) => void;
  removing?: boolean;
  reconnecting?: boolean;
}

interface StatusIcon {
  icon: ReactNode;
  color: string;
  label: string;
}

const statusIcons: Record<string, StatusIcon> = {
  connected: { icon: <CircleCheck className="h-5 w-5" />, color: 'text-green-500', label: 'Connected' },
  error: { icon: <CircleX className="h-5 w-5" />, color: 'text-red-500', label: 'Error' },
  needsAuth: { icon: <ShieldAlert className="h-5 w-5" />, color: 'text-amber-500', label: 'Authentication required' },
  connecting: { icon: <LoaderCircle className="h-5 w-5 animate-spin" />, color: 'text-yellow-500', label: 'Connecting...' },
  disconnected: { icon: <Circle className="h-5 w-5" />, color: 'text-gray-400', label: 'Disconnected' },
  testing: { icon: <LoaderCircle className="h-5 w-5 animate-spin" />, color: 'text-yellow-500', label: 'Testing...' },
  unknown: { icon: <Circle className="h-5 w-5" />, color: 'text-gray-400', label: 'Unknown' },
};

const transportVariant: Record<string, string> = {
  stdio: 'stdio',
  http: 'http',
  sse: 'sse',
};

export function MCPCard({ client, onRemove, onEdit, onReconnect, onAuth, onConfig, removing, reconnecting }: MCPCardProps) {
  const status = client.status || 'disconnected';
  const si = statusIcons[status] || statusIcons.disconnected;
  const variant = transportVariant[client.transport] || 'outline';

  return (
    <div
      data-testid="mcp-card"
      className="rounded-lg border border-theme-border bg-theme-panel p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative group">
            <span className={si.color} aria-label={si.label}>
              {si.icon}
            </span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {client.error ? `${si.label}: ${client.error}` : si.label}
            </span>
          </span>
          <h3 className="text-lg font-semibold text-theme-text">{client.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={variant} label={client.transport} />
          {client.toolCount !== undefined && (
            <span
              className="rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300"
              title={client.toolCount === 0 ? 'No tools available' : `${client.toolCount} tools`}
            >
              {client.toolCount === 0 && (status === 'unknown' || status === 'testing') ? '?' : client.toolCount}
            </span>
          )}
        </div>
      </div>
      {client.command && (
        <p className="mt-2 text-sm text-theme-muted">
          <span className="font-medium text-theme-text">Command:</span> {client.command}
        </p>
      )}
      {client.url && (
        <p className="mt-2 text-sm text-theme-muted">
          <span className="font-medium text-theme-text">URL:</span> {client.url}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2 border-t border-theme-border pt-2">
        {client.status !== 'needsAuth' && (
          <button
            onClick={() => onReconnect?.(client)}
            disabled={reconnecting}
            aria-label="Reconnect MCP"
            className="rounded p-1.5 text-gray-400 hover:bg-green-600/20 hover:text-green-400 disabled:opacity-50"
          >
            {reconnecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          </button>
        )}
        {client.needsAuth && client.authUrl && (
          <button
            onClick={() => onAuth?.(client)}
            aria-label="Authorize MCP"
            title="OAuth2 authorization required"
            className="rounded p-1.5 text-amber-500 hover:bg-amber-600/20 hover:text-amber-400"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onConfig?.(client.name)}
          aria-label="Connection info"
          title="Show connection details for this MCP"
          className="rounded p-1.5 text-gray-400 hover:bg-purple-600/20 hover:text-purple-400"
        >
          <Plug className="h-4 w-4" />
        </button>
        <button
          onClick={() => onEdit?.(client)}
          aria-label="Edit MCP"
          className="rounded p-1.5 text-gray-400 hover:bg-blue-600/20 hover:text-blue-400"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onRemove?.(client.name)}
          disabled={removing}
          aria-label="Remove MCP"
          className="rounded p-1.5 text-gray-400 hover:bg-red-600/20 hover:text-red-400 disabled:opacity-50"
        >
          {removing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
