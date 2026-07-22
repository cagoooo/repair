import './MapPublishReview.css';

function MapPublishReview({ report, acknowledgedWarnings, onToggleWarning, onClose, onPublish, onDownload, publishing }) {
  if (!report) return null;
  const warningSet = new Set(acknowledgedWarnings);

  return (
    <div className="publish-review-overlay" role="dialog" aria-modal="true" aria-labelledby="publish-review-title">
      <div className="publish-review-card glass-card">
        <header>
          <div>
            <h2 id="publish-review-title">🛡️ 發布前完整性檢查</h2>
            <p>{report.metrics.roomCount} 間教室 · {report.metrics.repairCount} 筆歷史報修</p>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </header>

        <div className="publish-review-summary">
          <span className="ok">✓ 通過 {Math.max(0, 8 - report.issues.length)} 項</span>
          <span className="warning">⚠ 警告 {report.warnings.length} 項</span>
          <span className="error">✕ 錯誤 {report.errors.length} 項</span>
        </div>

        {report.issues.length === 0 ? (
          <div className="publish-review-all-clear">✅ 所有安全檢查均已通過，可以正式發布。</div>
        ) : (
          <div className="publish-review-issues">
            {report.issues.map(item => (
              <article key={item.id} className={`publish-issue ${item.severity}`}>
                <div>
                  <strong>{item.severity === 'error' ? '✕' : '⚠'} {item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                {item.severity === 'warning' && (
                  <label>
                    <input
                      type="checkbox"
                      checked={warningSet.has(item.id)}
                      onChange={() => onToggleWarning(item.id)}
                    />
                    我已人工確認
                  </label>
                )}
              </article>
            ))}
          </div>
        )}

        <footer>
          <button className="btn btn-secondary" onClick={onDownload}>📄 下載演練報告（不發布）</button>
          <div>
            {!report.canPublish && <span>請先修正錯誤並確認所有警告</span>}
            <button className="btn btn-primary" disabled={!report.canPublish || publishing} onClick={onPublish}>
              {publishing ? '發布中…' : '🚀 正式發布並備份舊版本'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default MapPublishReview;
