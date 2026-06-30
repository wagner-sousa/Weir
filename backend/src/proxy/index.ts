import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { type ProxyConfig, type ProxyOptions, type JsonRpcMessage, defaultProxyOptions } from './types.js';
import { createTransport } from './transport.js';
import { startProxy } from './proxy.js';

export function resolveMcpConfigPath(): string {
  return process.env['MCP_CONFIG_PATH'] || resolve(process.cwd(), '.mcp.json');
}

export function readMcpConfig(): Record<string, unknown> {
  const configPath = resolveMcpConfigPath();
  if (!existsSync(configPath)) {
    throw new Error(`.mcp.json not found at ${configPath}`);
  }
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

export function resolveBackendConfig(name: string): ProxyConfig {
  const config = readMcpConfig();
  const mcpServers = config['mcpServers'] as Record<string, unknown> | undefined;
  if (!mcpServers || !mcpServers[name]) {
    throw new Error(`MCP "${name}" not found in .mcp.json`);
  }

  const entry = mcpServers[name] as Record<string, unknown>;

  const transportEntry = entry['transport'] as Record<string, unknown> | undefined;
  if (transportEntry) {
    const transportType = (transportEntry['type'] as string) || 'stdio';
    const proxyConfig: ProxyConfig = {
      name,
      transport: transportType as 'stdio' | 'sse' | 'http',
    };
    if (transportType === 'stdio') {
      proxyConfig.command = transportEntry['command'] as string;
      proxyConfig.args = transportEntry['args'] as string[] | undefined;
    } else {
      proxyConfig.url = transportEntry['url'] as string;
    }
    return proxyConfig;
  }

  if (entry['command']) {
    return {
      name,
      transport: 'stdio',
      command: entry['command'] as string,
      args: entry['args'] as string[] | undefined,
    };
  }

  if (entry['url']) {
    return {
      name,
      transport: 'sse',
      url: entry['url'] as string,
    };
  }

  throw new Error(`Unable to determine transport for MCP "${name}"`);
}

export async function sendOneMessage(
  name: string,
  message: JsonRpcMessage,
  signal?: AbortSignal,
): Promise<JsonRpcMessage> {
  const config = resolveBackendConfig(name);
  const transport = createTransport(config);

  return new Promise((resolve, reject) => {
    const httpTimeout = parseInt(
      process.env['WEIR_PROXY_HTTP_TIMEOUT'] || '30000',
      10,
    );

    const timeout = setTimeout(() => {
      transport.disconnect();
      reject(new Error('Timeout waiting for response'));
    }, httpTimeout);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        transport.disconnect();
        reject(new Error('Request aborted'));
      }, { once: true });
    }

    transport.onMessage((msg) => {
      clearTimeout(timeout);
      transport.disconnect();
      resolve(msg);
    });

    transport.onError((err) => {
      clearTimeout(timeout);
      transport.disconnect();
      reject(err);
    });

    transport
      .connect()
      .then(() => transport.send(message))
      .catch((err) => {
        clearTimeout(timeout);
        transport.disconnect();
        reject(err);
      });
  });
}

export async function runProxy(name: string, _argv: string[]): Promise<void> {
  try {
    const config = resolveBackendConfig(name);
    const transport = createTransport(config);
    const options: ProxyOptions = defaultProxyOptions();

    await startProxy(config, transport, options, {
      onStatus: (state, error) => {
        if (error) {
          process.stderr.write(`[proxy] ${state}: ${error}\n`);
        }
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
}
