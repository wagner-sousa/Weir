import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMCP } from '../../src/services/api';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('updateMCP', () => {
  it('sends PUT request to correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, name: 'updated-server' }),
    });

    await updateMCP('original-name', 'updated-server', {
      type: 'stdio',
      command: 'node',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mcps/original-name',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('sends the correct body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, name: 'updated' }),
    });

    await updateMCP('old', 'new', {
      type: 'http',
      url: 'https://example.com',
    });

    const callArgs = mockFetch.mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.name).toBe('new');
    expect(body.transport.type).toBe('http');
    expect(body.transport.url).toBe('https://example.com');
  });

  it('returns success on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, name: 'updated' }),
    });

    const result = await updateMCP('old', 'updated', { type: 'stdio', command: 'echo' });
    expect(result.success).toBe(true);
    expect(result.name).toBe('updated');
  });

  it('returns error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'MCP not found.' }),
    });

    const result = await updateMCP('nonexistent', 'new', { type: 'stdio', command: 'echo' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('MCP not found.');
  });

  it('encodes the original name in the URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, name: 'new' }),
    });

    await updateMCP('my server', 'new', { type: 'stdio', command: 'echo' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mcps/my%20server',
      expect.any(Object),
    );
  });
});
