import { describe, it, expect } from 'vitest';
import { resolveOutputMode } from '../../src/proxy/index.js';

describe('resolveOutputMode', () => {
  it('returns per-backend outputMode when set', () => {
    const entry = { outputMode: 'json', type: 'stdio', command: 'echo' };
    expect(resolveOutputMode(entry, 'dynamic')).toBe('json');
  });

  it('falls back to env outputMode when per-backend is not set', () => {
    const entry = { type: 'stdio', command: 'echo' };
    expect(resolveOutputMode(entry, 'toon')).toBe('toon');
  });

  it('returns default dynamic when neither is set', () => {
    const entry = { type: 'stdio', command: 'echo' };
    expect(resolveOutputMode(entry, undefined)).toBe('dynamic');
  });

  it('per-backend outputMode takes precedence over env', () => {
    const entry = { outputMode: 'json', type: 'stdio', command: 'echo' };
    expect(resolveOutputMode(entry, 'toon')).toBe('json');
  });

  it('ignores invalid per-backend outputMode value', () => {
    const entry = { outputMode: 'invalid', type: 'stdio', command: 'echo' };
    expect(resolveOutputMode(entry, 'toon')).toBe('toon');
  });

  it('ignores invalid env outputMode value', () => {
    const entry = { type: 'stdio', command: 'echo' };
    expect(resolveOutputMode(entry, 'bogus')).toBe('dynamic');
  });

  it('hot-read: each call reads fresh env state', () => {
    const entry = { type: 'stdio', command: 'echo' };
    expect(resolveOutputMode(entry, 'json')).toBe('json');
    expect(resolveOutputMode(entry, 'toon')).toBe('toon');
  });
});
