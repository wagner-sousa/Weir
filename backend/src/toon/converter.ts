import { encode, decode as toonDecode } from '@toon-format/toon';
import { computeSavings, estimateTokens } from './stats.js';
import { decideConvert } from './optimizer.js';
import type { ToonOptions, TokenSavings } from './stats.js';


export interface ConversionResult {
  result: unknown;
  savings?: TokenSavings;
  converted: boolean;
}

interface JsonExtraction {
  json: string;
  parsed: unknown;
  start: number;
  end: number;
}

function extractBalanced(text: string, startChar: '{' | '['): { start: number; end: number } | null {
  const start = text.indexOf(startChar);
  if (start === -1) return null;
  const endChar = startChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === startChar) depth++;
    if (ch === endChar) {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  return null;
}

function findJsonInText(text: string): JsonExtraction | null {
  try {
    const parsed = JSON.parse(text);
    return { json: text, parsed, start: 0, end: text.length };
  } catch { /* not pure JSON */ }

  const codeBlockRegex = /```(?:json|javascript|typescript|js|ts)?\s*\n?([\s\S]*?)```/i;
  const match = text.match(codeBlockRegex);
  if (match) {
    const candidate = match[1].trim();
    try {
      const parsed = JSON.parse(candidate);
      return { json: candidate, parsed, start: match.index!, end: match.index! + match[0].length };
    } catch { /* not valid JSON in code block */ }
  }

  const balanced = extractBalanced(text, '{') || extractBalanced(text, '[');
  if (balanced) {
    const candidate = text.substring(balanced.start, balanced.end);
    try {
      const parsed = JSON.parse(candidate);
      return { json: candidate, parsed, start: balanced.start, end: balanced.end };
    } catch { /* balanced block not valid JSON */ }
  }

  return null;
}

const DEFAULT_OPTIONS: ToonOptions = {
  delimiter: 'comma',
  indent: 2,
  flattenDepth: 4,
  threshold: 100,
  outputMode: 'dynamic',
  autoConvert: true,
};

export class ToonConverter {
  private options: ToonOptions;

  constructor(options?: Partial<ToonOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  setOptions(options: ToonOptions): void {
    this.options = options;
  }

  encode(data: unknown): string {
    return encode(data, {
      delimiter: this.options.delimiter,
      indent: this.options.indent,
      flattenDepth: this.options.flattenDepth,
    } as Record<string, unknown>);
  }

  decode(toon: string): unknown {
    return toonDecode(toon);
  }

  convertResult(result: unknown): ConversionResult {
    if (this.options.autoConvert === false) {
      return { result, converted: false };
    }

    const mode = this.options.outputMode;

    if (mode === 'json') {
      return { result, converted: false };
    }

    if (mode === 'toon') {
      return this.convertForced(result);
    }

    return this.dynamicConvert(result);
  }

  convertForced(result: unknown): ConversionResult {
    return this.applyConversion(result, true);
  }

  private dynamicConvert(result: unknown): ConversionResult {
    return this.applyConversion(result, false);
  }

  private applyConversion(result: unknown, forced: boolean): ConversionResult {
    if (typeof result !== 'object' || result === null) {
      return { result, converted: false };
    }

    const input = result as Record<string, unknown>;
    if (!input.content || !Array.isArray(input.content)) {
      return { result, converted: false };
    }

    const content = [...input.content];
    let overallConverted = false;
    let latestSavings: TokenSavings | undefined;
    let firstItemTokens: { original: number; toon: number } | undefined;

    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      if (typeof item !== 'object' || item === null) continue;

      const contentItem = item as Record<string, unknown>;
      if (contentItem.type !== 'text') continue;

      const text = contentItem.text;
      if (typeof text !== 'string') continue;

      const extraction = findJsonInText(text);
      if (!extraction) continue;

      const { json: jsonStr, parsed, start, end } = extraction;

      if (forced) {
        try {
          const toonStr = this.encode(parsed);
          const newText = start === 0 && end === text.length
            ? toonStr
            : text.slice(0, start) + toonStr + text.slice(end);
          content[i] = { ...contentItem, text: newText };
          overallConverted = true;
          latestSavings = computeSavings(jsonStr, toonStr);
          if (!firstItemTokens) {
            firstItemTokens = { original: latestSavings.originalTokens, toon: latestSavings.toonTokens };
          }
        } catch {
          continue;
        }
      } else {
        const decision = decideConvert(jsonStr, parsed, this.options);
        if (!decision.convert) {
          continue;
        }

        try {
          const toonStr = this.encode(parsed);
          const jsonTokens = estimateTokens(jsonStr);
          const toonTokens = estimateTokens(toonStr);
          const savings = computeSavings(jsonStr, toonStr);

          if (!firstItemTokens) {
            firstItemTokens = { original: jsonTokens, toon: toonTokens };
          }

          if (toonTokens < jsonTokens) {
            const newText = start === 0 && end === text.length
              ? toonStr
              : text.slice(0, start) + toonStr + text.slice(end);
            content[i] = { ...contentItem, text: newText };
            overallConverted = true;
            latestSavings = savings;
          } else {
            latestSavings = savings;
          }
        } catch {
          continue;
        }
      }
    }

    let meta: Record<string, unknown> | undefined;
    if (firstItemTokens) {
      meta = {
        'morph/format': overallConverted ? 'toon' : 'json',
        'morph/originalTokens': firstItemTokens.original,
        'morph/toonTokens': firstItemTokens.toon,
        'morph/savingsPercent': latestSavings ? latestSavings.percent : 0,
      };
    }

    return {
      result: meta ? { ...input, content, _meta: meta } : result,
      savings: latestSavings,
      converted: overallConverted,
    };
  }
}
