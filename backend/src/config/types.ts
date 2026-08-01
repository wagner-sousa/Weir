import { z } from 'zod';
import { TransportType, TransportConfig, MCPServerEntry, MCPConfig, TestConnectionRequest, TestConnectionResponse, FieldSelectionSchema, FieldProjectionConfig, OutputMode, ToonOptions } from './schema.js';

export type TransportType = z.infer<typeof TransportType>;

export type TransportConfig = z.infer<typeof TransportConfig>;

export type MCPServerEntry = z.infer<typeof MCPServerEntry>;

export type MCPConfig = z.infer<typeof MCPConfig>;

export type TestConnectionRequest = z.infer<typeof TestConnectionRequest>;

export type TestConnectionResponse = z.infer<typeof TestConnectionResponse>;

export type FieldSelection = z.infer<typeof FieldSelectionSchema>;

export type FieldProjectionConfig = z.infer<typeof FieldProjectionConfig>;

export interface ProjectionMap {
  [serverName: string]: {
    [toolName: string]: FieldSelection;
  };
}

export type OutputMode = z.infer<typeof OutputMode>;

export type ToonOptions = z.infer<typeof ToonOptions>;

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
  status: 'connected' | 'error' | 'testing' | 'needsAuth' | 'unknown' | 'disconnected';
  error: string | null;
  toolCount: number | null;
  needsAuth?: boolean;
  authUrl?: string | null;
}
