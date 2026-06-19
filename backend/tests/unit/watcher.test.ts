import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWatcher } from '../../src/config/watcher';

describe('createWatcher', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `weir-watcher-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    filePath = join(tmpDir, '.mcp.json');
    writeFileSync(filePath, JSON.stringify({ mcpServers: {} }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('calls callback on file change', async () => {
    let called = false;
    const watcher = createWatcher(filePath, () => {
      called = true;
    });

    await new Promise<void>((resolve) => {
      watcher.on('ready', () => {
        writeFileSync(filePath, JSON.stringify({ mcpServers: { test: { transport: { type: 'stdio', command: 'echo' } } } }));
        setTimeout(() => {
          watcher.close();
          resolve();
        }, 600);
      });
    });

    expect(called).toBe(true);
  }, 10_000);

  it('watches a file path', () => {
    const watcher = createWatcher(filePath, () => {});
    expect(watcher).toBeDefined();
    watcher.close();
  });
});
