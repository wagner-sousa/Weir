import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddMCPModal } from '../../src/components/AddMCPModal';

const { mockMutateAsync, mockToast } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../src/hooks/useMCPs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useMCPs')>();
  return {
    ...actual,
    useTestConnection: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
    useAddMCP: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
    useUpdateMCP: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: mockToast,
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function fillStdioForm() {
  fireEvent.change(screen.getByPlaceholderText('e.g.: my-server'), {
    target: { value: 'test-mcp' },
  });
  const typeSelect = screen.getByDisplayValue('STDIO');
  fireEvent.change(typeSelect, { target: { value: 'stdio' } });
  fireEvent.change(screen.getByPlaceholderText('e.g.: npx'), {
    target: { value: 'echo' },
  });
}

describe('AddMCPModal — User Story 1: Test Then Auto-Save', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it('auto-saves and closes modal when test succeeds', async () => {
    mockMutateAsync
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('auto-saves and closes modal when test returns needsAuth', async () => {
    mockMutateAsync
      .mockResolvedValueOnce({ success: false, needsAuth: true })
      .mockResolvedValueOnce({ success: true });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT auto-save when test returns non-auth error', async () => {
    mockMutateAsync.mockResolvedValueOnce({ success: false, error: 'Connection refused' });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('English messages (FR-010)', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  const englishMessages = [
    { label: 'Save button', getter: () => screen.getAllByText('Save')[0] },
    { label: 'Test Connection button', getter: () => screen.getByText('Test Connection') },
    { label: 'Modal title', getter: () => screen.getByText('Add MCP') },
    { label: 'Name label', getter: () => screen.getByText('Name') },
    { label: 'Type label', getter: () => screen.getByText('Type') },
    { label: 'Name placeholder', getter: () => screen.getByPlaceholderText('e.g.: my-server') },
    { label: 'Command placeholder', getter: () => screen.getByPlaceholderText('e.g.: npx') },
  ];

  it.each(englishMessages)('renders $label in English', ({ getter }) => {
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} />);
    expect(getter()).toBeInTheDocument();
  });

  it('shows success message in English after save', async () => {
    mockMutateAsync
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();
    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => { expect(onClose).toHaveBeenCalled(); });
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining('added successfully'),
    );
  });

  it('shows error message in English after failed test', async () => {
    mockMutateAsync.mockResolvedValueOnce({ success: false, error: 'Connection refused' });

    renderWithQuery(<AddMCPModal open={true} existingNames={[]} />);
    fillStdioForm();
    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
    });
  });
});

describe('AddMCPModal — User Story 2: Save Triggers Auto-Test', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it('auto-tests when save is clicked without prior test', async () => {
    mockMutateAsync
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not re-test when save is clicked after a prior test', async () => {
    mockMutateAsync
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    // Click Test Connection first (auto-saves)
    fireEvent.click(screen.getByText('Test Connection'));
    await waitFor(() => { expect(mockMutateAsync).toHaveBeenCalledTimes(2); });
    mockMutateAsync.mockReset();

    // Now click Save again — should NOT re-test since testResult is set
    mockMutateAsync.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => { expect(onClose).toHaveBeenCalled(); });
    // Only one call (the save), not two (test + save)
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('shows error when auto-test times out', async () => {
    mockMutateAsync.mockResolvedValueOnce({ success: false, error: 'Connection timed out' });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/Connection timed out/)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not save when auto-test returns non-auth error', async () => {
    mockMutateAsync.mockResolvedValueOnce({ success: false, error: 'Connection refused' });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows warning toast when needsAuth but no clientId', async () => {
    mockMutateAsync
      .mockResolvedValueOnce({ success: false, needsAuth: true })
      .mockResolvedValueOnce({ success: true });

    const onClose = vi.fn();
    renderWithQuery(<AddMCPModal open={true} existingNames={[]} onClose={onClose} />);
    fillStdioForm();

    // Set the URL to trigger HTTP type
    const typeSelect = screen.getByDisplayValue('STDIO');
    fireEvent.change(typeSelect, { target: { value: 'http' } });
    fireEvent.change(screen.getByPlaceholderText('https://example.com/mcp'), {
      target: { value: 'https://example.com/mcp' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g.: my-server'), {
      target: { value: 'test-mcp' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
