import type { ConnectionResult } from '../../src/services/mcp-client.js';

export function mockDnsFailure(): ConnectionResult {
  return {
    success: false,
    error: 'Server unreachable: DNS resolution failed for http://host.docker.internal:9121/mcp',
  };
}

export function mockConnectionRefused(): ConnectionResult {
  return {
    success: false,
    error: 'Server unreachable: Connection refused at http://host.docker.internal:9121/mcp',
  };
}

export function mockConnectionTimeout(): ConnectionResult {
  return {
    success: false,
    error: 'Server unreachable: Connection timed out at http://host.docker.internal:9121/mcp',
  };
}

export function mockSuccessWithTools(toolCount: number): ConnectionResult {
  return {
    success: true,
    error: undefined,
  };
}
