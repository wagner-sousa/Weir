import { useState, useEffect, type FormEvent } from 'react';
import { useTestConnection, useAddMCP } from '../hooks/useMCPs';
import { showToast } from './Toast';
import type { TransportConfig } from '../services/api';

interface EnvVar {
  key: string;
  value: string;
}

interface AddMCPModalProps {
  open: boolean;
  existingNames: string[];
  onClose: () => void;
}

export function AddMCPModal({ open, existingNames, onClose }: AddMCPModalProps) {
  const [type, setType] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [command, setCommand] = useState('');
  const [argsStr, setArgsStr] = useState('');
  const [url, setUrl] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const testMutation = useTestConnection();
  const addMutation = useAddMCP();

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
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (testing || testMutation.isPending) {
        e.preventDefault();
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
    if (existingNames.includes(value.trim())) {
      setNameError('Um MCP com este nome já existe.');
    } else {
      setNameError('');
    }
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
    const result = await testMutation.mutateAsync({ transport });
    setTestResult(result);
    setTesting(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (nameError || !name.trim()) return;
    const transport = buildTransport();
    const result = await addMutation.mutateAsync({ name: name.trim(), transport });
    if (result.success) {
      showToast(`MCP "${name.trim()}" adicionado com sucesso.`, 'success');
      onClose();
    } else {
      showToast(result.error || 'Erro ao adicionar MCP.', 'error');
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
        <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Adicionar MCP</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => validateName(e.target.value)}
              className={`w-full rounded border px-3 py-2 text-sm ${
                nameError ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="ex: meu-servidor"
            />
            {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'stdio' | 'http' | 'sse')}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="stdio">stdio</option>
              <option value="http">HTTP</option>
              <option value="sse">SSE</option>
            </select>
          </div>

          {type === 'stdio' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Comando</label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="ex: npx"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Argumentos (separados por espaço)
                </label>
                <input
                  type="text"
                  value={argsStr}
                  onChange={(e) => setArgsStr(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="ex: -y @modelcontextprotocol/server-filesystem /tmp"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Variáveis de ambiente
                  </label>
                  <button
                    type="button"
                    onClick={() => setEnvVars((prev) => [...prev, { key: '', value: '' }])}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Adicionar variável
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
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="CHAVE"
                    />
                    <input
                      type="text"
                      value={ev.value}
                      onChange={(e) => {
                        const next = [...envVars];
                        next[i] = { ...next[i], value: e.target.value };
                        setEnvVars(next);
                      }}
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="valor"
                    />
                    <button
                      type="button"
                      onClick={() => setEnvVars((prev) => prev.filter((_, j) => j !== i))}
                      className="px-2 text-red-500 hover:text-red-700"
                      aria-label="Remover variável"
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
              <label className="mb-1 block text-sm font-medium text-gray-700">URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://exemplo.com/mcp"
              />
            </div>
          )}

          {testResult && (
            <div
              className={`rounded px-3 py-2 text-sm ${
                testResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {testResult.success
                ? 'Conexão bem-sucedida!'
                : `Falha na conexão: ${testResult.error}`}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={!isValid || testing}
              className={`flex-1 rounded px-4 py-2 text-sm font-medium ${
                !isValid || testing
                  ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button
              type="submit"
              disabled={!isValid || addMutation.isPending}
              className={`flex-1 rounded px-4 py-2 text-sm font-medium ${
                !isValid || addMutation.isPending
                  ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {addMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}
