import { useMemo, useState, type ChangeEvent } from 'react';
import {
  buildDiffRows,
  calculateTextDiff,
  formatDiffChangesForClipboard,
  type DiffChange,
  type DiffMode,
  type DiffRow,
} from './diff';

function App() {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [mode, setMode] = useState<DiffMode>('line');
  const [copyStatus, setCopyStatus] = useState('');

  const diff = useMemo(
    () => calculateTextDiff(oldText, newText, mode),
    [oldText, newText, mode],
  );
  const diffRows = useMemo(
    () => buildDiffRows(oldText, newText, mode),
    [oldText, newText, mode],
  );

  const handleOldTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setOldText(event.target.value);
    setCopyStatus('');
  };

  const handleNewTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setNewText(event.target.value);
    setCopyStatus('');
  };

  const handleSwapTexts = () => {
    setOldText(newText);
    setNewText(oldText);
    setCopyStatus('');
  };

  const handleClearTexts = () => {
    setOldText('');
    setNewText('');
    setCopyStatus('');
  };

  const handleCopyResult = () => {
    if (!navigator.clipboard) {
      setCopyStatus('Pano bu tarayıcıda kullanılamıyor.');
      return;
    }

    void navigator.clipboard
      .writeText(formatDiffChangesForClipboard(diff.changes))
      .then(() => setCopyStatus('Sonuç kopyalandı.'))
      .catch(() => setCopyStatus('Kopyalama başarısız. Tekrar deneyin.'));
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tarayıcı aracı</p>
          <h1>Metin farkı</h1>
          <p className="page-description">
            İki metni anında karşılaştırın. Hiçbir veri tarayıcıdan çıkmaz.
          </p>
        </div>
        <div className="header-mark" aria-hidden="true">
          <span>−</span>
          <span>+</span>
        </div>
      </header>

      <section className="editor-section" aria-labelledby="editor-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Girdi</p>
            <h2 id="editor-title">Metinlerinizi karşılaştırın</h2>
          </div>
          <div className="editor-actions">
            <button type="button" className="button button-secondary" onClick={handleSwapTexts}>
              Alanları değiştir
            </button>
            <button type="button" className="button button-secondary" onClick={handleClearTexts}>
              Temizle
            </button>
          </div>
        </div>

        <div className="editor-grid">
          <label className="editor-card" htmlFor="old-text">
            <span className="editor-label">
              <span>Eski metin</span>
              <span className="editor-label-hint">Orijinal</span>
            </span>
            <textarea
              id="old-text"
              value={oldText}
              onChange={handleOldTextChange}
              placeholder="Orijinal metni buraya yapıştırın..."
              spellCheck="false"
            />
          </label>
          <label className="editor-card" htmlFor="new-text">
            <span className="editor-label">
              <span>Yeni metin</span>
              <span className="editor-label-hint">Güncel</span>
            </span>
            <textarea
              id="new-text"
              value={newText}
              onChange={handleNewTextChange}
              placeholder="Güncel metni buraya yapıştırın..."
              spellCheck="false"
            />
          </label>
        </div>
      </section>

      <section className="result-section" aria-labelledby="result-title">
        <div className="section-heading result-heading">
          <div>
            <p className="eyebrow">Çıktı</p>
            <h2 id="result-title">Fark</h2>
          </div>
          <div className="result-actions">
            <div className="mode-switch" role="group" aria-label="Fark modu">
              <button
                type="button"
                className={`mode-button ${mode === 'line' ? 'mode-button-active' : ''}`}
                aria-pressed={mode === 'line'}
                onClick={() => setMode('line')}
              >
                Satır bazlı
              </button>
              <button
                type="button"
                className={`mode-button ${mode === 'word' ? 'mode-button-active' : ''}`}
                aria-pressed={mode === 'word'}
                onClick={() => setMode('word')}
              >
                Kelime bazlı
              </button>
            </div>
            <button type="button" className="button button-primary" onClick={handleCopyResult}>
              Sonucu kopyala
            </button>
          </div>
        </div>

        <div className="summary" aria-live="polite">
          <span className="summary-item summary-item-added">
            <span className="summary-dot" aria-hidden="true" />
            <strong>{diff.addedLines}</strong> eklenen satır
          </span>
          <span className="summary-item summary-item-removed">
            <span className="summary-dot" aria-hidden="true" />
            <strong>{diff.removedLines}</strong> silinen satır
          </span>
          {copyStatus && <span className="copy-status">{copyStatus}</span>}
        </div>

        <div className="diff-view" aria-live="polite">
          {diff.changes.length === 0 ? (
            <p className="empty-state">Farkı görmek için alanlardan birine yazmaya başlayın.</p>
          ) : (
            <div className="diff-table">
              <div className="diff-table-header">
                <div className="diff-table-heading diff-table-heading-old">
                  <span className="diff-table-heading-icon" aria-hidden="true">−</span>
                  <span>Eski metin</span>
                  <span className="diff-table-heading-count">{diff.removedLines} silinen</span>
                </div>
                <div className="diff-table-heading diff-table-heading-new">
                  <span className="diff-table-heading-icon" aria-hidden="true">＋</span>
                  <span>Yeni metin</span>
                  <span className="diff-table-heading-count">{diff.addedLines} eklenen</span>
                </div>
              </div>
              {diffRows.map((row, index) => (
                <DiffRowView key={`diff-row-${index}`} row={row} />
              ))}
            </div>
          )}
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
