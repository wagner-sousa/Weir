import { z } from 'zod';
import { TransportType, TransportConfig, MCPServerEntry, MCPConfig, TestConnectionRequest, TestConnectionResponse, OutputMode, ToonOptions, ToonDelimiter } from './schema.js';

export type TransportType = z.infer<typeof TransportType>;

export type TransportConfig = z.infer<typeof TransportConfig>;

export type MCPServerEntry = z.infer<typeof MCPServerEntry>;

export type MCPConfig = z.infer<typeof MCPConfig>;

export type TestConnectionRequest = z.infer<typeof TestConnectionRequest>;

export type TestConnectionResponse = z.infer<typeof TestConnectionResponse>;

export type OutputMode = z.infer<typeof OutputMode>;

export type ToonOptions = z.infer<typeof ToonOptions>;

export type ToonDelimiter = z.infer<typeof ToonDelimiter>;

export interface MCPClient {
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export type TransportKind = 'stdio' | 'http' | 'sse' | 'unknown';

export interface CachedStatus {
  status: 'connected' | 'error' | 'needsAuth' | 'unknown' | 'disconnected';
  error: string | null;
  toolCount: number;
  needsAuth: boolean;
  authUrl: string | null;
  lastTestedAt: number;
}

export interface StatusUpdate {
  name: string;
  status: 'connected' | 'error' | 'needsAuth' | 'testing' | 'unknown' | 'disconnected';
  error: string | null;
  toolCount: number | null;
  needsAuth?: boolean;
  authUrl?: string | null;
}
