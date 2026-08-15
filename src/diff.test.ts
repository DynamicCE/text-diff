import { describe, expect, it } from 'vitest';
import { buildDiffRows, calculateTextDiff, formatDiffChangesForClipboard } from './diff';

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

describe('buildDiffRows', () => {
  it('aligns a replaced line in the same old and new row', () => {
    expect(buildDiffRows('alpha\nold value\nomega', 'alpha\nnew value\nomega', 'line')).toEqual([
      {
        oldLineNumber: 1,
        oldChanges: [{ type: 'unchanged', value: 'alpha' }],
        newLineNumber: 1,
        newChanges: [{ type: 'unchanged', value: 'alpha' }],
      },
      {
        oldLineNumber: 2,
        oldChanges: [{ type: 'removed', value: 'old value' }],
        newLineNumber: 2,
        newChanges: [{ type: 'added', value: 'new value' }],
      },
      {
        oldLineNumber: 3,
        oldChanges: [{ type: 'unchanged', value: 'omega' }],
        newLineNumber: 3,
        newChanges: [{ type: 'unchanged', value: 'omega' }],
      },
    ]);
  });

  it('keeps unchanged rows aligned around pure insertions and deletions', () => {
    expect(buildDiffRows('one\nthree', 'one\ntwo\nthree', 'line')).toEqual([
      {
        oldLineNumber: 1,
        oldChanges: [{ type: 'unchanged', value: 'one' }],
        newLineNumber: 1,
        newChanges: [{ type: 'unchanged', value: 'one' }],
      },
      {
        oldLineNumber: null,
        oldChanges: [],
        newLineNumber: 2,
        newChanges: [{ type: 'added', value: 'two' }],
      },
      {
        oldLineNumber: 2,
        oldChanges: [{ type: 'unchanged', value: 'three' }],
        newLineNumber: 3,
        newChanges: [{ type: 'unchanged', value: 'three' }],
      },
    ]);

    expect(buildDiffRows('one\ntwo\nthree', 'one\nthree', 'line')[1]).toEqual({
      oldLineNumber: 2,
      oldChanges: [{ type: 'removed', value: 'two' }],
      newLineNumber: null,
      newChanges: [],
    });
  });

  it('keeps word changes on their corresponding old and new sides', () => {
    const rows = buildDiffRows('hello old world', 'hello new world', 'word');

    expect(rows[0]).toEqual({
      oldLineNumber: 1,
      oldChanges: [
        { type: 'unchanged', value: 'hello ' },
        { type: 'removed', value: 'old' },
        { type: 'unchanged', value: ' world' },
      ],
      newLineNumber: 1,
      newChanges: [
        { type: 'unchanged', value: 'hello ' },
        { type: 'added', value: 'new' },
        { type: 'unchanged', value: ' world' },
      ],
    });
  });

  it('highlights only the changed character inside a line', () => {
    const rows = buildDiffRows(
      'connect = host.docker.internal:4443',
      'connect = host.docker.internal:4543',
      'word',
    );

    expect(rows[0].oldChanges).toEqual([
      { type: 'unchanged', value: 'connect = host.docker.internal:4' },
      { type: 'removed', value: '4' },
      { type: 'unchanged', value: '43' },
    ]);
    expect(rows[0].newChanges).toEqual([
      { type: 'unchanged', value: 'connect = host.docker.internal:4' },
      { type: 'added', value: '5' },
      { type: 'unchanged', value: '43' },
    ]);
  });
});
