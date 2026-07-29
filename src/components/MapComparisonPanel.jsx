import { useMemo, useState } from 'react';
import { buildRoomVisualDiffs, getRoomDiffTone } from '../services/roomDiffService';
import './MapComparisonPanel.css';

function ComparisonCanvas({ image, rooms, diffByCode, label, faded = false }) {
  return (
    <figure className={`comparison-canvas ${faded ? 'faded' : ''}`}>
      <figcaption>{label}</figcaption>
      <div className="comparison-image-wrap">
        <img src={image} alt={label} />
        {rooms.map(room => {
          const diff = diffByCode.get(String(room.code || '').toUpperCase());
          const tone = diff ? getRoomDiffTone(diff) : 'unchanged';
          return (
            <span
              key={room.id}
              className={`comparison-marker ${tone} ${room.hidden ? 'hidden-room' : ''}`}
              style={{
                left: `${room.bounds.x}%`,
                top: `${room.bounds.y}%`,
                width: `${room.bounds.width}%`,
                height: `${room.bounds.height}%`
              }}
              title={`${room.code} ${diff?.flags.join('、') || ''}`}
            >{room.code}</span>
          );
        })}
      </div>
    </figure>
  );
}

function MapComparisonPanel({ open, baselineImage, image, baselineRooms = [], rooms = [], onClose }) {
  const [mode, setMode] = useState('overlay');
  const [opacity, setOpacity] = useState(50);
  const report = useMemo(() => buildRoomVisualDiffs(baselineRooms, rooms), [baselineRooms, rooms]);
  const diffByCode = useMemo(() => new Map(report.diffs.map(item => [item.code, item])), [report]);

  if (!open) return null;

  return (
    <div className="map-comparison-overlay" role="dialog" aria-modal="true" aria-labelledby="map-comparison-title">
      <div className="map-comparison-card glass-card">
        <header>
          <div>
            <h2 id="map-comparison-title">🌓 新舊配置圖比較</h2>
            <p>綠色新增、紅色遺失、橘色移動、紫色更名、藍色顯示狀態改變。</p>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </header>

        <div className="comparison-summary">
          <span className="added">新增 {report.summary.added}</span>
          <span className="missing">遺失 {report.summary.missing}</span>
          <span className="moved">移動 {report.summary.moved}</span>
          <span className="renamed">更名 {report.summary.renamed}</span>
          <span className="visibility">顯示變更 {report.summary.visibility}</span>
        </div>

        <div className="comparison-controls">
          <button className={mode === 'overlay' ? 'active' : ''} onClick={() => setMode('overlay')}>透明疊圖</button>
          <button className={mode === 'side' ? 'active' : ''} onClick={() => setMode('side')}>左右並排</button>
          {mode === 'overlay' && (
            <label>新圖透明度 {opacity}%
              <input type="range" min="0" max="100" value={opacity} onChange={event => setOpacity(Number(event.target.value))} />
            </label>
          )}
        </div>

        {mode === 'side' ? (
          <div className="comparison-side-by-side">
            <ComparisonCanvas image={baselineImage} rooms={baselineRooms} diffByCode={diffByCode} label="舊配置" />
            <ComparisonCanvas image={image} rooms={rooms} diffByCode={diffByCode} label="新配置" />
          </div>
        ) : (
          <div className="comparison-overlay-canvas">
            <img src={baselineImage} alt="舊配置底圖" />
            <img src={image} alt="新配置疊圖" style={{ opacity: opacity / 100 }} />
            {report.diffs.filter(item => item.after && !item.flags.includes('unchanged')).map(item => (
              <span
                key={item.code}
                className={`comparison-marker ${getRoomDiffTone(item)}`}
                style={{
                  left: `${item.after.bounds.x}%`, top: `${item.after.bounds.y}%`,
                  width: `${item.after.bounds.width}%`, height: `${item.after.bounds.height}%`
                }}
              >{item.code}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapComparisonPanel;
