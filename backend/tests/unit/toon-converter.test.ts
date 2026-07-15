import { describe, it, expect, beforeAll } from 'vitest';
import { ToonConverter } from '../../src/toon/converter.js';
import type { ToonOptions } from '../../src/toon/stats.js';

const dynamicOptions: ToonOptions = {
  indent: 2,
  flattenDepth: 4,
  threshold: 0,
  outputMode: 'dynamic',
};

const toonOptions: ToonOptions = {
  ...dynamicOptions,
  outputMode: 'toon',
};

const jsonOptions: ToonOptions = {
  ...dynamicOptions,
  outputMode: 'json',
};

describe('ToonConverter', () => {
  let converter: ToonConverter;

  beforeAll(() => {
    converter = new ToonConverter(dynamicOptions);
  });

  it('converts uniform array in dynamic mode (TOON more compact vs JSON)', () => {
    const large = Array.from({ length: 50 }, (_, i) => ({ id: i, val: 'x'.repeat(10) }));
    const result = { content: [{ type: 'text', text: JSON.stringify(large) }] };
    const converted = converter.convertResult(result);
    expect(converted.converted).toBe(true);
    expect(converted.savings).toBeDefined();
    if (converted.savings) {
      expect(converted.savings.percent).toBeGreaterThan(0);
    }
  });

  it('passes non-JSON text through unchanged', () => {
    const result = { content: [{ type: 'text', text: 'plain text response' }] };
    const converted = converter.convertResult(result);
    expect(converted.converted).toBe(false);
  });

  it('ignores non-text content items', () => {
    const result = { content: [{ type: 'image', data: 'base64...' }] };
    const converted = converter.convertResult(result);
    expect(converted.converted).toBe(false);
  });

  it('does not convert when JSON is more compact in dynamic mode', () => {
    const smallArr = JSON.stringify([1, 2, 3]);
    const result = { content: [{ type: 'text', text: smallArr }] };
    const converted = converter.convertResult(result);
    expect(converted.converted).toBe(false);
  });

  it('always converts in toon mode', () => {
    const toonConv = new ToonConverter(toonOptions);
    const result = { content: [{ type: 'text', text: JSON.stringify({ a: 1, b: 2 }) }] };
    const converted = toonConv.convertResult(result);
    expect(converted.converted).toBe(true);
    expect(typeof converted.result).toBe('object');
    if (typeof converted.result === 'object' && converted.result !== null) {
      const r = converted.result as Record<string, unknown>;
      if (r.content && Array.isArray(r.content)) {
        const text = (r.content[0] as Record<string, unknown>).text;
        expect(typeof text).toBe('string');
      }
    }
  });

  it('does not convert in json mode', () => {
    const jsonConv = new ToonConverter(jsonOptions);
    const result = { content: [{ type: 'text', text: JSON.stringify({ a: 1, b: 2 }) }] };
    const converted = jsonConv.convertResult(result);
    expect(converted.converted).toBe(false);
  });

  it('preserves original text in json mode', () => {
    const jsonConv = new ToonConverter(jsonOptions);
    const original = JSON.stringify({ a: 1 });
    const result = { content: [{ type: 'text', text: original }] };
    const converted = jsonConv.convertResult(result);
    expect(converted.converted).toBe(false);
    if (typeof converted.result === 'object' && converted.result !== null) {
      const r = converted.result as Record<string, unknown>;
      if (r.content && Array.isArray(r.content)) {
        expect((r.content[0] as Record<string, unknown>).text).toBe(original);
      }
    }
  });

  it('extracts JSON from markdown code block in toon mode', () => {
    const toonConv = new ToonConverter(toonOptions);
    const data = { items: [1, 2, 3], total: 3 };
    const md = `Here is the result:\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\`\nEnd`;
    const result = { content: [{ type: 'text', text: md }] };
    const converted = toonConv.convertResult(result);
    expect(converted.converted).toBe(true);
    if (typeof converted.result === 'object' && converted.result !== null) {
      const r = converted.result as Record<string, unknown>;
      if (r.content && Array.isArray(r.content)) {
        const text = (r.content[0] as Record<string, unknown>).text as string;
        expect(text).toContain('Here is the result');
        expect(text).toContain('End');
        expect(text).not.toContain('```json');
      }
    }
  });

  it('extracts JSON from plain text with balanced braces in toon mode', () => {
    const toonConv = new ToonConverter(toonOptions);
    const data = { name: 'test', value: 42 };
    const text = `Data: ${JSON.stringify(data)}. Processed.`;
    const result = { content: [{ type: 'text', text }] };
    const converted = toonConv.convertResult(result);
    expect(converted.converted).toBe(true);
    if (typeof converted.result === 'object' && converted.result !== null) {
      const r = converted.result as Record<string, unknown>;
      if (r.content && Array.isArray(r.content)) {
        const resultText = (r.content[0] as Record<string, unknown>).text as string;
        expect(resultText).toContain('Data: ');
        expect(resultText).toContain('. Processed.');
        expect(resultText).not.toContain('"test"');
      }
    }
  });

  it('skips non-JSON plain text', () => {
    const toonConv = new ToonConverter(toonOptions);
    const result = { content: [{ type: 'text', text: 'Just a plain text message without any JSON' }] };
    const converted = toonConv.convertResult(result);
    expect(converted.converted).toBe(false);
  });

  it('converts JSON code block without language tag', () => {
    const toonConv = new ToonConverter(toonOptions);
    const data = { ok: true };
    const md = "Result:\n```\n" + JSON.stringify(data) + "\n```";
    const result = { content: [{ type: 'text', text: md }] };
    const converted = toonConv.convertResult(result);
    expect(converted.converted).toBe(true);
  });

  it('skips plain text without any structured format', () => {
    const toonConv = new ToonConverter(toonOptions);
    const result = { content: [{ type: 'text', text: 'Just a regular message without any structured data at all.' }] };
    const converted = toonConv.convertResult(result);
    expect(converted.converted).toBe(false);
  });
});
