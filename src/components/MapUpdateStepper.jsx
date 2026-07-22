import './MapUpdateStepper.css';

const STEPS = [
  ['term', '填寫學期'],
  ['imageUploaded', '上傳圖片'],
  ['ocrCompleted', '執行 OCR'],
  ['differencesReviewed', '確認差異'],
  ['calibrationConfirmed', '校正位置'],
  ['published', '正式發布'],
  ['postChecked', '發布後抽查']
];

function MapUpdateStepper({ academicYear = '', workflow = {}, compact = false }) {
  const status = { ...workflow, term: Boolean(academicYear.trim()) };
  const firstIncomplete = STEPS.findIndex(([key]) => !status[key]);

  return (
    <section className={`map-update-stepper ${compact ? 'compact' : ''}`} aria-label="新學期換版進度">
      <div className="map-update-stepper-title">
        <strong>🧭 新學期換版精靈</strong>
        <span>{workflow.updateMode ? '換版進行中' : '依序完成後再正式發布'}</span>
      </div>
      <ol>
        {STEPS.map(([key, label], index) => {
          const complete = Boolean(status[key]);
          const active = index === firstIncomplete;
          return (
            <li key={key} className={`${complete ? 'complete' : ''} ${active ? 'active' : ''}`}>
              <span className="step-number">{complete ? '✓' : index + 1}</span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default MapUpdateStepper;
