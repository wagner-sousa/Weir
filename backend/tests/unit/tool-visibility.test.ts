import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadToolVisibility,
  saveToolVisibility,
  getToolEnabled,
  setToolEnabled,
  setBulkVisibility,
  filterTools,
  filterToolsListResponse,
  getVisibilitySummary,
} from '../../src/tool-visibility/index.js';

describe('tool-visibility', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tool-vis-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadToolVisibility', () => {
    it('returns empty object when file does not exist', () => {
      const result = loadToolVisibility(tempDir);
      expect(result).toEqual({});
    });

    it('loads valid visibility config', () => {
      const config = { Bitbucket: { getPullRequests: true, getPullRequest: false } };
      writeFileSync(join(tempDir, 'tool-visibility.json'), JSON.stringify(config));

      const result = loadToolVisibility(tempDir);
      expect(result).toEqual(config);
    });

    it('falls back to empty on corrupted JSON', () => {
      writeFileSync(join(tempDir, 'tool-visibility.json'), 'not valid json {{{');

      const result = loadToolVisibility(tempDir);
      expect(result).toEqual({});
    });

    it('falls back to empty on invalid schema', () => {
      writeFileSync(join(tempDir, 'tool-visibility.json'), JSON.stringify({ bad: 'schema' }));

      const result = loadToolVisibility(tempDir);
      expect(result).toEqual({});
    });
  });

  describe('saveToolVisibility', () => {
    it('writes visibility config to file', () => {
      const config = { MyMCP: { tool1: true, tool2: false } };
      saveToolVisibility(tempDir, config);

      const raw = readFileSync(join(tempDir, 'tool-visibility.json'), 'utf-8');
      expect(JSON.parse(raw)).toEqual(config);
    });
  });

  describe('getToolEnabled', () => {
    it('returns true when no config exists', () => {
      expect(getToolEnabled(tempDir, 'MCP', 'tool')).toBe(true);
    });

    it('returns true when tool not in config', () => {
      saveToolVisibility(tempDir, { MCP: { other: false } });
      expect(getToolEnabled(tempDir, 'MCP', 'tool')).toBe(true);
    });

    it('returns correct value from config', () => {
      saveToolVisibility(tempDir, { MCP: { tool: false } });
      expect(getToolEnabled(tempDir, 'MCP', 'tool')).toBe(false);
    });
  });

  describe('setToolEnabled', () => {
    it('creates config file and sets tool', () => {
      setToolEnabled(tempDir, 'MCP', 'tool', false);
      expect(getToolEnabled(tempDir, 'MCP', 'tool')).toBe(false);
    });

    it('updates existing tool', () => {
      saveToolVisibility(tempDir, { MCP: { tool: false } });
      setToolEnabled(tempDir, 'MCP', 'tool', true);
      expect(getToolEnabled(tempDir, 'MCP', 'tool')).toBe(true);
    });
  });

  describe('setBulkVisibility', () => {
    it('sets all tools to same state', () => {
      saveToolVisibility(tempDir, { MCP: { a: true, b: false, c: true } });
      setBulkVisibility(tempDir, 'MCP', ['a', 'b', 'c'], false);

      expect(getToolEnabled(tempDir, 'MCP', 'a')).toBe(false);
      expect(getToolEnabled(tempDir, 'MCP', 'b')).toBe(false);
      expect(getToolEnabled(tempDir, 'MCP', 'c')).toBe(false);
    });

    it('creates entries for tools not yet in config', () => {
      setBulkVisibility(tempDir, 'MCP', ['x', 'y', 'z'], false);

      expect(getToolEnabled(tempDir, 'MCP', 'x')).toBe(false);
      expect(getToolEnabled(tempDir, 'MCP', 'y')).toBe(false);
      expect(getToolEnabled(tempDir, 'MCP', 'z')).toBe(false);
    });

    it('does nothing when toolNames is empty', () => {
      setBulkVisibility(tempDir, 'MCP', [], false);
      const result = loadToolVisibility(tempDir);
      expect(result).toEqual({});
    });
  });

  describe('filterTools', () => {
    it('returns all tools when no config exists', () => {
      const tools = [{ name: 'a' }, { name: 'b' }];
      expect(filterTools(tempDir, 'MCP', tools)).toEqual(tools);
    });

    it('filters out disabled tools', () => {
      saveToolVisibility(tempDir, { MCP: { a: true, b: false } });
      const tools = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
      expect(filterTools(tempDir, 'MCP', tools)).toEqual([{ name: 'a' }, { name: 'c' }]);
    });
  });

  describe('filterToolsListResponse', () => {
    it('returns original when no tools array', () => {
      const result = { other: 'data' };
      expect(filterToolsListResponse(tempDir, 'MCP', result)).toEqual(result);
    });

    it('filters tools in response', () => {
      saveToolVisibility(tempDir, { MCP: { a: false } });
      const result = { tools: [{ name: 'a' }, { name: 'b' }] };
      expect(filterToolsListResponse(tempDir, 'MCP', result)).toEqual({
        tools: [{ name: 'b' }],
      });
    });
  });

  describe('getVisibilitySummary', () => {
    it('returns correct summary', () => {
      saveToolVisibility(tempDir, { MCP: { a: true, b: false } });
      const summary = getVisibilitySummary(tempDir, 'MCP', ['a', 'b', 'c']);
      expect(summary).toEqual({
        visibility: { a: true, b: false },
        totalCount: 3,
        enabledCount: 2,
      });
    });
  });
});
