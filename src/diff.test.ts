import { describe, expect, it } from 'vitest';
import { calculateTextDiff, formatDiffChangesForClipboard } from './diff';

describe('calculateTextDiff', () => {
  it('returns no changes for two empty texts', () => {
    expect(calculateTextDiff('', '', 'line')).toEqual({
      changes: [],
      addedLines: 0,
      removedLines: 0,
    });
  });

  it('keeps Turkish characters intact while finding a changed line', () => {
    const result = calculateTextDiff('İstanbul çok güzel', 'İstanbul daha güzel', 'line');

    expect(result.changes).toEqual([
      { type: 'removed', value: 'İstanbul çok güzel' },
      { type: 'added', value: 'İstanbul daha güzel' },
    ]);
    expect(result.addedLines).toBe(1);
    expect(result.removedLines).toBe(1);
  });

  it('counts multiline additions without counting unchanged lines', () => {
    const result = calculateTextDiff('alpha\nbeta\n', 'alpha\nbeta\ngamma\n', 'line');

    expect(result.changes).toEqual([
      { type: 'unchanged', value: 'alpha\nbeta\n' },
      { type: 'added', value: 'gamma\n' },
    ]);
    expect(result.addedLines).toBe(1);
    expect(result.removedLines).toBe(0);
  });

  it('counts multiline deletions and preserves the remaining line', () => {
    const result = calculateTextDiff('alpha\nbeta\ngamma\n', 'alpha\ngamma\n', 'line');

    expect(result.changes).toEqual([
      { type: 'unchanged', value: 'alpha\n' },
      { type: 'removed', value: 'beta\n' },
      { type: 'unchanged', value: 'gamma\n' },
    ]);
    expect(result.addedLines).toBe(0);
    expect(result.removedLines).toBe(1);
  });

  it('marks a final newline difference as a line change', () => {
    const result = calculateTextDiff('final line', 'final line\n', 'line');

    expect(result.changes).toEqual([
      { type: 'removed', value: 'final line' },
      { type: 'added', value: 'final line\n' },
    ]);
    expect(result.addedLines).toBe(1);
    expect(result.removedLines).toBe(1);
  });

  it('finds a word insertion without replacing the whole line', () => {
    const result = calculateTextDiff('Merhaba dünya', 'Merhaba güzel dünya', 'word');

    expect(result.changes).toEqual([
      { type: 'unchanged', value: 'Merhaba ' },
      { type: 'added', value: 'güzel ' },
      { type: 'unchanged', value: 'dünya' },
    ]);
    expect(result.addedLines).toBe(1);
    expect(result.removedLines).toBe(1);
  });

  it('uses line mode to count a word-mode multiline insertion', () => {
    const result = calculateTextDiff('one\ntwo', 'one\ninserted\ntwo', 'word');

    expect(result.changes.some((change) => change.type === 'added')).toBe(true);
    expect(result.addedLines).toBe(1);
    expect(result.removedLines).toBe(0);
  });

  it('returns unchanged text as one plain change', () => {
    const result = calculateTextDiff('same\ntext', 'same\ntext', 'line');

    expect(result.changes).toEqual([{ type: 'unchanged', value: 'same\ntext' }]);
    expect(result.addedLines).toBe(0);
    expect(result.removedLines).toBe(0);
  });

  it('formats line changes with visible clipboard prefixes', () => {
    const clipboardText = formatDiffChangesForClipboard([
      { type: 'unchanged', value: 'alpha\n' },
      { type: 'removed', value: 'beta\n' },
      { type: 'added', value: 'gamma\n' },
    ]);

    expect(clipboardText).toBe('  alpha\n- beta\n+ gamma\n');
  });

  it('keeps word-mode change markers visible in clipboard text', () => {
    const clipboardText = formatDiffChangesForClipboard([
      { type: 'unchanged', value: 'Merhaba ' },
      { type: 'added', value: 'güzel ' },
      { type: 'unchanged', value: 'dünya' },
    ]);

    expect(clipboardText).toBe('  Merhaba + güzel   dünya');
  });
});
