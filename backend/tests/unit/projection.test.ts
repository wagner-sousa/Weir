import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyFieldSelection, normalizeJsonPath } from '../../src/projection/project.js';
import { loadFieldProjections } from '../../src/projection/index.js';

describe('normalizeJsonPath', () => {
  it('strips $. prefix', () => {
    expect(normalizeJsonPath('$.full_name')).toBe('full_name');
  });

  it('strips $[*]. prefix', () => {
    expect(normalizeJsonPath('$[*].id')).toBe('id');
  });

  it('strips $[*]. prefix with nested path', () => {
    expect(normalizeJsonPath('$[*].author.display_name')).toBe('author.display_name');
  });

  it('passes through path without prefix', () => {
    expect(normalizeJsonPath('full_name')).toBe('full_name');
  });

  it('normalizes bracket index notation', () => {
    expect(normalizeJsonPath('items[0].name')).toBe('items.0.name');
  });

  it('rejects bare $', () => {
    expect(() => normalizeJsonPath('$')).toThrow();
  });

  it('rejects bare $[*]', () => {
    expect(() => normalizeJsonPath('$[*]')).toThrow();
  });

  it('rejects empty path', () => {
    expect(() => normalizeJsonPath('')).toThrow();
  });

  it('rejects malformed brackets', () => {
    expect(() => normalizeJsonPath('invalid[path')).toThrow();
  });
});

describe('applyFieldSelection — include', () => {
  it('keeps only top-level fields', () => {
    const input = { id: 1, name: 'a', secret: 'x' };
    expect(
      applyFieldSelection(input, { mode: 'include', fields: ['id', 'name'] }),
    ).toEqual({ id: 1, name: 'a' });
  });

  it('keeps nested dot-notation paths', () => {
    const input = { data: { id: 1, extra: 'y' }, meta: 'z' };
    expect(
      applyFieldSelection(input, { mode: 'include', fields: ['data.id'] }),
    ).toEqual({ data: { id: 1 } });
  });

  it('traverses arrays element-wise', () => {
    const input = { tasks: [{ id: 1, name: 'a', big: '...' }, { id: 2, name: 'b', big: '...' }] };
    expect(
      applyFieldSelection(input, { mode: 'include', fields: ['tasks.id', 'tasks.name'] }),
    ).toEqual({ tasks: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] });
  });

  it('keeps whole subtree when parent path selected', () => {
    const input = { data: { a: 1, b: 2 }, other: 3 };
    expect(
      applyFieldSelection(input, { mode: 'include', fields: ['data'] }),
    ).toEqual({ data: { a: 1, b: 2 } });
  });

  it('omits non-existent paths', () => {
    const input = { id: 1 };
    expect(
      applyFieldSelection(input, { mode: 'include', fields: ['id', 'nope'] }),
    ).toEqual({ id: 1 });
  });
});

describe('applyFieldSelection — exclude', () => {
  it('removes top-level fields', () => {
    const input = { id: 1, name: 'a', secret: 'x' };
    expect(
      applyFieldSelection(input, { mode: 'exclude', fields: ['secret'] }),
    ).toEqual({ id: 1, name: 'a' });
  });

  it('removes nested dot-notation paths', () => {
    const input = { data: { id: 1, secret: 'x' } };
    expect(
      applyFieldSelection(input, { mode: 'exclude', fields: ['data.secret'] }),
    ).toEqual({ data: { id: 1 } });
  });

  it('removes field from each array element', () => {
    const input = { tasks: [{ id: 1, big: 'x' }, { id: 2, big: 'y' }] };
    expect(
      applyFieldSelection(input, { mode: 'exclude', fields: ['tasks.big'] }),
    ).toEqual({ tasks: [{ id: 1 }, { id: 2 }] });
  });

  it('is a no-op for non-existent paths', () => {
    const input = { id: 1, name: 'a' };
    expect(
      applyFieldSelection(input, { mode: 'exclude', fields: ['nope.deep'] }),
    ).toEqual({ id: 1, name: 'a' });
  });

  it('does not mutate the input', () => {
    const input = { id: 1, secret: 'x' };
    applyFieldSelection(input, { mode: 'exclude', fields: ['secret'] });
    expect(input).toEqual({ id: 1, secret: 'x' });
  });
});

