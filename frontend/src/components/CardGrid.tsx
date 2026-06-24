import type { MCPClient } from '../services/api';
import { MCPCard } from './MCPCard';

interface CardGridProps {
  clients: MCPClient[];
}

export function CardGrid({ clients }: CardGridProps) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-theme-muted">Nenhum MCP configurado.</p>
        <p className="mt-1 text-sm text-theme-muted">
          Crie um arquivo .mcp.json com servidores MCP para comecar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <MCPCard key={client.name} client={client} />
      ))}
    </div>
  );
}
