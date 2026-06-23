import { z } from 'zod';
import { TransportType, TransportConfig, MCPServerEntry, MCPConfig, TestConnectionRequest, TestConnectionResponse } from './schema.js';

export type TransportType = z.infer<typeof TransportType>;

export type TransportConfig = z.infer<typeof TransportConfig>;

export type MCPServerEntry = z.infer<typeof MCPServerEntry>;

export type MCPConfig = z.infer<typeof MCPConfig>;

export type TestConnectionRequest = z.infer<typeof TestConnectionRequest>;

export type TestConnectionResponse = z.infer<typeof TestConnectionResponse>;

export interface MCPClient {
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export type TransportKind = 'stdio' | 'http' | 'sse' | 'unknown';
