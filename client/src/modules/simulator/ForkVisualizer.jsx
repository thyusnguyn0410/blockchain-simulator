import { useMemo, useState } from 'react';

export default function ForkVisualizer() {
  const [aDifficulty, setADifficulty] = useState(1);
  const [aLength, setALength] = useState(3);
  const [bDifficulty, setBDifficulty] = useState(2);
  const [bLength, setBLength] = useState(2);
  const aWork = useMemo(() => aLength * (16 ** aDifficulty), [aDifficulty, aLength]);
  const bWork = useMemo(() => bLength * (16 ** bDifficulty), [bDifficulty, bLength]);
  const winner = aWork === bWork ? 'Tie' : aWork > bWork ? 'Branch A' : 'Branch B';
  return <section className="glass-panel"><div className="panel-heading"><div><h2>Fork & đồng thuận</h2><p>Chọn nhánh có tổng cumulative work lớn nhất — không chỉ so chiều dài.</p></div><span className="tag tag-purple">CUMULATIVE WORK</span></div><div className="fork-tree"><div className="fork-genesis">GENESIS</div><div className="fork-branches"><div className={`fork-branch ${winner === 'Branch A' ? 'winner' : ''}`}><strong>Nhánh A</strong><div className="branch-blocks">{Array.from({ length: aLength }, (_, i) => <span key={i}>#{i + 1}<small>diff {aDifficulty}</small></span>)}</div><label className="field-label">Block <input type="range" min="1" max="5" value={aLength} onChange={(event) => setALength(Number(event.target.value))} /></label><label className="field-label">Độ khó <input type="range" min="1" max="3" value={aDifficulty} onChange={(event) => setADifficulty(Number(event.target.value))} /></label><div className="work-score">Work = {aWork.toLocaleString()}</div></div><div className={`fork-branch ${winner === 'Branch B' ? 'winner' : ''}`}><strong>Nhánh B</strong><div className="branch-blocks">{Array.from({ length: bLength }, (_, i) => <span key={i}>#{i + 1}<small>diff {bDifficulty}</small></span>)}</div><label className="field-label">Block <input type="range" min="1" max="5" value={bLength} onChange={(event) => setBLength(Number(event.target.value))} /></label><label className="field-label">Độ khó <input type="range" min="1" max="3" value={bDifficulty} onChange={(event) => setBDifficulty(Number(event.target.value))} /></label><div className="work-score">Work = {bWork.toLocaleString()}</div></div></div></div><p className="notice notice-ok">Nhánh được chọn: <strong>{winner}</strong>. Mô hình học tập dùng 16^difficulty làm work của mỗi block; node backend áp dụng quy tắc tương tự.</p></section>;
}
