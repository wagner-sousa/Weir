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

  describe('reconnect button hidden when needsAuth', () => {
    it('renders reconnect button when status is not needsAuth', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        status: 'error' as const,
      };
      render(<MCPCard client={client} />);
      expect(screen.getByRole('button', { name: 'Reconnect MCP' })).toBeInTheDocument();
    });

    it('hides reconnect button when status is needsAuth', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        status: 'needsAuth' as const,
      };
      render(<MCPCard client={client} />);
      expect(screen.queryByRole('button', { name: 'Reconnect MCP' })).not.toBeInTheDocument();
    });

    it('hides reconnect button even when reconnecting prop is passed for needsAuth', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        status: 'needsAuth' as const,
      };
      render(<MCPCard client={client} reconnecting={true} />);
      expect(screen.queryByRole('button', { name: 'Reconnect MCP' })).not.toBeInTheDocument();
    });
  });

  describe('needsAuth status', () => {
    it('renders ShieldAlert icon with amber color for needsAuth status', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        status: 'needsAuth' as const,
      };
      render(<MCPCard client={client} />);
      const el = screen.getByLabelText('Authentication required');
      expect(el.className).toContain('text-amber-500');
    });

    it('shows "Authentication required" tooltip for needsAuth status', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        status: 'needsAuth' as const,
      };
      render(<MCPCard client={client} />);
      expect(screen.getByText('Authentication required')).toBeInTheDocument();
    });
  });

  describe('error status', () => {
    it('does not render inline error text on card body', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        status: 'error' as const,
        error: 'Connection refused',
      };
      render(<MCPCard client={client} />);
      expect(screen.queryByText('Connection refused')).not.toBeInTheDocument();
    });

    it('shows error message in status icon tooltip', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
        status: 'error' as const,
        error: 'Connection refused',
      };
      render(<MCPCard client={client} />);
      expect(screen.getByText('Error: Connection refused')).toBeInTheDocument();
    });
  });

  describe('transport badge colors', () => {
    it('renders http transport badge with blue color', () => {
      const client = {
        name: 'api',
        transport: 'http' as const,
        url: 'https://example.com/mcp',
      };
      render(<MCPCard client={client} />);
      const badge = screen.getByText('http');
      expect(badge.className).toContain('bg-blue-800');
    });

    it('renders stdio transport badge with purple color', () => {
      const client = {
        name: 'fs',
        transport: 'stdio' as const,
        command: 'npx',
      };
      render(<MCPCard client={client} />);
      const badge = screen.getByText('stdio');
      expect(badge.className).toContain('bg-purple-800');
    });

    it('renders sse transport badge with cyan color', () => {
      const client = {
        name: 'events',
        transport: 'sse' as const,
        url: 'https://example.com/sse',
      };
      render(<MCPCard client={client} />);
      const badge = screen.getByText('sse');
      expect(badge.className).toContain('bg-cyan-800');
    });
  });

  describe('FR-008: badge colors distinct from status colors', () => {
    const statusColorClasses = ['green-500', 'red-500', 'amber-500', 'yellow-500', 'gray-400'];
    const transportColors = ['blue-800', 'purple-800', 'cyan-800'];

    it('uses transport colors not found in status color palette', () => {
      for (const tc of transportColors) {
        for (const sc of statusColorClasses) {
          expect(tc).not.toContain(sc);
        }
      }
    });
  });
});
