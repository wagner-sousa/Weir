import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardGrid } from '../../src/components/CardGrid';

describe('CardGrid', () => {
  const clients = [
    { name: 'a', transport: 'stdio' as const },
    { name: 'b', transport: 'http' as const },
  ];

  it('renders all MCP cards', () => {
    render(<CardGrid clients={clients} />);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('renders correct number of cards', () => {
    const { container } = render(<CardGrid clients={clients} />);
    const cards = container.querySelectorAll('[data-testid="mcp-card"]');
    expect(cards).toHaveLength(2);
  });

  it('renders empty state when no clients', () => {
    render(<CardGrid clients={[]} />);
    expect(screen.getByText(/Nenhum MCP configurado/i)).toBeInTheDocument();
  });
});
