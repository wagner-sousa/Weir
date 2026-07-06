// SPEC: ToonConverter — JSON→TOON conversion for MCP tool responses
//
// Transforms JSON text content items inside MCP CallToolResult responses
// to TOON format based on the configured output mode.

import type { TokenSavings } from './optimizer.ts';

export interface ConversionResult {
  result: unknown;
  savings?: TokenSavings;
  converted: boolean;
}

export interface ToonOptions {
  delimiter: 'comma' | 'tab' | 'pipe';
  indent: number;
  flattenDepth: number;
  threshold: number;
  outputMode: 'dynamic' | 'json' | 'toon';
}

export class ToonConverter {
  constructor(options: ToonOptions);

  /** Update converter options at runtime (hot-read) */
  setOptions(options: ToonOptions): void;

  /** Encode arbitrary data to TOON string */
  encode(data: unknown): string;

  /** Decode TOON string back to JS value */
  decode(toon: string): unknown;

  /**
   * Convert JSON text items in a tool result where TOON is more compact.
   * In `dynamic` mode: encode, compare sizes, keep smaller.
   * In `json` mode: passthrough (no conversion).
   * In `toon` mode: calls convertForced.
   * Non-text items and non-JSON text pass through untouched.
   */
  convertResult(result: unknown): ConversionResult;

  /**
   * Always convert JSON text items to TOON regardless of size comparison.
   * Used by `outputMode: 'toon'`.
   */
  convertForced(result: unknown): ConversionResult;
}
