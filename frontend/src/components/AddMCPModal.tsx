import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useTestConnection, useAddMCP, useUpdateMCP } from '../hooks/useMCPs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import { X, LoaderCircle, CircleCheck, Plus } from 'lucide-react';
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
  onAuth?: (name: string, url?: string, transport?: string) => void;
}

const envKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function AddMCPModal({ open, existingNames, existingMCP, onClose, onAuth }: AddMCPModalProps) {
  const [type, setType] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState<string[]>([]);
  const [argInput, setArgInput] = useState('');
  const [url, setUrl] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envKeyErrors, setEnvKeyErrors] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const prevTypeRef = useRef(type);

  const testMutation = useTestConnection();
  const addMutation = useAddMCP();
  const updateMutation = useUpdateMCP();
  const queryClient = useQueryClient();

  const isEditing = !!existingMCP;
  const originalName = existingMCP?.name ?? '';
  const savePending = addMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) {
      setType('stdio');
      setCommand('');
      setArgs([]);
      setArgInput('');
      setUrl('');
      setEnvVars([]);
      setEnvKeyErrors([]);
      setName('');
      setNameError('');
      setTestResult(null);
      setTesting(false);
      setDirty(false);
      prevTypeRef.current = 'stdio';
    } else if (existingMCP) {
      const transportType = existingMCP.transport === 'http' || existingMCP.transport === 'sse'
        ? (existingMCP.transport as 'http' | 'sse')
        : 'stdio';
      setType(transportType);
      setCommand(existingMCP.command ?? '');
      setArgs(existingMCP.args ?? []);
      setArgInput('');
      setUrl(existingMCP.url ?? '');
      setEnvVars(
        existingMCP.env
          ? Object.entries(existingMCP.env).map(([key, value]) => ({ key, value }))
          : [],
      );
      setEnvKeyErrors([]);
      setName(existingMCP.name ?? '');
      setNameError('');
      setTestResult(null);
      setTesting(false);
      setDirty(false);
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

  function handleClose() {
    if (testing || savePending) return;
    if (dirty) {
      const confirmed = window.confirm('Unsaved changes will be lost. Continue?');
      if (!confirmed) return;
    }
    onClose();
  }

  function validateName(value: string) {
    setName(value);
    setDirty(true);
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
    if (prevTypeRef.current !== newType) {
      if (isEditing) {
        const confirmed = window.confirm(
          'Changing transport type will clear type-specific fields. Continue?',
        );
        if (!confirmed) return;
      }
      if (newType === 'stdio') {
        setUrl('');
      } else {
        setCommand('');
        setArgs([]);
        setArgInput('');
        setEnvVars([]);
        setEnvKeyErrors([]);
      }
    }
    setType(newType);
    prevTypeRef.current = newType;
    setDirty(true);
  }

  function addArg() {
    const trimmed = argInput.trim();
    if (!trimmed) return;
    setArgs((prev) => [...prev, trimmed]);
    setArgInput('');
    setDirty(true);
  }

  function removeArg(index: number) {
    setArgs((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function validateEnvKey(index: number, value: string) {
    const next = [...envKeyErrors];
    if (value && !envKeyRegex.test(value)) {
      next[index] = 'Invalid name. Use letters, digits, underscores.';
    } else {
      next[index] = '';
    }
    setEnvKeyErrors(next);
  }

  function buildTransport(): TransportConfig {
    const t: TransportConfig = { type };
    if (type === 'stdio') {
      t.command = command;
      if (args.length > 0) t.args = args;
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

  async function handleTest(autoSave = true) {
    setTesting(true);
    setTestResult(null);
    const transport = buildTransport();
    const testName = isEditing ? originalName : undefined;
    const result = await testMutation.mutateAsync({ transport, name: testName });
    setTestResult(result);
    setTesting(false);

    if (autoSave && (result.success || result.needsAuth)) {
      await doSave(transport);
    }
  }

  async function doSave(transport: TransportConfig, triggerAuth = false) {
    const trimmedName = name.trim();
    let result: { success: boolean; name?: string; error?: string; testResult?: TestConnectionResult };

    if (isEditing) {
      result = await updateMutation.mutateAsync({
        originalName,
        name: trimmedName,
        transport,
      });
    } else {
      result = await addMutation.mutateAsync({ name: trimmedName, transport });
    }

    if (!result.success) {
      toast.error(result.error || 'Error saving MCP.');
      return;
    }

    toast.success(`MCP "${trimmedName}" ${isEditing ? 'updated' : 'added'} successfully.`);
    setDirty(false);
    onClose();

    if (triggerAuth) {
      try {
        const authRes = await fetch(`/api/auth/${encodeURIComponent(trimmedName)}/start`, {
          method: 'POST',
        });
        const authData = await authRes.json();
        if (authData.error?.includes('client_id')) {
          toast.warning('OAuth2 client_id not configured. See card for details.');
        } else if (authData.url && onAuth) {
          onAuth(trimmedName);
        }
      } catch {
        toast.error('Failed to start OAuth2 authorization.');
      }
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (nameError || !name.trim()) return;
    const transport = buildTransport();

    if (!testResult) {
      setTesting(true);
      const testResultData = await testMutation.mutateAsync({ transport, name: isEditing ? originalName : undefined });
      setTestResult(testResultData);
      setTesting(false);

      if (testResultData.success || testResultData.needsAuth) {
        const needsAuth = testResultData.needsAuth && type === 'http';
        await doSave(transport, needsAuth);
      } else {
        return;
      }
    } else {
      const needsAuth = testResult.needsAuth && type === 'http';
      await doSave(transport, needsAuth);
    }
  }

  const hasEnvErrors = envKeyErrors.some((e) => e !== '');
  const isValid =
    name.trim() &&
    !nameError &&
    !hasEnvErrors &&
    (type === 'stdio' ? command.trim() : url.trim());

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center py-8">
            <div className="w-full max-w-lg rounded-lg bg-theme-panel p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-bold text-theme-text">
                  {isEditing ? 'Edit MCP' : 'Add MCP'}
                </Dialog.Title>
                <Dialog.Close className="rounded p-3 text-theme-muted hover:bg-theme-border hover:text-theme-text">
                  <X className="h-4 w-4" />
                </Dialog.Close>
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
                        onChange={(e) => { setCommand(e.target.value); setDirty(true); }}
                        className="w-full rounded border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
                        placeholder="e.g.: npx"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-theme-muted">Arguments</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={argInput}
                          onChange={(e) => { setArgInput(e.target.value); setDirty(true); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArg(); } }}
                          className="flex-1 rounded border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
                          placeholder="e.g.: -y"
                        />
                        <button
                          type="button"
                          onClick={addArg}
                          aria-label="Add argument"
                          className="rounded bg-theme-accent px-3 text-sm text-gray-900 hover:bg-theme-accent-dark"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {args.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {args.map((arg, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-200"
                            >
                              {arg}
                              <button
                                type="button"
                                onClick={() => removeArg(i)}
                                className="text-gray-400 hover:text-red-400"
                                aria-label={`Remove argument ${arg}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-sm font-medium text-theme-muted">
                          Environment variables
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setEnvVars((prev) => [...prev, { key: '', value: '' }]);
                            setEnvKeyErrors((prev) => [...prev, '']);
                            setDirty(true);
                          }}
                          className="text-xs text-theme-accent hover:text-theme-accent-dark"
                        >
                          + Add variable
                        </button>
                      </div>
                      {envVars.map((ev, i) => (
                        <div key={i}>
                          <div className="mb-1 flex gap-2">
                            <input
                              type="text"
                              value={ev.key}
                              onChange={(e) => {
                                const next = [...envVars];
                                next[i] = { ...next[i], key: e.target.value };
                                setEnvVars(next);
                                validateEnvKey(i, e.target.value);
                                setDirty(true);
                              }}
                              className={`flex-1 rounded border px-2 py-1 text-sm text-theme-text ${
                                envKeyErrors[i] ? 'border-red-400' : 'border-theme-border'
                              } bg-theme-bg`}
                              placeholder="KEY"
                            />
                            <input
                              type="text"
                              value={ev.value}
                              onChange={(e) => {
                                const next = [...envVars];
                                next[i] = { ...next[i], value: e.target.value };
                                setEnvVars(next);
                                setDirty(true);
                              }}
                              className="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
                              placeholder="value"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEnvVars((prev) => prev.filter((_, j) => j !== i));
                                setEnvKeyErrors((prev) => prev.filter((_, j) => j !== i));
                                setDirty(true);
                              }}
                              className="px-2 text-red-500 hover:text-red-700"
                              aria-label="Remove variable"
                            >
                              &times;
                            </button>
                          </div>
                          {envKeyErrors[i] && (
                            <p className="mb-1 text-xs text-red-500">{envKeyErrors[i]}</p>
                          )}
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
                      onChange={(e) => { setUrl(e.target.value); setDirty(true); }}
                      className="w-full rounded border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
                      placeholder="https://example.com/mcp"
                    />
                  </div>
                )}

                {testResult && !testResult.success && !testResult.needsAuth && (
                  <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                    Connection failed: {testResult.error}
                  </div>
                )}

                {testResult?.needsAuth && (
                  <div className="rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                    Authentication required. Save the MCP, then click the shield icon to authorize via OAuth2.
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleTest()}
                    disabled={!isValid || testing}
                    className={`flex-1 rounded px-4 py-2 text-sm font-medium ${
                      !isValid || testing
                        ? 'cursor-not-allowed bg-gray-700 text-gray-500'
                        : 'border border-theme-border text-theme-text hover:bg-theme-border'
                    }`}
                  >
                    {testing ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Testing...
                      </span>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                  {testResult?.success && (
                    <CircleCheck className="h-5 w-5 shrink-0 text-green-500" />
                  )}
                  <button
                    type="submit"
                    disabled={!isValid || savePending || testing}
                    className={`flex-1 rounded px-4 py-2 text-sm font-medium ${
                      !isValid || savePending || testing
                        ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                        : 'bg-theme-accent text-gray-900 hover:bg-theme-accent-dark'
                    }`}
                  >
                    {testing ? 'Testing...' : savePending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
