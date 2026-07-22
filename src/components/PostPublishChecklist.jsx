import { useState } from 'react';
import './MapPublishReview.css';

const CHECKS = [
  '地圖主畫面可以正常載入',
  '抽查 C112、W301、C640 等代表教室',
  '點擊教室可以開啟報修入口',
  '列表中的教室可以返回地圖定位',
  '歷史版本中已出現發布前的舊配置備份'
];

function PostPublishChecklist({ open, academicYear, onComplete }) {
  const [checked, setChecked] = useState([]);
  if (!open) return null;

  const toggle = index => setChecked(items => items.includes(index)
    ? items.filter(item => item !== index)
    : [...items, index]);

  return (
    <div className="publish-review-overlay" role="dialog" aria-modal="true">
      <div className="publish-review-card glass-card">
        <header><div><h2>✅ 發布後抽查</h2><p>{academicYear || '新學期配置'}已發布，請完成最後確認。</p></div></header>
        <div className="publish-review-issues">
          {CHECKS.map((label, index) => (
            <label className="publish-issue warning" key={label}>
              <input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} />
              <strong>{label}</strong>
            </label>
          ))}
        </div>
        <footer>
          <span>{checked.length} / {CHECKS.length} 項完成</span>
          <button className="btn btn-primary" disabled={checked.length !== CHECKS.length} onClick={onComplete}>
            完成換版流程
          </button>
        </footer>
      </div>
    </div>
  );
}

export default PostPublishChecklist;
