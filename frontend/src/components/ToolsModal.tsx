import * as Dialog from '@radix-ui/react-dialog';
import { useToolVisibility } from '../hooks/useToolVisibility';
import { LoaderCircle } from 'lucide-react';

interface ToolsModalProps {
  open: boolean;
  mcpName: string;
  onClose: () => void;
}

export function ToolsModal({ open, mcpName, onClose }: ToolsModalProps) {
  const { tools, totalCount, enabledCount, isLoading, toggleMutation, bulkMutation } = useToolVisibility(mcpName);

  function handleToggle(toolName: string, currentEnabled: boolean) {
    toggleMutation.mutate({ toolName, enabled: !currentEnabled });
  }

  function handleBulkToggle(enabled: boolean) {
    bulkMutation.mutate(enabled);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-theme-border bg-theme-panel p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-theme-text">
            Tools — {mcpName}
          </Dialog.Title>
          {totalCount > 0 && (
            <p className="mt-1 text-sm text-theme-muted">
              {enabledCount}/{totalCount} tools enabled
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleBulkToggle(true)}
              className="rounded bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30"
            >
              Enable All
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              className="rounded bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30"
            >
              Disable All
            </button>
          </div>

          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="h-6 w-6 animate-spin text-theme-muted" />
              </div>
            ) : tools.length === 0 ? (
              <p className="py-8 text-center text-sm text-theme-muted">No tools available.</p>
            ) : (
              tools.map((tool) => (
                <div
                  key={tool.name}
                  className={`flex items-center justify-between rounded border border-theme-border p-3 transition-opacity ${
                    tool.enabled ? '' : 'opacity-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-theme-text">{tool.name}</p>
                    {tool.description && (
                      <p className="mt-0.5 truncate text-xs text-theme-muted">{tool.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(tool.name, tool.enabled)}
                    className={`ml-3 shrink-0 rounded px-3 py-1 text-xs font-medium transition-colors ${
                      tool.enabled
                        ? 'bg-teal-600/20 text-teal-400 hover:bg-teal-600/30'
                        : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                    }`}
                  >
                    {tool.enabled ? 'On' : 'Off'}
                  </button>
                </div>
              ))
            )}
          </div>

          <Dialog.Close asChild>
            <button className="absolute right-3 top-3 rounded p-1 text-theme-muted hover:text-theme-text">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