describe('applyFieldSelection — edge cases', () => {
  it('passes through when fields array is empty', () => {
    const input = { id: 1 };
    expect(applyFieldSelection(input, { mode: 'include', fields: [] })).toBe(input);
  });

  it('passes through non-object response unchanged', () => {
    expect(applyFieldSelection('hello', { mode: 'include', fields: ['a'] })).toBe('hello');
    expect(applyFieldSelection(42, { mode: 'exclude', fields: ['a'] })).toBe(42);
    expect(applyFieldSelection(null, { mode: 'include', fields: ['a'] })).toBeNull();
  });

  it('include with all paths missing returns {}', () => {
    expect(
      applyFieldSelection({ a: 1 }, { mode: 'include', fields: ['nonexistent'] }),
    ).toEqual({});
  });

  it('exclude with all paths missing returns clone (effectively same)', () => {
    const input = { a: 1 };
    const result = applyFieldSelection(input, { mode: 'exclude', fields: ['nonexistent'] });
    expect(result).toEqual({ a: 1 });
    expect(result).not.toBe(input);
  });

  it('handles $. prefix in field paths', () => {
    const input = { id: 1, name: 'a' };
    expect(
      applyFieldSelection(input, { mode: 'include', fields: ['$.id'] }),
    ).toEqual({ id: 1 });
  });

  it('handles $[*]. prefix in field paths', () => {
    const input = { tasks: [{ id: 1, name: 'a' }] };
    expect(
      applyFieldSelection(input, { mode: 'include', fields: ['$[*].tasks.id'] }),
    ).toEqual({ tasks: [{ id: 1 }] });
  });
});

describe('loadFieldProjections', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `weir-fp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when field-projection.json does not exist', () => {
    expect(loadFieldProjections(tmpDir)).toBeNull();
  });

  it('throws on invalid JSON', () => {
    writeFileSync(join(tmpDir, 'field-projection.json'), 'not json');
    expect(() => loadFieldProjections(tmpDir)).toThrow('Invalid JSON');
  });

  it('throws on schema validation error (invalid mode)', () => {
    writeFileSync(
      join(tmpDir, 'field-projection.json'),
      JSON.stringify({ srv: { tool: { mode: 'bad', fields: ['id'] } } }),
    );
    expect(() => loadFieldProjections(tmpDir)).toThrow('validation error');
  });

  it('throws on schema validation error (empty fields array)', () => {
    writeFileSync(
      join(tmpDir, 'field-projection.json'),
      JSON.stringify({ srv: { tool: { mode: 'include', fields: [] } } }),
    );
    expect(() => loadFieldProjections(tmpDir)).toThrow('validation error');
  });

  it('throws on malformed JSONPath at load time', () => {
    writeFileSync(
      join(tmpDir, 'field-projection.json'),
      JSON.stringify({ srv: { tool: { mode: 'include', fields: ['invalid[path'] } } }),
    );
    expect(() => loadFieldProjections(tmpDir)).toThrow('path validation error');
  });

  it('throws on bare $ JSONPath at load time', () => {
    writeFileSync(
      join(tmpDir, 'field-projection.json'),
      JSON.stringify({ srv: { tool: { mode: 'include', fields: ['$'] } } }),
    );
    expect(() => loadFieldProjections(tmpDir)).toThrow('path validation error');
  });

  it('returns ProjectionMap for valid config', () => {
    const config = {
      myServer: {
        getRepo: { mode: 'include' as const, fields: ['id', 'name'] },
        getData: { mode: 'exclude' as const, fields: ['secret'] },
      },
    };
    writeFileSync(join(tmpDir, 'field-projection.json'), JSON.stringify(config));
    const result = loadFieldProjections(tmpDir);
    expect(result).toEqual(config);
  });

  it('accepts JSONPath prefixes ($.field, $[*].field, items[0])', () => {
    const config = {
      srv: {
        tool: { mode: 'include' as const, fields: ['$.id', '$[*].name', 'items[0].x'] },
      },
    };
    writeFileSync(join(tmpDir, 'field-projection.json'), JSON.stringify(config));
    expect(loadFieldProjections(tmpDir)).toEqual(config);
  });
});
