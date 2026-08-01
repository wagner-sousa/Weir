import { createInterface } from 'node:readline';
import pino from 'pino';
import {
  ProxyState,
  type ProxyConfig,
  type ProxyOptions,
  type TransportAdapter,
  type JsonRpcMessage,
  type MessageBuffer,
  type BackoffState,
} from './types.js';
import { ToonConverter } from '../toon/converter.js';
import { parseEnvConfig } from '../config/schema.js';

const logger = pino({ name: 'weir-proxy' });

export function createMessageBuffer(limit: number): MessageBuffer {
  const queue: JsonRpcMessage[] = [];
  let droppedCount = 0;

  return {
    get queue() {
      return queue;
    },
    get limit() {
      return limit;
    },
    get size() {
      return queue.length;
    },
    get dropped() {
      return droppedCount;
    },
    push(msg: JsonRpcMessage) {
      if (queue.length >= limit) {
        queue.shift();
        droppedCount++;
      }
      queue.push(msg);
    },
    drain() {
      const messages = [...queue];
      queue.length = 0;
      return messages;
    },
  };
}

export function createBackoffState(baseDelay: number, maxDelay: number, maxRetries: number): BackoffState {
  let attempt = 0;

  return {
    get attempt() {
      return attempt;
    },
    set attempt(v: number) {
      attempt = v;
    },
    baseDelay,
    maxDelay,
    maxRetries,
    nextDelay() {
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 200;
      attempt++;
      return Math.min(Math.floor(delay + jitter), maxDelay);
    },
    reset() {
      attempt = 0;
    },
  };
}

type StatusHandler = (status: string, error?: string) => void;

export interface ProxyCallbacks {
  onStatus?: StatusHandler;
}

export async function startProxy(
  config: ProxyConfig,
  transport: TransportAdapter,
  options: ProxyOptions,
  callbacks?: ProxyCallbacks,
  resolveConfig: () => ProxyConfig = () => config,
): Promise<void> {
  const buffer = createMessageBuffer(options.bufferLimit);
  const backoff = createBackoffState(options.reconnectBaseDelay, options.reconnectMaxDelay, options.reconnectMaxRetries);
  let sessionState: ProxyState = ProxyState.CONNECTING;

  const emitStatus = (state: ProxyState, error?: string) => {
    sessionState = state;
    if (callbacks?.onStatus) {
      callbacks.onStatus(state, error);
    }
  };

  let incomingHandler: ((msg: JsonRpcMessage) => void) | null = null;
  let disconnectHandler: (() => void) | null = null;

  transport.onMessage((msg: JsonRpcMessage) => {
    if (incomingHandler) {
      incomingHandler(msg);
    }
  });

  transport.onDisconnect(() => {
    if (disconnectHandler) {
      disconnectHandler();
    }
  });

  transport.onError((err: Error) => {
    emitStatus(ProxyState.CLOSED, err.message);
  });

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const toolCallIds = new Set<string | number>();
  const agentWrite = (msg: JsonRpcMessage) => {
    process.stdout.write(JSON.stringify(msg) + '\n');
  };

  incomingHandler = (msg: JsonRpcMessage) => {
    const isToolCall = msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined);
    if (isToolCall && msg.id !== undefined && msg.id !== null && toolCallIds.has(msg.id)) {
      toolCallIds.delete(msg.id);
      if (msg.result) {
        try {
          const freshConfig = resolveConfig();
          const envConfig = parseEnvConfig();
          const converter = new ToonConverter({
            indent: envConfig.WEIR_TOON_INDENT,
            delimiter: envConfig.WEIR_TOON_DELIMITER,
            flattenDepth: envConfig.WEIR_TOON_FLATTEN_DEPTH,
            threshold: envConfig.WEIR_TOON_THRESHOLD,
            outputMode: freshConfig.outputMode || envConfig.WEIR_TOON_OUTPUT_MODE,
            autoConvert: envConfig.WEIR_TOON_AUTO_CONVERT,
          });
          const converted = converter.convertResult(msg.result);
          if (converted.converted && converted.savings) {
            logger.info({ savings: converted.savings }, `TOON: converted ${config.name}: ${converted.savings.originalTokens}→${converted.savings.toonTokens} tok (${converted.savings.percent}% savings)`);
          }
          agentWrite({ ...msg, result: converted.result } as JsonRpcMessage);
        } catch (err) {
          logger.warn({ err }, `TOON: conversion failed for ${config.name}, returning original JSON`);
          agentWrite(msg);
        }
      } else {
        agentWrite(msg);
      }
    } else {
      agentWrite(msg);
    }
  };

  disconnectHandler = () => {
    emitStatus(ProxyState.RECONNECTING);
    reconnect();
  };

  async function tryConnect(): Promise<void> {
    emitStatus(ProxyState.CONNECTING);
    try {
      await transport.connect();
      emitStatus(ProxyState.CONNECTED);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      emitStatus(ProxyState.CLOSED, message);
      process.stderr.write(`Failed to connect: ${message}\n`);
      process.exit(1);
    }
  }

  async function reconnect(): Promise<void> {
    if (backoff.maxRetries > 0 && backoff.attempt >= backoff.maxRetries) {
      const errMsg = 'Max retries exceeded';
      emitStatus(ProxyState.CLOSED, errMsg);
      process.stderr.write(`${errMsg}\n`);
      process.exit(1);
    }

    const delay = backoff.nextDelay();
    process.stderr.write(`Reconnecting in ${delay}ms (attempt ${backoff.attempt})\n`);

    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          await transport.connect();
          emitStatus(ProxyState.CONNECTED);
          drainBuffer();
          resolve();
        } catch {
          reconnect().then(resolve);
        }
      }, delay);
    });
  }

  function drainBuffer(): void {
    if (buffer.size === 0) return;
    emitStatus(ProxyState.DRAINING);
    const messages = buffer.drain();
    for (const msg of messages) {
      transport.send(msg).catch(() => {});
    }
    emitStatus(ProxyState.CONNECTED);
  }

  rl.on('line', (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(trimmed) as JsonRpcMessage;
    } catch {
      return;
    }

    if (msg.method === 'tools/call' && msg.id !== undefined && msg.id !== null) {
      toolCallIds.add(msg.id);
    }

    if (sessionState === ProxyState.RECONNECTING || sessionState === ProxyState.CONNECTING) {
      buffer.push(msg);
      return;
    }

    transport.send(msg).catch(() => {
      buffer.push(msg);
    });
  });

  await tryConnect();

  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  if (options.keepaliveMs > 0) {
    keepaliveTimer = setInterval(() => {
      if (sessionState === ProxyState.CONNECTED) {
        process.stderr.write(`[health] state=${sessionState} uptime=${Date.now() - startedAt.getTime()}ms buffer=${buffer.size}\n`);
      }
    }, options.keepaliveMs);
  }

  const startedAt = new Date();

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      emitStatus(ProxyState.CLOSED);
      transport.disconnect();
      rl.close();
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      resolve();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    rl.on('close', cleanup);
  });
}

export { ProxyState } from './types.js';
