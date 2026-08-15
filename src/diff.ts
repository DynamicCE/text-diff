export type DiffMode = 'line' | 'word';

export type DiffChangeType = 'added' | 'removed' | 'unchanged';

export interface DiffChange {
  type: DiffChangeType;
  value: string;
}

export interface TextDiffResult {
  changes: DiffChange[];
  addedLines: number;
  removedLines: number;
}

/**
 * Compares two text values and returns display changes plus line-level counts.
 * Counts stay line based in word mode so the summary always describes lines.
 */
export function calculateTextDiff(
  oldText: string,
  newText: string,
  mode: DiffMode,
): TextDiffResult {
  const oldTokens = mode === 'line' ? splitTextIntoLines(oldText) : splitTextIntoWords(oldText);
  const newTokens = mode === 'line' ? splitTextIntoLines(newText) : splitTextIntoWords(newText);
  const changes = buildDiffChanges(oldTokens, newTokens);

  const lineChanges = buildDiffChanges(splitTextIntoLines(oldText), splitTextIntoLines(newText));

  return {
    changes,
    addedLines: countChangedLines(lineChanges, 'added'),
    removedLines: countChangedLines(lineChanges, 'removed'),
  };
}

export function formatDiffChangesForClipboard(changes: DiffChange[]): string {
  return changes.map(formatDiffChangeForClipboard).join('');
}

function formatDiffChangeForClipboard(change: DiffChange): string {
  const linePrefix = getClipboardLinePrefix(change.type);
  return splitTextIntoLines(change.value)
    .map((line) => `${linePrefix}${line}`)
    .join('');
}

function getClipboardLinePrefix(type: DiffChangeType): string {
  if (type === 'added') {
    return '+ ';
  }

  if (type === 'removed') {
    return '- ';
  }

  return '  ';
}

function splitTextIntoLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let lineStart = 0;

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      lines.push(text.slice(lineStart, index + 1));
      lineStart = index + 1;
    }
  }

  if (lineStart < text.length) {
    lines.push(text.slice(lineStart));
  }

  return lines;
}

function splitTextIntoWords(text: string): string[] {
  if (text.length === 0) {
    return [];
  }

  return text.match(/[\p{L}\p{M}\p{N}_]+|[^\p{L}\p{M}\p{N}_\s]+|\s+/gu) ?? [];
}

function buildDiffChanges(oldTokens: string[], newTokens: string[]): DiffChange[] {
  const commonTokenCounts = buildCommonTokenCounts(oldTokens, newTokens);
  const changes: DiffChange[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldTokens.length || newIndex < newTokens.length) {
    if (
      oldIndex < oldTokens.length &&
      newIndex < newTokens.length &&
      oldTokens[oldIndex] === newTokens[newIndex]
    ) {
      appendDiffChange(changes, 'unchanged', oldTokens[oldIndex]);
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    const canRemoveOldToken = oldIndex < oldTokens.length;
    const canAddNewToken = newIndex < newTokens.length;

    if (
      canRemoveOldToken &&
      (!canAddNewToken ||
        commonTokenCounts[oldIndex + 1][newIndex] >= commonTokenCounts[oldIndex][newIndex + 1])
    ) {
      appendDiffChange(changes, 'removed', oldTokens[oldIndex]);
      oldIndex += 1;
    } else {
      appendDiffChange(changes, 'added', newTokens[newIndex]);
      newIndex += 1;
    }
  }

  return changes;
}

function buildCommonTokenCounts(oldTokens: string[], newTokens: string[]): number[][] {
  const commonTokenCounts = Array.from(
    { length: oldTokens.length + 1 },
    () => new Array<number>(newTokens.length + 1).fill(0),
  );

  for (let oldIndex = oldTokens.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newTokens.length - 1; newIndex >= 0; newIndex -= 1) {
      if (oldTokens[oldIndex] === newTokens[newIndex]) {
        commonTokenCounts[oldIndex][newIndex] = commonTokenCounts[oldIndex + 1][newIndex + 1] + 1;
      } else {
        commonTokenCounts[oldIndex][newIndex] = Math.max(
          commonTokenCounts[oldIndex + 1][newIndex],
          commonTokenCounts[oldIndex][newIndex + 1],
        );
      }
    }
  }

  return commonTokenCounts;
}

function appendDiffChange(changes: DiffChange[], type: DiffChangeType, value: string): void {
  const previousChange = changes[changes.length - 1];

  if (previousChange?.type === type) {
    previousChange.value += value;
    return;
  }

  changes.push({ type, value });
}

function countChangedLines(changes: DiffChange[], type: DiffChangeType): number {
  return changes.reduce((lineCount, change) => {
    if (change.type !== type) {
      return lineCount;
    }

    return lineCount + countLines(change.value);
  }, 0);
}

function countLines(value: string): number {
  if (value.length === 0) {
    return 0;
  }

  const lineBreakCount = (value.match(/\n/g) ?? []).length;
  return value.endsWith('\n') ? lineBreakCount : lineBreakCount + 1;
}
