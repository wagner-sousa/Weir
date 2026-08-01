import { encode } from 'gpt-tokenizer';

export interface TokenSavings {
  originalBytes: number;
  toonBytes: number;
  originalTokens: number;
  toonTokens: number;
  percent: number;
}

export interface ToonOptions {
  delimiter?: 'comma' | 'tab' | 'pipe';
  indent: number;
  flattenDepth: number;
  threshold: number;
  outputMode: 'dynamic' | 'json' | 'toon';
  autoConvert?: boolean;
}

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return encode(text).length;
}

export function estimateSavings(originalTokens: number, toonTokens: number): number {
  if (originalTokens === 0) return 0;
  return Math.round(((originalTokens - toonTokens) / originalTokens) * 100);
}

export function computeSavings(
  originalText: string,
  toonText: string,
): TokenSavings {
  const originalBytes = Buffer.byteLength(originalText, 'utf-8');
  const toonBytes = Buffer.byteLength(toonText, 'utf-8');
  const originalTokens = estimateTokens(originalText);
  const toonTokens = estimateTokens(toonText);
  return {
    originalBytes,
    toonBytes,
    originalTokens,
    toonTokens,
    percent: estimateSavings(originalTokens, toonTokens),
  };
}
