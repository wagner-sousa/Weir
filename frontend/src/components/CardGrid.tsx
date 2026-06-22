import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { MCPClient } from '../services/api';
import { MCPCard } from './MCPCard';
import { AddMCPModal } from './AddMCPModal';
import { useTestConnection } from '../hooks/useMCPs';
import { showToast } from './Toast';

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
      showToast(`MCP "${client.name}" connected successfully.`, 'success');
    } else {
      showToast(`MCP "${client.name}" connection failed: ${result.error}`, 'error');
    }
    setReconnectingName(null);
    queryClient.invalidateQueries({ queryKey: ['mcps'] });
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-gray-500">No MCPs configured.</p>
        <p className="mt-1 text-sm text-gray-400">
          Create a .mcp.json file with MCP servers to get started.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add MCP
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
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add MCP
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
            removing={removePending}
            reconnecting={reconnectingName === client.name}
          />
        ))}
      </div>
      <AddMCPModal
        open={modalOpen}
        existingNames={clients.map((c) => c.name)}
        onClose={() => setModalOpen(false)}
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
