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

export const TestConnectionResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
