import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolsModal } from '../../src/components/ToolsModal';
import { useToolVisibility } from '../../src/hooks/useToolVisibility';

vi.mock('../../src/hooks/useToolVisibility');

const mockUseToolVisibility = vi.mocked(useToolVisibility);

const defaultHookReturn = {
  tools: [
    { name: 'tool-a', description: 'Tool A', enabled: true },
    { name: 'tool-b', description: 'Tool B', enabled: false },
    { name: 'tool-c', description: undefined, enabled: true },
  ],
  totalCount: 3,
  enabledCount: 2,
  isLoading: false,
  error: null,
  toggleMutation: { mutate: vi.fn(), isPending: false },
  bulkMutation: { mutate: vi.fn(), isPending: false },
};

describe('ToolsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseToolVisibility.mockReturnValue(defaultHookReturn);
  });

  it('renders tool names', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    expect(screen.getByText('tool-a')).toBeInTheDocument();
    expect(screen.getByText('tool-b')).toBeInTheDocument();
    expect(screen.getByText('tool-c')).toBeInTheDocument();
  });

  it('displays summary count', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    expect(screen.getByText('2/3 tools enabled')).toBeInTheDocument();
  });

  it('renders Enable All and Disable All buttons', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    expect(screen.getByText('Enable All')).toBeInTheDocument();
    expect(screen.getByText('Disable All')).toBeInTheDocument();
  });

  it('calls toggleMutation.mutate when a tool toggle button is clicked', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    const onButtons = screen.getAllByText('On');
    fireEvent.click(onButtons[0]);
    expect(defaultHookReturn.toggleMutation.mutate).toHaveBeenCalledWith({
      toolName: 'tool-a',
      enabled: false,
    });
  });

  it('calls bulkMutation.mutate(true) when Enable All is clicked', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Enable All'));
    expect(defaultHookReturn.bulkMutation.mutate).toHaveBeenCalledWith(true);
  });

  it('calls bulkMutation.mutate(false) when Disable All is clicked', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Disable All'));
    expect(defaultHookReturn.bulkMutation.mutate).toHaveBeenCalledWith(false);
  });

  it('shows Off for disabled tools and On for enabled tools', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    const onButtons = screen.getAllByText('On');
    expect(onButtons.length).toBe(2);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockUseToolVisibility.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      tools: [],
    });
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    expect(screen.queryByText('No tools available.')).not.toBeInTheDocument();
  });

  it('shows empty state when no tools available', () => {
    mockUseToolVisibility.mockReturnValue({
      ...defaultHookReturn,
      tools: [],
      totalCount: 0,
      enabledCount: 0,
    });
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    expect(screen.getByText('No tools available.')).toBeInTheDocument();
  });

  it('calls onClose when dialog is closed', () => {
    const onClose = vi.fn();
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders tool description when available', () => {
    render(<ToolsModal open={true} mcpName="test-mcp" onClose={vi.fn()} />);
    expect(screen.getByText('Tool A')).toBeInTheDocument();
    expect(screen.getByText('Tool B')).toBeInTheDocument();
  });
});
