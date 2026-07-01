import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Download, Copy, Check } from 'lucide-react';

interface MCPConnectionModalProps {
  open: boolean;
  names: string[];
  onClose: () => void;
  mcpPort?: number;
}

type ConnectionMode = 'stdio' | 'http';

export function MCPConnectionModal({ open, names, onClose, mcpPort = 0 }: MCPConnectionModalProps) {
  const mcpAvailable = mcpPort > 0;
  const [mode, setMode] = useState<ConnectionMode>('stdio');

  useEffect(() => {
    if (!mcpAvailable && mode === 'http') {
      setMode('stdio');
    }
  }, [mcpAvailable, mode]);
  const [copied, setCopied] = useState(false);

  const configContent = useCallback((m: ConnectionMode): string => {
    const servers: Record<string, { command?: string; args?: string[]; url?: string }> = {};
    for (const n of names) {
      if (m === 'stdio') {
        servers[n] = { command: 'weir', args: ['--mcp', n] };
      } else {
        const hostname = window.location.hostname;
        servers[n] = { url: `http://${hostname}:${mcpPort}/mcp/${n}` };
      }
    }
    return JSON.stringify({ mcpServers: servers }, null, 2);
  }, [names, mcpPort]);

  function handleCopy() {
    navigator.clipboard.writeText(configContent(mode)).then(() => {
      setCopied(true);
      toast.success('Configuration copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy to clipboard.');
    });
  }

  function handleDownload() {
    const blob = new Blob([configContent(mode)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.mcp.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Configuration downloaded!');
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center py-8">
            <div className="w-full max-w-lg rounded-lg bg-theme-panel p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-bold text-theme-text">
                  {names.length === 1 ? `Connection — ${names[0]}` : `All Connections (${names.length})`}
                </Dialog.Title>
                <Dialog.Close className="rounded p-3 text-theme-muted hover:bg-theme-border hover:text-theme-text">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>

              <div className="mb-4">
                <div className="flex w-full rounded border border-theme-border overflow-hidden">
                  <button
                    onClick={() => setMode('stdio')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                      mode === 'stdio'
                        ? 'bg-theme-accent text-gray-900'
                        : 'bg-theme-bg text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    STDIO
                  </button>
                  <button
                    onClick={() => mcpAvailable && setMode('http')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                      mode === 'http'
                        ? 'bg-theme-accent text-gray-900'
                        : !mcpAvailable
                          ? 'bg-theme-bg text-theme-muted opacity-40 cursor-not-allowed'
                          : 'bg-theme-bg text-theme-muted hover:text-theme-text'
                    }`}
                    title={!mcpAvailable ? 'HTTP mode requires WEIR_MCP_PORT to be set' : undefined}
                  >
                    HTTP
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={configContent(mode)}
                className="w-full rounded border border-theme-border bg-theme-bg p-3 font-mono text-sm text-theme-text resize-none"
                rows={8}
                spellCheck={false}
              />

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-theme-border px-4 py-2 text-sm font-medium text-theme-text hover:bg-theme-border transition-colors"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-theme-accent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-theme-accent-dark transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
