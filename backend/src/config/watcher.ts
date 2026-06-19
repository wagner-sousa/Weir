import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';

export type ConfigChangeCallback = () => void;

export function createWatcher(filePath: string, onChange: ConfigChangeCallback): FSWatcher {
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

  return watcher;
}
