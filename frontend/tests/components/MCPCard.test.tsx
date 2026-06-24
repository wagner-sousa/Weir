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
    render(<MCPCard client={mockClient} online />);
    expect(screen.getByText('filesystem')).toBeInTheDocument();
  });

  it('renders the transport type badge via Badge component', () => {
    render(<MCPCard client={mockClient} online />);
    expect(screen.getByText('stdio')).toBeInTheDocument();
  });

  it('renders connection indicator green when online', () => {
    render(<MCPCard client={mockClient} online />);
    const indicator = screen.getByTestId('connection-indicator');
    expect(indicator.className).toContain('bg-green-500');
  });

  it('renders connection indicator red when offline', () => {
    render(<MCPCard client={mockClient} online={false} />);
    const indicator = screen.getByTestId('connection-indicator');
    expect(indicator.className).toContain('bg-red-500');
  });

  it('renders http badge for http transport', () => {
    const httpClient = { name: 'api', transport: 'http' as const, url: 'https://example.com' };
    render(<MCPCard client={httpClient} online />);
    expect(screen.getByText('http')).toBeInTheDocument();
  });

  it('shows inline error text when error prop is provided', () => {
    render(<MCPCard client={mockClient} online error="Connection refused" />);
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });
});
