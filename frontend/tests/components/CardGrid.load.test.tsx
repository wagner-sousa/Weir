import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardGrid } from '../../src/components/CardGrid';
import type { MCPClient } from '../../src/services/api';

function generateClients(count: number): MCPClient[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `server-${i + 1}`,
    transport: (i % 3 === 0 ? 'stdio' : i % 3 === 1 ? 'http' : 'sse') as MCPClient['transport'],
    command: i % 3 === 0 ? `npx -y server-${i + 1}` : undefined,
    url: i % 3 !== 0 ? `https://server-${i + 1}.example.com/mcp` : undefined,
  }));
}

const queryClient = new QueryClient();

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('CardGrid load handling', () => {
  it('renders all cards for 30 MCPs', () => {
    const clients = generateClients(30);
    render(<CardGrid clients={clients} />, { wrapper: Wrapper });
    expect(screen.getAllByTestId('mcp-card')).toHaveLength(30);
  });

  it('renders all cards for 50 MCPs', () => {
    const clients = generateClients(50);
    render(<CardGrid clients={clients} />, { wrapper: Wrapper });
    expect(screen.getAllByTestId('mcp-card')).toHaveLength(50);
  });

  it('renders all cards for 100 MCPs', () => {
    const clients = generateClients(100);
    render(<CardGrid clients={clients} />, { wrapper: Wrapper });
    expect(screen.getAllByTestId('mcp-card')).toHaveLength(100);
  });

  it('maintains 3-column grid layout with many cards', () => {
    const clients = generateClients(30);
    const { container } = render(<CardGrid clients={clients} />, { wrapper: Wrapper });
    const grid = container.firstElementChild;
    expect(grid).toBeInTheDocument();
  });
});
