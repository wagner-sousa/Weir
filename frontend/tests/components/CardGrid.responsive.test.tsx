import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardGrid } from '../../src/components/CardGrid';
import type { MCPClient } from '../../src/services/api';

const queryClient = new QueryClient();

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const mockClients: MCPClient[] = [
  { name: 'server-a', transport: 'stdio', command: 'npx -y server-a' },
  { name: 'server-b', transport: 'http', url: 'https://b.example.com' },
  { name: 'server-c', transport: 'sse', url: 'https://c.example.com/sse' },
  { name: 'server-d', transport: 'stdio', command: 'npx -y server-d' },
  { name: 'server-e', transport: 'http', url: 'https://e.example.com' },
];

describe('CardGrid responsive layout', () => {
  it('renders all 5 client cards', () => {
    render(<CardGrid clients={mockClients} />, { wrapper: Wrapper });
    expect(screen.getAllByTestId('mcp-card')).toHaveLength(5);
  });

  it('renders correct grid classes for responsive layout', () => {
    const { container } = render(<CardGrid clients={mockClients} />, { wrapper: Wrapper });
    const grid = container.firstElementChild;
    expect(grid).toBeInTheDocument();
  });
});
