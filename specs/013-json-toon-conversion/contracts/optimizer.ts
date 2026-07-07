// SPEC: TOON Optimizer — structural heuristics for conversion decisions
//
// Pre-encoding guard that decides whether TOON conversion is likely to
// benefit a given JSON payload, avoiding unnecessary encode() calls.
//
// Token counts use gpt-tokenizer's encode(text).length for accurate BPE counts.

export interface OptimizerDecision {
  convert: boolean;
  reason: string;
}

export interface TokenSavings {
  originalBytes: number;
  toonBytes: number;
  originalTokens: number;   // gpt-tokenizer.encode(json).length
  toonTokens: number;       // gpt-tokenizer.encode(toon).length
  percent: number;
}

export interface ToonOptions {
  threshold: number;
  flattenDepth: number;
  // ... other fields as needed
}

/**
 * Recursively compute the maximum nesting depth of a parsed JSON value.
 * Objects/arrays count as 1 level; their children add depth recursively.
 * Primitives (string, number, boolean, null) have depth 0.
 */
export function maxDepth(value: unknown, current?: number): number;

/**
 * Check if an array consists entirely of plain objects sharing the same
 * sorted set of keys. Returns false for empty arrays or non-array values.
 * "Uniform arrays" have the highest TOON compression benefit.
 */
export function isUniformArray(value: unknown): boolean;

/**
 * Main decision function for TOON conversion eligibility.
 * Rules (applied in order):
 * 1. rawText.length < options.threshold → skip ("below threshold")
 * 2. parsed is primitive (null, number, string, bool) → skip ("not object/array")
 * 3. maxDepth(parsed) >= 6 → skip ("deeply nested, TOON benefit minimal")
 * 4. isUniformArray(parsed) === true → convert ("uniform array — high TOON benefit")
 * 5. Fallthrough → convert ("eligible")
 */
export function decideConvert(
  rawText: string,
  parsed: unknown,
  options: ToonOptions,
): OptimizerDecision;
