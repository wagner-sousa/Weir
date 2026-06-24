import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';

export type ConfigChangeCallback = () => void;
export type ConfigDeleteCallback = (path: string) => void;

export function createWatcher(
  filePath: string,
  onChange: ConfigChangeCallback,
  onDelete?: ConfigDeleteCallback,
): FSWatcher {
  const watcher = watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on('change', onChange);
  watcher.on('add', onChange);
  watcher.on('unlink', (path) => {
    if (onDelete) onDelete(path);
  });

  return watcher;
}
