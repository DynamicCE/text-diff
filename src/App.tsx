import { useMemo, useState, type ChangeEvent } from 'react';
import {
  buildDiffRows,
  calculateTextDiff,
  formatDiffChangesForClipboard,
  type DiffChange,
  type DiffRow,
} from './diff';

function App() {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [comparedOldText, setComparedOldText] = useState<string | null>(null);
  const [comparedNewText, setComparedNewText] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const hasComparison = comparedOldText !== null && comparedNewText !== null;

  const diff = useMemo(
    () => {
      if (comparedOldText === null || comparedNewText === null) {
        return null;
      }

      return calculateTextDiff(comparedOldText, comparedNewText, 'line');
    },
    [comparedOldText, comparedNewText],
  );
  const diffRows = useMemo(
    () => {
      if (comparedOldText === null || comparedNewText === null) {
        return [];
      }

      return buildDiffRows(comparedOldText, comparedNewText, 'word');
    },
    [comparedOldText, comparedNewText],
  );

  const handleOldTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setOldText(event.target.value);
    setCopyStatus('');
  };

  const handleNewTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setNewText(event.target.value);
    setCopyStatus('');
  };

  const handleFindDifference = () => {
    setComparedOldText(oldText);
    setComparedNewText(newText);
    setCopyStatus('');
  };

  const handleSwapTexts = () => {
    setOldText(newText);
    setNewText(oldText);
    setComparedOldText(null);
    setComparedNewText(null);
    setCopyStatus('');
  };

  const handleClearTexts = () => {
    setOldText('');
    setNewText('');
    setComparedOldText(null);
    setComparedNewText(null);
    setCopyStatus('');
  };

  const handleCopyResult = () => {
    if (!diff || !navigator.clipboard) {
      setCopyStatus('Clipboard access is unavailable in this browser.');
      return;
    }

    void navigator.clipboard
      .writeText(formatDiffChangesForClipboard(diff.changes))
      .then(() => setCopyStatus('Result copied.'))
      .catch(() => setCopyStatus('Copy failed. Please try again.'));
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Browser tool</p>
          <h1>Text diff</h1>
          <p className="page-description">
            Compare two texts instantly. Your text never leaves your browser.
          </p>
        </div>
      </header>

      {hasComparison && diff && (
        <section className="result-section result-reveal" aria-labelledby="result-title">
          <div className="section-heading result-heading">
            <div>
              <p className="eyebrow">Output</p>
              <h2 id="result-title">Comparison result</h2>
            </div>
            <div className="result-actions">
              <button type="button" className="button button-primary" onClick={handleCopyResult}>
                Copy result
              </button>
            </div>
          </div>

          <div className="summary" aria-live="polite">
            <span className="summary-item summary-item-added">
              <span className="summary-dot" aria-hidden="true" />
              Lines added: <strong>{diff.addedLines}</strong>
            </span>
            <span className="summary-item summary-item-removed">
              <span className="summary-dot" aria-hidden="true" />
              Lines removed: <strong>{diff.removedLines}</strong>
            </span>
            {copyStatus && <span className="copy-status">{copyStatus}</span>}
          </div>

          <div className="diff-view" aria-live="polite">
            {diff.changes.length === 0 ? (
              <p className="empty-state">No differences found.</p>
            ) : (
              <div className="diff-table">
                <div className="diff-table-header">
                  <div className="diff-table-heading diff-table-heading-old">
                    <span className="diff-table-heading-icon" aria-hidden="true">−</span>
                    <span>Old text</span>
                    <span className="diff-table-heading-count">{diff.removedLines} removed</span>
                  </div>
                  <div className="diff-table-heading diff-table-heading-new">
                    <span className="diff-table-heading-icon" aria-hidden="true">＋</span>
                    <span>New text</span>
                    <span className="diff-table-heading-count">{diff.addedLines} added</span>
                  </div>
                </div>
                {diffRows.map((row, index) => (
                  <DiffRowView key={`diff-row-${index}`} row={row} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="editor-section" aria-labelledby="editor-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Input</p>
            <h2 id="editor-title">Compare your texts</h2>
          </div>
          <div className="editor-actions">
            <button type="button" className="button button-secondary" onClick={handleSwapTexts}>
              Swap fields
            </button>
            <button type="button" className="button button-secondary" onClick={handleClearTexts}>
              Clear
            </button>
          </div>
        </div>

        <div className="editor-grid">
          <label className="editor-card" htmlFor="old-text">
            <span className="editor-label">
              <span>Old text</span>
              <span className="editor-label-hint">Original</span>
            </span>
            <textarea
              id="old-text"
              value={oldText}
              onChange={handleOldTextChange}
              placeholder="Paste the original text here..."
              spellCheck="false"
            />
          </label>
          <label className="editor-card" htmlFor="new-text">
            <span className="editor-label">
              <span>New text</span>
              <span className="editor-label-hint">Updated</span>
            </span>
            <textarea
              id="new-text"
              value={newText}
              onChange={handleNewTextChange}
              placeholder="Paste the updated text here..."
              spellCheck="false"
            />
          </label>
        </div>
        <div className="find-difference-action">
          <button type="button" className="button button-primary find-button" onClick={handleFindDifference}>
            Find Difference
          </button>
        </div>
      </section>
    </main>
  );
}

function DiffChangeSpan({ change }: { change: DiffChange }) {
  return <span className={`diff-change diff-change-${change.type}`}>{change.value}</span>;
}

function DiffRowView({ row }: { row: DiffRow }) {
  return (
    <div className="diff-table-row">
      <DiffLine lineNumber={row.oldLineNumber} changes={row.oldChanges} isOldSide />
      <DiffLine lineNumber={row.newLineNumber} changes={row.newChanges} isOldSide={false} />
    </div>
  );
}

function DiffLine({
  lineNumber,
  changes,
  isOldSide,
}: {
  lineNumber: number | null;
  changes: DiffChange[];
  isOldSide: boolean;
}) {
  const hasRemovedChange = changes.some((change) => change.type === 'removed');
  const hasAddedChange = changes.some((change) => change.type === 'added');
  const hasUnchangedChange = changes.some((change) => change.type === 'unchanged');
  let lineChangeClass = 'diff-line-unchanged';

  if (changes.length === 0) {
    lineChangeClass = 'diff-line-empty';
  } else if (hasRemovedChange) {
    lineChangeClass = hasUnchangedChange ? 'diff-line-inline-removed' : 'diff-line-removed';
  } else if (hasAddedChange) {
    lineChangeClass = hasUnchangedChange ? 'diff-line-inline-added' : 'diff-line-added';
  }

  return (
    <div className={`diff-line ${isOldSide ? 'diff-line-old' : 'diff-line-new'} ${lineChangeClass}`}>
      <span className="diff-line-number" aria-hidden="true">{lineNumber ?? ''}</span>
      <code className="diff-line-content">
        {changes.length === 0
          ? '\u00a0'
          : changes.map((change, index) => (
              <DiffChangeSpan key={`${change.type}-${index}`} change={change} />
            ))}
      </code>
    </div>
  );
}

export default App;
