import { useState } from 'react';
import type { MCPClient } from '../services/api';
import { MCPCard } from './MCPCard';
import { AddMCPModal } from './AddMCPModal';

interface CardGridProps {
  clients: MCPClient[];
}

export function CardGrid({ clients }: CardGridProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-gray-500">Nenhum MCP configurado.</p>
        <p className="mt-1 text-sm text-gray-400">
          Crie um arquivo .mcp.json com servidores MCP para comecar.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Adicionar MCP
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
          Adicionar MCP
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <MCPCard key={client.name} client={client} />
        ))}
      </div>
      <AddMCPModal
        open={modalOpen}
        existingNames={clients.map((c) => c.name)}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
