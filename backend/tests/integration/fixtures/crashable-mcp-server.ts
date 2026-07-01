import { createInterface } from 'node:readline';

const CRASH_AFTER = parseInt(process.env['CRASH_AFTER'] || '1', 10);
let messageCount = 0;

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line: string) => {
  messageCount++;
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

  if (messageCount >= CRASH_AFTER) {
    process.exit(1);
  }
});
