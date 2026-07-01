import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../src/components/Badge';

describe('Badge', () => {
  it('renders label text', () => {
    render(<Badge label="http" />);
    expect(screen.getByText('http')).toBeInTheDocument();
  });

  it('uses default variant when none specified', () => {
    render(<Badge label="test" />);
    const el = screen.getByText('test');
    expect(el.className).toContain('bg-gray-600');
  });

  it('renders http variant with blue color', () => {
    render(<Badge variant="http" label="http" />);
    const el = screen.getByText('http');
    expect(el.className).toContain('bg-blue-800');
  });

  it('renders stdio variant with purple color', () => {
    render(<Badge variant="stdio" label="stdio" />);
    const el = screen.getByText('stdio');
    expect(el.className).toContain('bg-purple-800');
  });

  it('renders sse variant with cyan color', () => {
    render(<Badge variant="sse" label="sse" />);
    const el = screen.getByText('sse');
    expect(el.className).toContain('bg-cyan-800');
  });
});
