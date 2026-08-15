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

export interface DiffRow {
  oldLineNumber: number | null;
  oldChanges: DiffChange[];
  newLineNumber: number | null;
  newChanges: DiffChange[];
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

export function buildDiffRows(oldText: string, newText: string, mode: DiffMode): DiffRow[] {
  const lineChanges = buildDiffChanges(splitTextIntoLines(oldText), splitTextIntoLines(newText));
  const rows: DiffRow[] = [];
  let oldLineNumber = 1;
  let newLineNumber = 1;
  let changeIndex = 0;

  while (changeIndex < lineChanges.length) {
    const change = lineChanges[changeIndex];

    if (change.type === 'unchanged') {
      for (const line of splitTextIntoLines(change.value)) {
        const displayLine = stripLineEnding(line);
        const unchangedChanges: DiffChange[] = [{ type: 'unchanged', value: displayLine }];
        rows.push({
          oldLineNumber,
          oldChanges: unchangedChanges,
          newLineNumber,
          newChanges: unchangedChanges,
        });
        oldLineNumber += 1;
        newLineNumber += 1;
      }
      changeIndex += 1;
      continue;
    }

    const removedLines: string[] = [];
    const addedLines: string[] = [];

    while (changeIndex < lineChanges.length && lineChanges[changeIndex].type !== 'unchanged') {
      const changedLines = splitTextIntoLines(lineChanges[changeIndex].value);

      if (lineChanges[changeIndex].type === 'removed') {
        removedLines.push(...changedLines);
      } else {
        addedLines.push(...changedLines);
      }

      changeIndex += 1;
    }

    const changedRowCount = Math.max(removedLines.length, addedLines.length);

    for (let rowIndex = 0; rowIndex < changedRowCount; rowIndex += 1) {
      const oldLine = removedLines[rowIndex];
      const newLine = addedLines[rowIndex];
      const hasOldLine = oldLine !== undefined;
      const hasNewLine = newLine !== undefined;

      rows.push({
        oldLineNumber: hasOldLine ? oldLineNumber : null,
        oldChanges: buildChangesForDiffSide(oldLine, newLine, mode, true),
        newLineNumber: hasNewLine ? newLineNumber : null,
        newChanges: buildChangesForDiffSide(oldLine, newLine, mode, false),
      });

      if (hasOldLine) {
        oldLineNumber += 1;
      }

      if (hasNewLine) {
        newLineNumber += 1;
      }
    }
  }

  return rows;
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

function stripLineEnding(line: string): string {
  if (!line.endsWith('\n')) {
    return line;
  }

  return line.slice(0, -1).replace(/\r$/, '');
}

function buildChangesForDiffSide(
  oldLine: string | undefined,
  newLine: string | undefined,
  mode: DiffMode,
  showOldSide: boolean,
): DiffChange[] {
  if (oldLine === undefined && newLine === undefined) {
    return [];
  }

  if (oldLine === undefined) {
    if (showOldSide || newLine === undefined) {
      return [];
    }

    return [{ type: 'added', value: stripLineEnding(newLine) }];
  }

  if (newLine === undefined) {
    return showOldSide
      ? [{ type: 'removed', value: stripLineEnding(oldLine) }]
      : [];
  }

  if (mode === 'word') {
    const characterChanges = buildDiffChanges(
      Array.from(stripLineEnding(oldLine)),
      Array.from(stripLineEnding(newLine)),
    );

    const hasCharacterChange = characterChanges.some((change) => change.type !== 'unchanged');

    if (!hasCharacterChange && oldLine !== newLine) {
      return [{
        type: showOldSide ? 'removed' : 'added',
        value: stripLineEnding(showOldSide ? oldLine : newLine),
      }];
    }

    return characterChanges.filter((change) =>
      showOldSide ? change.type !== 'added' : change.type !== 'removed',
    );
  }

  let lineType: DiffChangeType = 'unchanged';

  if (oldLine !== newLine) {
    lineType = showOldSide ? 'removed' : 'added';
  }

  return [{ type: lineType, value: stripLineEnding(showOldSide ? oldLine : newLine) }];
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
