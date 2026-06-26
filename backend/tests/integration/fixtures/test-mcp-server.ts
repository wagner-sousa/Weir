import { createInterface } from 'node:readline';

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line: string) => {
  const msg = JSON.parse(line);
  if (msg.method === 'tools/list') {
    const response = {
      jsonrpc: '2.0',
      id: msg.id,
      result: { tools: [{ name: 'echo', description: 'Echo tool', inputSchema: { type: 'object', properties: {} } }] },
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  } else if (msg.method === 'tools/call') {
    const response = {
      jsonrpc: '2.0',
      id: msg.id,
      result: { content: [{ type: 'text', text: 'ok' }] },
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});
