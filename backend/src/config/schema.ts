import { z } from 'zod';

export const TransportType = z.enum(['stdio', 'http', 'sse']);

export const TransportConfig = z
  .object({
    type: TransportType,
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().url().optional(),
    env: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'stdio') return !!data.command;
      if (data.type === 'http' || data.type === 'sse') return !!data.url;
      return true;
    },
    { message: 'Transport config missing required fields for type' },
  );

export const MCPServerEntry = z.preprocess(
  (input) => {
    if (typeof input === 'object' && input !== null && !('transport' in input)) {
      const { type, command, args, url, env } = input as Record<string, unknown>;
      return { transport: { type, command, args, url, env } };
    }
    return input;
  },
  z.object({
    transport: TransportConfig,
  }),
);

export const MCPConfig = z.object({
  mcpServers: z.record(z.string(), MCPServerEntry),
});

export const TestConnectionRequest = z.preprocess(
  (input) => {
    if (typeof input === 'object' && input !== null && !('transport' in input)) {
      const { name, type, command, args, url, env } = input as Record<string, unknown>;
      return { name, transport: { type, command, args, url, env } };
    }
    return input;
  },
  z.object({
    name: z.string().optional(),
    transport: TransportConfig,
  }),
);

const AuthConfig = z.object({
  authorizationEndpoint: z.string(),
  tokenEndpoint: z.string(),
  registrationEndpoint: z.string().optional(),
  scopesSupported: z.array(z.string()).optional(),
});

export const TestConnectionResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  needsAuth: z.boolean().optional(),
  authUrl: z.string().nullable().optional(),
  authConfig: AuthConfig.optional(),
});

export const FieldSelectionSchema = z.object({
  mode: z.enum(['include', 'exclude']),
  fields: z.array(z.string()).min(1),
});

export const FieldProjectionConfig = z.record(
  z.string(),
  z.record(z.string(), FieldSelectionSchema),
);

export const EnvConfig = z.object({
  WEIR_MCP_PORT: z.coerce.number().int().min(0).default(4000),
  WEIR_PROXY_RECONNECT_BASE_DELAY: z.coerce.number().int().min(100).default(1000),
  WEIR_PROXY_RECONNECT_MAX_DELAY: z.coerce.number().int().min(100).default(30000),
  WEIR_PROXY_RECONNECT_MAX_RETRIES: z.coerce.number().int().min(0).default(10),
  WEIR_PROXY_BUFFER_LIMIT: z.coerce.number().int().min(1).default(100),
  WEIR_PROXY_BACKEND_TIMEOUT: z.coerce.number().int().min(100).default(5000),
  WEIR_PROXY_KEEPALIVE_MS: z.coerce.number().int().min(1000).default(15000),
});

export function parseEnvConfig(): z.infer<typeof EnvConfig> {
  const result = EnvConfig.safeParse(process.env);
  if (!result.success) {
    const fallback = EnvConfig.parse({});
    process.stderr.write(`[config] Invalid env var(s): ${result.error.errors.map(e => e.path.join('.')).join(', ')}; using defaults\n`);
    return fallback;
  }
  return result.data;
}
