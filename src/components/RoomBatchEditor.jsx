import { useMemo, useState } from 'react';
import { applyRoomBatchChanges } from '../services/roomBatchService';
import './RoomBatchEditor.css';

function RoomBatchEditor({ open, rooms, selectedIds, onApply, onClose }) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [category, setCategory] = useState('keep');
  const [visibility, setVisibility] = useState('keep');
  const preview = useMemo(() => applyRoomBatchChanges(rooms, selectedIds, {
    findText, replaceText, category, visibility
  }), [rooms, selectedIds, findText, replaceText, category, visibility]);

  if (!open) return null;

  return (
    <div className="batch-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="batch-editor-title">
      <div className="batch-editor-card glass-card">
        <header>
          <div><h2 id="batch-editor-title">🧰 批次編輯教室</h2><p>已選取 {selectedIds.length} 間；正式套用前會顯示實際變更數。</p></div>
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </header>
        <div className="batch-editor-grid">
          <label>尋找名稱文字<input className="form-input" value={findText} onChange={event => setFindText(event.target.value)} placeholder="例如：一年" /></label>
          <label>取代為<input className="form-input" value={replaceText} onChange={event => setReplaceText(event.target.value)} placeholder="例如：二年" /></label>
          <label>教室類別<select className="form-select" value={category} onChange={event => setCategory(event.target.value)}>
            <option value="keep">保持不變</option><option value="classroom">班級教室</option><option value="office">辦公室</option><option value="special">專科教室</option><option value="utility">公共設施</option><option value="other">其他</option>
          </select></label>
          <label>地圖顯示<select className="form-select" value={visibility} onChange={event => setVisibility(event.target.value)}>
            <option value="keep">保持不變</option><option value="show">顯示</option><option value="hide">暫不顯示</option>
          </select></label>
        </div>
        <div className="batch-preview">預計修改 <strong>{preview.affectedCount}</strong> 間教室。套用後可使用「復原批次修改」。</div>
        <footer>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" disabled={preview.affectedCount === 0} onClick={() => onApply(preview.rooms, preview.affectedCount)}>套用批次修改</button>
        </footer>
      </div>
    </div>
  );
}

export default RoomBatchEditor;
