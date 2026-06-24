import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders the transport type badge via Badge component', () => {
    render(<MCPCard client={mockClient} />);
    expect(screen.getByText('stdio')).toBeInTheDocument();
  });

  it('renders http badge for http transport', () => {
    const httpClient = { name: 'api', transport: 'http' as const, url: 'https://example.com' };
    render(<MCPCard client={httpClient} />);
    expect(screen.getByText('http')).toBeInTheDocument();
  });

  describe('shield button', () => {
    it('shows shield button when needsAuth is true and authUrl is present', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        needsAuth: true,
        authUrl: 'https://example.com/oauth/authorize',
      };
      render(<MCPCard client={client} />);
      const shieldBtn = screen.getByRole('button', { name: /authorize mcp/i });
      expect(shieldBtn).toBeInTheDocument();
    });

    it('hides shield button when needsAuth is false', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        needsAuth: false,
        authUrl: 'https://example.com/oauth/authorize',
      };
      render(<MCPCard client={client} />);
      expect(screen.queryByRole('button', { name: /authorize mcp/i })).not.toBeInTheDocument();
    });

    it('hides shield button when authUrl is missing even if needsAuth is true', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        needsAuth: true,
        authUrl: undefined,
      };
      render(<MCPCard client={client} />);
      expect(screen.queryByRole('button', { name: /authorize mcp/i })).not.toBeInTheDocument();
    });

    it('calls onAuth when shield button is clicked', () => {
      const onAuth = vi.fn();
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        needsAuth: true,
        authUrl: 'https://example.com/oauth/authorize',
      };
      render(<MCPCard client={client} onAuth={onAuth} />);
      fireEvent.click(screen.getByRole('button', { name: /authorize mcp/i }));
      expect(onAuth).toHaveBeenCalledWith(client);
    });
  });
});
