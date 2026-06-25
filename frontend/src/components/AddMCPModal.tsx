import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useTestConnection, useAddMCP, useUpdateMCP } from '../hooks/useMCPs';
import { toast } from 'sonner';
import type { TransportConfig, MCPClient, TestConnectionResult } from '../services/api';

interface EnvVar {
  key: string;
  value: string;
}

interface AddMCPModalProps {
  open: boolean;
  existingNames: string[];
  existingMCP?: MCPClient;
  onClose: () => void;
}

export function AddMCPModal({ open, existingNames, existingMCP, onClose }: AddMCPModalProps) {
  const [type, setType] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [command, setCommand] = useState('');
  const [argsStr, setArgsStr] = useState('');
  const [url, setUrl] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const prevTypeRef = useRef(type);

  const testMutation = useTestConnection();
  const addMutation = useAddMCP();
  const updateMutation = useUpdateMCP();

  const isEditing = !!existingMCP;
  const originalName = existingMCP?.name ?? '';
  const savePending = addMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) {
      setType('stdio');
      setCommand('');
      setArgsStr('');
      setUrl('');
      setEnvVars([]);
      setName('');
      setNameError('');
      setTestResult(null);
      setTesting(false);
      prevTypeRef.current = 'stdio';
    } else if (existingMCP) {
      const transportType = existingMCP.transport === 'http' || existingMCP.transport === 'sse'
        ? (existingMCP.transport as 'http' | 'sse')
        : 'stdio';
      setType(transportType);
      setCommand(existingMCP.command ?? '');
      setArgsStr(existingMCP.args?.join(' ') ?? '');
      setUrl(existingMCP.url ?? '');
      setEnvVars(
        existingMCP.env
          ? Object.entries(existingMCP.env).map(([key, value]) => ({ key, value }))
          : [],
      );
      setName(existingMCP.name ?? '');
      setNameError('');
      setTestResult(null);
      setTesting(false);
      prevTypeRef.current = transportType;
    }
  }, [open, existingMCP]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (testing || testMutation.isPending) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [testing, testMutation.isPending]);

  function validateName(value: string) {
    setName(value);
    if (!value.trim()) {
      setNameError('');
      return;
    }
    const trimmed = value.trim();
    if (isEditing && trimmed === originalName) {
      setNameError('');
      return;
    }
    if (existingNames.includes(trimmed)) {
      setNameError('An MCP with this name already exists.');
    } else {
      setNameError('');
    }
  }

  function handleTypeChange(newType: 'stdio' | 'http' | 'sse') {
    if (isEditing && prevTypeRef.current !== newType) {
      const confirmed = window.confirm(
        'Changing transport type will clear type-specific fields. Continue?',
      );
      if (!confirmed) return;
      if (newType === 'stdio') {
        setUrl('');
      } else {
        setCommand('');
        setArgsStr('');
        setEnvVars([]);
      }
    }
    setType(newType);
    prevTypeRef.current = newType;
  }

  function buildTransport(): TransportConfig {
    const t: TransportConfig = { type };
    if (type === 'stdio') {
      t.command = command;
      const parsed = argsStr
        .split(' ')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parsed.length > 0) t.args = parsed;
      const env: Record<string, string> = {};
      envVars.forEach((e) => {
        if (e.key.trim()) env[e.key.trim()] = e.value;
      });
      if (Object.keys(env).length > 0) t.env = env;
    } else {
      t.url = url;
    }
    return t;
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const transport = buildTransport();
    const testName = isEditing ? originalName : undefined;
    const result = await testMutation.mutateAsync({ transport, name: testName });
    setTestResult(result);
    setTesting(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (nameError || !name.trim()) return;
    const transport = buildTransport();
    const trimmedName = name.trim();

    if (isEditing) {
      const result = await updateMutation.mutateAsync({
        originalName,
        name: trimmedName,
        transport,
      });
      if (result.success) {
        toast.success(`MCP "${trimmedName}" updated successfully.`);
        onClose();
      } else {
        toast.error(result.error || 'Error updating MCP.');
      }
    } else {
      const result = await addMutation.mutateAsync({ name: trimmedName, transport });
      if (result.success) {
        toast.success(`MCP "${trimmedName}" added successfully.`);
        onClose();
      } else {
        toast.error(result.error || 'Error adding MCP.');
      }
    }
  }

  if (!open) return null;

  const isValid =
    name.trim() &&
    !nameError &&
    (type === 'stdio' ? command.trim() : url.trim());

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50">
      <div className="flex min-h-full items-start justify-center py-8">
        <div className="w-full max-w-lg rounded-lg bg-theme-panel p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-theme-text">{isEditing ? 'Edit MCP' : 'Add MCP'}</h2>
          <button
            onClick={onClose}
            className="rounded p-3 text-theme-muted hover:bg-theme-border hover:text-theme-text"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-theme-muted">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => validateName(e.target.value)}
              className={`w-full rounded border bg-theme-bg px-3 py-2 text-sm text-theme-text ${
                nameError ? 'border-red-400' : 'border-theme-border'
              }`}
              placeholder="e.g.: my-server"
            />
            {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-theme-muted">Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as 'stdio' | 'http' | 'sse')}
              className="w-full rounded border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
            >
              <option value="stdio">STDIO</option>
              <option value="http">HTTP</option>
              <option value="sse">SSE</option>
            </select>
          </div>

          {type === 'stdio' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-theme-muted">Command</label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full rounded border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
                  placeholder="e.g.: npx"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-theme-muted">
                  Arguments (space-separated)
                </label>
                <input
                  type="text"
                  value={argsStr}
                  onChange={(e) => setArgsStr(e.target.value)}
                  className="w-full rounded border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
                  placeholder="e.g.: -y @modelcontextprotocol/server-filesystem /tmp"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-theme-muted">
                    Environment variables
                  </label>
                  <button
                    type="button"
                    onClick={() => setEnvVars((prev) => [...prev, { key: '', value: '' }])}
                    className="text-xs text-theme-accent hover:text-theme-accent-dark"
                  >
                    + Add variable
                  </button>
                </div>
                {envVars.map((ev, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={ev.key}
                      onChange={(e) => {
                        const next = [...envVars];
                        next[i] = { ...next[i], key: e.target.value };
                        setEnvVars(next);
                      }}
                      className="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
                      placeholder="KEY"
                    />
                    <input
                      type="text"
                      value={ev.value}
                      onChange={(e) => {
                        const next = [...envVars];
                        next[i] = { ...next[i], value: e.target.value };
                        setEnvVars(next);
                      }}
                      className="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
                      placeholder="value"
                    />
                    <button
                      type="button"
                      onClick={() => setEnvVars((prev) => prev.filter((_, j) => j !== i))}
                      className="px-2 text-red-500 hover:text-red-700"
                      aria-label="Remove variable"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {(type === 'http' || type === 'sse') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-theme-muted">URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
                placeholder="https://example.com/mcp"
              />
            </div>
          )}

          {testResult && (
            <div
              className={`rounded px-3 py-2 text-sm ${
                testResult.success
                  ? 'bg-green-50 text-green-700'
                  : testResult.needsAuth
                    ? 'bg-yellow-50 text-yellow-800'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              {testResult.success
                ? 'Connection successful!'
                : testResult.needsAuth
                  ? 'Authentication required. Save the MCP, then click the shield icon to authorize via OAuth2.'
                  : `Connection failed: ${testResult.error}`}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={!isValid || testing}
              className={`flex-1 rounded px-4 py-2 text-sm font-medium ${
                !isValid || testing
                  ? 'cursor-not-allowed bg-gray-700 text-gray-500'
                  : 'border border-theme-border text-theme-text hover:bg-theme-border'
              }`}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={!isValid || savePending}
              className={`flex-1 rounded px-4 py-2 text-sm font-medium ${
                !isValid || savePending
                  ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                  : 'bg-theme-accent text-gray-900 hover:bg-theme-accent-dark'
              }`}
            >
              {savePending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}