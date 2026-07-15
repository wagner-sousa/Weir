import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import pino from 'pino';
import { ProxyState, type ProxyConfig, type ProxyOptions, type JsonRpcMessage, type ProxySessionHandle, defaultProxyOptions } from './types.js';
import { createTransport } from './transport.js';
import { startProxy } from './proxy.js';
import { loadFieldProjections } from '../projection/index.js';
import { applyFieldSelection } from '../projection/project.js';
import type { ProjectionMap, FieldSelection } from '../config/types.js';
import { ToonConverter } from '../toon/converter.js';
import { parseEnvConfig } from '../config/schema.js';

const logger = pino({ name: 'weir-proxy' });

let _projectionMap: ProjectionMap | null | undefined = undefined;

function getProjectionMap(): ProjectionMap | null {
  if (_projectionMap === undefined) {
    try {
      const configDir = dirname(resolveMcpConfigPath());
      _projectionMap = loadFieldProjections(configDir);
      if (_projectionMap) {
        logger.info('Field projection config loaded');
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to load field-projection.json');
      _projectionMap = null;
    }
  }
  return _projectionMap;
}

function maybeApplyProjection(
  name: string,
  response: JsonRpcMessage,
  request: JsonRpcMessage,
): JsonRpcMessage {
  logger.info({ hasResult: !!response.result, method: request.method }, 'maybeApplyProjection called');
  if (!response.result) { logger.info('no result, returning early'); return response; }
  const toolName = getToolName(request);
  if (!toolName) { logger.info('no tool name, returning early'); return response; }
  const projectionMap = getProjectionMap();
  logger.info({ hasMap: !!projectionMap, name, toolName, sel: projectionMap?.[name]?.[toolName] ? 'found' : 'not found' }, 'projection lookup');
  const serverProjections = projectionMap?.[name];
  const sel: FieldSelection | undefined = serverProjections?.[toolName];
  if (!sel) { logger.info('no selection found, returning early'); return response; }

  try {
    const result = response.result;

    logger.debug({ tool: toolName, resultType: typeof result, isArray: Array.isArray(result), hasContent: typeof result === 'object' && result !== null && 'content' in result }, 'maybeApplyProjection: result shape');

    if (result && typeof result === 'object' && 'content' in result && Array.isArray((result as Record<string, unknown>).content)) {
      const r = result as Record<string, unknown>;
      const content = r.content as Array<Record<string, unknown>>;
      const projected = content.map((item: Record<string, unknown>) => {
        if (item.type !== 'text' || typeof item.text !== 'string') return item;
        try {
          const parsed = JSON.parse(item.text);
          const applied = applyFieldSelection(parsed, sel);
          return { ...item, text: JSON.stringify(applied) };
        } catch {
          return item;
        }
      });
      const newResult: Record<string, unknown> = { ...r, content: projected };
      for (const key of Object.keys(r)) {
        if (key === 'content' || key === 'isError') continue;
        newResult[key] = applyFieldSelection(r[key], sel);
      }
      logger.info({ tool: toolName, mode: sel.mode, fields: sel.fields.length }, 'Field projection applied (content format)');
      return { ...response, result: newResult };
    }

    const projected = applyFieldSelection(result, sel);
    logger.info({ tool: toolName, mode: sel.mode, fields: sel.fields.length }, 'Field projection applied');
    return { ...response, result: projected };
  } catch (err) {
    logger.warn({ err, tool: toolName }, 'Field projection failed, using original result');
    return response;
  }
}

function getToolName(message: JsonRpcMessage): string | undefined {
  if (message.method === 'tools/call' && message.params && typeof message.params === 'object' && 'name' in (message.params as Record<string, unknown>)) {
    return (message.params as Record<string, unknown>).name as string;
  }
  return message.method;
}

export function invalidateProjectionMap(): void {
  _projectionMap = undefined;
  logger.info('Field projection cache invalidated');
}

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

export function resolveOutputMode(entry: Record<string, unknown>, envOutputMode?: string): 'dynamic' | 'json' | 'toon' {
  const perBackend = entry['outputMode'] as string | undefined;
  if (perBackend && ['dynamic', 'json', 'toon'].includes(perBackend)) {
    return perBackend as 'dynamic' | 'json' | 'toon';
  }
  if (envOutputMode && ['dynamic', 'json', 'toon'].includes(envOutputMode)) {
    return envOutputMode as 'dynamic' | 'json' | 'toon';
  }
  return 'dynamic';
}

export function resolveBackendConfig(name: string): ProxyConfig {
  const config = readMcpConfig();
  const mcpServers = config['mcpServers'] as Record<string, unknown> | undefined;
  if (!mcpServers || !mcpServers[name]) {
    throw new Error(`MCP "${name}" not found in .mcp.json`);
  }

  const entry = mcpServers[name] as Record<string, unknown>;
  const envConfig = parseEnvConfig();
  const rawOutputMode = entry['outputMode'];
  if (rawOutputMode !== undefined && typeof rawOutputMode === 'string' && !['dynamic', 'json', 'toon'].includes(rawOutputMode)) {
    logger.warn({ outputMode: rawOutputMode }, `TOON: invalid outputMode "${rawOutputMode}" for backend "${name}", falling back to env/default`);
  }
  const outputMode = resolveOutputMode(entry, envConfig.WEIR_TOON_OUTPUT_MODE);

  const transportEntry = entry['transport'] as Record<string, unknown> | undefined;
  if (transportEntry) {
    const transportType = (transportEntry['type'] as string) || 'stdio';
    const proxyConfig: ProxyConfig = {
      name,
      transport: transportType as 'stdio' | 'sse' | 'http',
      outputMode,
    };
    if (transportType === 'stdio') {
      proxyConfig.command = transportEntry['command'] as string;
      proxyConfig.args = transportEntry['args'] as string[] | undefined;
    } else {
      proxyConfig.url = transportEntry['url'] as string;
    }
    proxyConfig.env = entry['env'] as Record<string, string> | undefined;
    return proxyConfig;
  }

  if (entry['command']) {
    return {
      name,
      transport: 'stdio',
      command: entry['command'] as string,
      args: entry['args'] as string[] | undefined,
      env: entry['env'] as Record<string, string> | undefined,
      outputMode,
    };
  }

  if (entry['url']) {
    const entryType = (entry['type'] as string) || 'sse';
    return {
      name,
      transport: entryType as 'stdio' | 'sse' | 'http',
      url: entry['url'] as string,
      env: entry['env'] as Record<string, string> | undefined,
      outputMode,
    };
  }

  throw new Error(`Unable to determine transport for MCP "${name}"`);
}

export function resolveAccessToken(name: string): string | undefined {
  const raw = readMcpConfig();
  const entry = (raw['mcpServers'] as Record<string, unknown>)?.[name] as Record<string, unknown> | undefined;
  const entryToken = entry?.accessToken as string | undefined;

  // conf writes to mcp-auth.json (no dot prefix) — read from that path
  const authDir = dirname(resolveMcpConfigPath());
  const authPaths = [
    process.env['MCP_AUTH_CONFIG_PATH'],
    resolve(authDir, 'mcp-auth.json'),
    // Backward compatible: also check dotted path
    resolve(authDir, '.mcp-auth.json'),
  ].filter(Boolean) as string[];

  for (const authPath of authPaths) {
    try {
      if (existsSync(authPath)) {
        const authFile = JSON.parse(readFileSync(authPath, 'utf-8')) as Record<string, { accessToken?: string }>;
        // conf stores flat keys like "mcpServers.Postman" when accessPropertiesByDotNotation=false
        const found = authFile[`mcpServers.${name}`]?.accessToken || authFile[name]?.accessToken;
        if (found) return found;
      }
    } catch {
      // ignore malformed auth file, try next path
    }
  }

  return entryToken;
}

export function createProxySession(name: string): ProxySessionHandle {
  const config = resolveBackendConfig(name);
  config.accessToken = resolveAccessToken(name);
  const transport = createTransport(config);
  let state = ProxyState.CONNECTING;
  let messageHandler: ((msg: JsonRpcMessage) => void) | null = null;
  let disconnectHandler: (() => void) | null = null;
  let errorHandler: ((err: Error) => void) | null = null;

  const pendingRequests = new Map<string | number, JsonRpcMessage>();

  transport.onMessage((msg) => {
    let projected = msg;
    if (msg.id != null) {
      const req = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (req) {
        projected = maybeApplyProjection(name, msg, req);
      }
    }
    messageHandler?.(projected);
  });

  transport.onDisconnect(() => {
    pendingRequests.clear();
    disconnectHandler?.();
  });
  transport.onError((err) => errorHandler?.(err));

  return {
    async connect() {
      state = ProxyState.CONNECTING;
      await transport.connect();
      state = ProxyState.CONNECTED;
    },
    disconnect() {
      state = ProxyState.CLOSED;
      pendingRequests.clear();
      transport.disconnect();
    },
    async send(message) {
      if (message.id != null) {
        pendingRequests.set(message.id, message);
      }
      await transport.send(message);
    },
    onMessage(handler) {
      messageHandler = handler;
    },
    onDisconnect(handler) {
      disconnectHandler = handler;
    },
    onError(handler) {
      errorHandler = handler;
    },
    getState: () => state,
  };
}

function createConverterForConfig(config: ProxyConfig): ToonConverter {
  const envConfig = parseEnvConfig();
  return new ToonConverter({
    indent: envConfig.WEIR_TOON_INDENT,
    flattenDepth: envConfig.WEIR_TOON_FLATTEN_DEPTH,
    threshold: envConfig.WEIR_TOON_THRESHOLD,
    outputMode: config.outputMode || envConfig.WEIR_TOON_OUTPUT_MODE,
    autoConvert: envConfig.WEIR_TOON_AUTO_CONVERT,
  });
}

export async function sendOneMessage(
  name: string,
  message: JsonRpcMessage,
  signal?: AbortSignal,
): Promise<JsonRpcMessage> {
  const config = resolveBackendConfig(name);
  config.accessToken = resolveAccessToken(name);
  const transport = createTransport(config);

  return new Promise((resolvePromise, reject) => {
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

    transport.onError((err) => {
      clearTimeout(timeout);
      transport.disconnect();
      reject(err);
    });

    transport
      .connect()
      .then(async () => {
        if (config.transport === 'stdio' && message.method && message.method !== 'initialize') {
          const initBody: JsonRpcMessage = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'weir-proxy', version: '0.1.0' },
            },
          };
          await new Promise<void>((resolveInit) => {
            transport.onMessage(() => resolveInit());
            transport.send(initBody).catch(() => {});
          });
        }

        transport.onMessage((msg) => {
          clearTimeout(timeout);
          transport.disconnect();

          // Apply field projection first
          let processedMsg = maybeApplyProjection(name, msg, message);

          // Then apply TOON conversion
          if (processedMsg.result && message.method === 'tools/call') {
            try {
              const converter = createConverterForConfig(config);
              const converted = converter.convertResult(processedMsg.result);
              if (converted.converted && converted.savings) {
                logger.info({ savings: converted.savings }, `TOON: converted ${name}: ${converted.savings.originalTokens}→${converted.savings.toonTokens} tok (${converted.savings.percent}% savings)`);
              }
              resolvePromise({ ...processedMsg, result: converted.result } as JsonRpcMessage);
            } catch (err) {
              logger.warn({ err }, `TOON: conversion failed for ${name}, returning original JSON`);
              resolvePromise(processedMsg);
            }
          } else {
            resolvePromise(processedMsg);
          }
        });

        await transport.send(message);
      })
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
