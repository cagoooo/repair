import { useEffect, useState } from 'react';
import {
  listMapConfigVersions,
  restoreMapConfigVersion
} from '../services/mapConfigService';
import './MapVersionHistory.css';

function formatDate(value) {
  if (!value) return '時間未記錄';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-TW');
}

function MapVersionHistory({ db, open, currentRevision, actorEmail, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !db) return;
    let cancelled = false;
    setIsLoading(true);
    setError('');
    listMapConfigVersions(db)
      .then(items => { if (!cancelled) setVersions(items); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [db, open]);

  if (!open) return null;

  const handleRestore = async version => {
    const label = version.academicYear || `版本 ${version.sourceRevision || version.id}`;
    if (!confirm(`確定要復原到「${label}」嗎？目前配置會先自動備份，因此之後仍可還原。`)) return;

    setRestoringId(version.id);
    setError('');
    try {
      await restoreMapConfigVersion(db, version, { actorEmail });
      onRestored?.();
    } catch (err) {
      setError('復原失敗：' + err.message);
    } finally {
      setRestoringId('');
    }
  };

  return (
    <div className="map-version-overlay" role="dialog" aria-modal="true" aria-labelledby="map-version-title">
      <div className="map-version-card glass-card">
        <div className="map-version-header">
          <div>
            <h2 id="map-version-title">🕘 教室配置歷史版本</h2>
            <p>目前版本：{currentRevision || '舊版'}。復原前仍會自動備份現在的配置。</p>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </div>

        {error && <div className="map-version-error">⚠️ {error}</div>}
        {isLoading ? (
          <div className="map-version-empty">讀取歷史版本中…</div>
        ) : versions.length === 0 ? (
          <div className="map-version-empty">尚無歷史版本；第一次儲存新配置後會自動建立。</div>
        ) : (
          <div className="map-version-list">
            {versions.map(version => (
              <article className="map-version-item" key={version.id}>
                <div>
                  <strong>{version.academicYear || `配置版本 ${version.sourceRevision || '舊版'}`}</strong>
                  <span>{formatDate(version.archivedAtIso)}</span>
                  <small>
                    {version.rooms?.length || 0} 間教室 · {version.archiveReason || '自動備份'}
                  </small>
                </div>
                <button
                  className="btn btn-primary"
                  disabled={Boolean(restoringId)}
                  onClick={() => handleRestore(version)}
                >
                  {restoringId === version.id ? '復原中…' : '復原此版本'}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapVersionHistory;
