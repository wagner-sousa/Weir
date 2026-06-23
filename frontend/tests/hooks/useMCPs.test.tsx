import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateMCP } from '../../src/hooks/useMCPs';
import * as api from '../../src/services/api';
import type { ReactNode } from 'react';

vi.mock('../../src/services/api', () => ({
  updateMCP: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useUpdateMCP', () => {
  it('calls api.updateMCP with correct arguments', async () => {
    vi.mocked(api.updateMCP).mockResolvedValueOnce({ success: true, name: 'renamed' });

    const { result } = renderHook(() => useUpdateMCP(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      originalName: 'old-server',
      name: 'new-server',
      transport: { type: 'stdio', command: 'echo' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.updateMCP).toHaveBeenCalledWith('old-server', 'new-server', {
      type: 'stdio',
      command: 'echo',
    });
  });

  it('handles failure response', async () => {
    vi.mocked(api.updateMCP).mockResolvedValueOnce({
      success: false,
      error: 'MCP not found.',
    });

    const { result } = renderHook(() => useUpdateMCP(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      originalName: 'nonexistent',
      name: 'new',
      transport: { type: 'stdio', command: 'echo' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      success: false,
      error: 'MCP not found.',
    });
  });
});
