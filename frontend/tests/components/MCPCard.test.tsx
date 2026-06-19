import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MCPCard } from '../../src/components/MCPCard';

describe('MCPCard', () => {
  const mockClient = {
    name: 'filesystem',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'server-fs'],
  };

  it('renders the MCP name', () => {
    render(<MCPCard client={mockClient} />);
    expect(screen.getByText('filesystem')).toBeInTheDocument();
  });

  it('renders the transport type badge', () => {
    render(<MCPCard client={mockClient} />);
    expect(screen.getByText('STDIO')).toBeInTheDocument();
  });

  it('renders http badge for http transport', () => {
    const httpClient = { name: 'api', transport: 'http' as const, url: 'https://example.com' };
    render(<MCPCard client={httpClient} />);
    expect(screen.getByText('HTTP')).toBeInTheDocument();
  });
});
