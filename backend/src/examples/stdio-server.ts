#!/usr/bin/env tsx
import { createInterface } from 'node:readline';

const TOOLS = [
  { name: 'echo', description: 'Echo back the input message', inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } },
];

function handleRequest(req: { id: number; method: string; params?: unknown }) {
  switch (req.method) {
    case 'initialize':
      return { jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} } } };
    case 'tools/list':
      return { jsonrpc: '2.0', id: req.id, result: { tools: TOOLS } };
    case 'tools/call':
      return { jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: 'Echo: hello from stdio MCP' }] } };
    default:
      return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Method not found' } };
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  try {
    const req = JSON.parse(line);
    const response = handleRequest(req);
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch {
    // ignore malformed JSON
  }
});

process.stderr.write('stdio MCP server ready\n');
