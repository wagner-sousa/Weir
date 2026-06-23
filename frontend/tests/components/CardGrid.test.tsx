import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardGrid } from '../../src/components/CardGrid';

vi.mock('../../src/hooks/useMCPs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useMCPs')>();
  return {
    ...actual,
    useTestConnection: () => ({
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    }),
  };
});

vi.mock('../../src/components/Toast', () => ({
  showToast: vi.fn(),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CardGrid', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const clients = [
    { name: 'a', transport: 'stdio' as const },
    { name: 'b', transport: 'http' as const },
  ];

  it('renders all MCP cards', () => {
    renderWithQuery(<CardGrid clients={clients} />);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('renders correct number of cards', () => {
    const { container } = renderWithQuery(<CardGrid clients={clients} />);
    const cards = container.querySelectorAll('[data-testid="mcp-card"]');
    expect(cards).toHaveLength(2);
  });

  it('renders empty state when no clients', () => {
    renderWithQuery(<CardGrid clients={[]} />);
    expect(screen.getByText(/No MCPs configured/i)).toBeInTheDocument();
  });

  describe('auth popup handling', () => {
    const authClient = {
      name: 'api',
      transport: 'http' as const,
      url: 'https://example.com/mcp',
      needsAuth: true,
      authUrl: 'https://example.com/oauth/authorize',
    };

    it('opens popup with auth URL when shield button is clicked', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, url: 'https://example.com/oauth/authorize?client_id=test' }),
      } as Response);

      const mockPopup = { closed: false, location: { href: '' } };
      vi.mocked(window.open).mockReturnValue(mockPopup as unknown as Window);

      renderWithQuery(<CardGrid clients={[authClient]} />);

      fireEvent.click(screen.getByRole('button', { name: /authorize mcp/i }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/api/start', expect.any(Object));
      });
      expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=600,height=700');
      expect(mockPopup.location.href).toBe('https://example.com/oauth/authorize?client_id=test');
    });

    it('shows toast when popup is blocked', async () => {
      const { showToast } = await import('../../src/components/Toast');

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, url: 'https://example.com/oauth/authorize?client_id=test' }),
      } as Response);

      vi.mocked(window.open).mockReturnValue(null);

      renderWithQuery(<CardGrid clients={[authClient]} />);

      fireEvent.click(screen.getByRole('button', { name: /authorize mcp/i }));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          'Popup blocked. Please allow popups for this site.',
          'error',
        );
      });
    });

    it('shows toast when API returns error', async () => {
      const { showToast } = await import('../../src/components/Toast');

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'OAuth2 config not found' }),
      } as Response);

      renderWithQuery(<CardGrid clients={[authClient]} />);

      fireEvent.click(screen.getByRole('button', { name: /authorize mcp/i }));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('OAuth2 config not found', 'error');
      });
    });
  });
});
