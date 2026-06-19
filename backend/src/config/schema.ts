import { z } from 'zod';

export const TransportType = z.enum(['stdio', 'http', 'sse']);

export const TransportConfig = z
  .object({
    type: TransportType,
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().url().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'stdio') return !!data.command;
      if (data.type === 'http' || data.type === 'sse') return !!data.url;
      return true;
    },
    { message: 'Transport config missing required fields for type' },
  );

export const MCPServerEntry = z.object({
  transport: TransportConfig,
});

export const MCPConfig = z.object({
  mcpServers: z.record(z.string(), MCPServerEntry),
});
