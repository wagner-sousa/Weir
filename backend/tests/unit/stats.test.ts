import { describe, it, expect } from 'vitest';
import { estimateTokens, estimateSavings } from '../../src/toon/stats.js';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 1 for a single character', () => {
    expect(estimateTokens('a')).toBe(1);
  });

  it('returns 1 for 4 chars (fits in 1 token)', () => {
    expect(estimateTokens('aaaa')).toBe(1);
  });

  it('returns 2 for 5 chars (crosses token boundary)', () => {
    expect(estimateTokens('aaaaa')).toBe(2);
  });

  it('handles longer text', () => {
    const tokens = estimateTokens('Hello, world! This is a test.');
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('estimateSavings', () => {
  it('returns 0% when formats are identical in tokens', () => {
    const savings = estimateSavings(100, 100);
    expect(savings).toBe(0);
  });

  it('returns positive percent when TOON is smaller', () => {
    const savings = estimateSavings(100, 60);
    expect(savings).toBe(40);
  });

  it('returns negative percent when TOON is larger', () => {
    const savings = estimateSavings(60, 90);
    expect(savings).toBe(-50);
  });

  it('handles 100% savings (zero TOON tokens)', () => {
    const savings = estimateSavings(50, 0);
    expect(savings).toBe(100);
  });

  it('handles zero original tokens gracefully', () => {
    const savings = estimateSavings(0, 0);
    expect(savings).toBe(0);
  });
});
