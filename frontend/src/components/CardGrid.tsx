import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MCPClient } from '../services/api';
import { MCPCard } from './MCPCard';
import { AddMCPModal } from './AddMCPModal';
import { useTestConnection } from '../hooks/useMCPs';
import { Plus } from 'lucide-react';

interface CardGridProps {
  clients: MCPClient[];
  onRemove?: (name: string) => void;
  removePending?: boolean;
}

export function CardGrid({ clients, onRemove, removePending }: CardGridProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCPClient | null>(null);
  const [reconnectingName, setReconnectingName] = useState<string | null>(null);
  const editModalOpen = editingMCP !== null;
  const testMutation = useTestConnection();
  const queryClient = useQueryClient();

  function handleEdit(client: MCPClient) {
    setEditingMCP(client);
  }

  function closeEditModal() {
    setEditingMCP(null);
    queryClient.invalidateQueries({ queryKey: ['mcps'] });
  }

  async function handleAuth(client: MCPClient) {
    try {
      const res = await fetch(`/api/auth/${encodeURIComponent(client.name)}/start`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.warning) {
        toast.warning(data.warning);
      }
      if (data.error) {
        toast.error(data.error);
      }

      if (!data.url) {
        return;
      }

      const popup = window.open('', '_blank', 'width=600,height=700');
      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.');
        return;
      }

      popup.location.href = data.url;

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          queryClient.invalidateQueries({ queryKey: ['mcps'] });
        }
      }, 500);
    } catch {
      toast.error('Failed to start OAuth2 authorization.');
    }
  }

  async function handleReconnect(client: MCPClient) {
    setReconnectingName(client.name);
    const transport = {
      type: client.transport as 'stdio' | 'http' | 'sse',
      command: client.command,
      args: client.args,
      url: client.url,
      env: client.env,
    };
    const result = await testMutation.mutateAsync({ transport });
    if (result.success) {
      toast.success(`MCP "${client.name}" connected successfully.`);
    } else {
      toast.error(`MCP "${client.name}" connection failed: ${result.error}`);
    }
    setReconnectingName(null);
    queryClient.invalidateQueries({ queryKey: ['mcps'] });
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-theme-muted">No MCPs configured.</p>
        <p className="mt-1 text-sm text-theme-muted">
          Create a .mcp.json file with MCP servers to get started.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="mt-4 rounded bg-theme-accent p-2 text-gray-900 hover:bg-theme-accent-dark"
          title="Add MCP"
          aria-label="Add MCP"
        >
          <Plus className="h-5 w-5" />
        </button>
        <AddMCPModal
          open={modalOpen}
          existingNames={clients.map((c) => c.name)}
          onClose={() => setModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setModalOpen(true)}
          className="rounded bg-theme-accent p-2 text-gray-900 hover:bg-theme-accent-dark"
          title="Add MCP"
          aria-label="Add MCP"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <MCPCard
            key={client.name}
            client={client}
            onRemove={onRemove}
            onEdit={handleEdit}
            onReconnect={handleReconnect}
            onAuth={handleAuth}
            removing={removePending}
            reconnecting={reconnectingName === client.name}
          />
        ))}
      </div>
      <AddMCPModal
        open={modalOpen}
        existingNames={clients.map((c) => c.name)}
        onClose={() => {
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['mcps'] });
        }}
      />
      <AddMCPModal
        open={editModalOpen}
        existingNames={clients.map((c) => c.name)}
        existingMCP={editingMCP ?? undefined}
        onClose={closeEditModal}
      />
    </div>
  );
}
