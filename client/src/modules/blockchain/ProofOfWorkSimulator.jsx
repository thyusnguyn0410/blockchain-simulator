import { useState, useEffect, useRef } from 'react';
import { Block } from './coreBlockchain.js';
import { mineBlockAsync } from './pow.js';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function ProofOfWorkSimulator() {
  const [blockData, setBlockData] = useState('Khối đề xuất');
  const [difficulty, setDifficulty] = useState(4);
  const [isMining, setIsMining] = useState(false);
  const [isFound, setIsFound] = useState(false);

  const [nonce, setNonce] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hashRate, setHashRate] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentHash, setCurrentHash] = useState('0'.repeat(64));
  const [foundInfo, setFoundInfo] = useState(null);

  const minerRef = useRef(null);

  const expectedAttempts = Math.pow(16, difficulty);
  const targetPrefix = '0'.repeat(difficulty);

  const formatNum = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  const handleStartMining = () => {
    if (minerRef.current) minerRef.current.cancel();
    setIsMining(true);
    setIsFound(false);
    setFoundInfo(null);
    setNonce(0);
    setAttempts(0);
    setElapsedTime(0);
    setCurrentHash('0'.repeat(64));
    startMinerProcess(0, 0, 0);
  };

  const handleResumeMining = () => {
    if (isMining || isFound) return;
    setIsMining(true);
    startMinerProcess(nonce, attempts, elapsedTime);
  };

  const startMinerProcess = (initialNonce, initialAttempts, initialTime) => {
    const prevHash = '0'.repeat(64);
    const block = new Block(1, prevHash, [blockData], undefined, difficulty);
    block.nonce = initialNonce;

    const startTime = Date.now() - initialTime * 1000;

    minerRef.current = mineBlockAsync(
      block,
      difficulty,
      {
        onProgress: (state) => {
          setNonce(state.nonce);
          setAttempts(initialAttempts + state.attempts);
          setHashRate(state.hashrate);
          setElapsedTime((Date.now() - startTime) / 1000);
          setCurrentHash(state.hash);
        },
        onDone: (state) => {
          setNonce(state.nonce);
          setAttempts(initialAttempts + state.attempts);
          setHashRate(state.hashrate);
          const finalSecs = (Date.now() - startTime) / 1000;
          setElapsedTime(finalSecs);
          setCurrentHash(state.hash);
          setIsMining(false);
          setIsFound(true);
          setFoundInfo({
            nonce: state.nonce,
            attempts: initialAttempts + state.attempts,
            time: finalSecs.toFixed(2),
          });
          minerRef.current = null;
        },
      },
      28
    );
  };

  const handleStopMining = () => {
    if (minerRef.current) {
      minerRef.current.cancel();
      minerRef.current = null;
    }
    setIsMining(false);
  };

  useEffect(() => {
    return () => {
      if (minerRef.current) minerRef.current.cancel();
    };
  }, []);

  const currentProgressPct = isFound
    ? 100
    : Math.min(100, (attempts / expectedAttempts) * 100);

  const difficultyTable = [
    { diff: 1, sample: '0...', expected: 16, time: '< 1 giây' },
    { diff: 2, sample: '00...', expected: 256, time: '< 1 giây' },
    { diff: 3, sample: '000...', expected: 4096, time: '< 1 giây' },
    { diff: 4, sample: '0000...', expected: 65536, time: '< 1 giây' },
    { diff: 5, sample: '00000...', expected: 1048576, time: '5.2 giây' },
    { diff: 6, sample: '000000...', expected: 16777216, time: '1.4 phút' },
  ];

  return (
    <div className="pow-container">
      <div className="pow-grid-main">
        {/* CARD 1: XƯỞNG ĐÀO KHỐI */}
        <div className="pow-card">
          <div className="pow-card-header">
            <span>⛏</span>
            <h2>Xưởng đào khối</h2>
          </div>

          <div className="pow-field">
            <label className="pow-label">Dữ liệu khối</label>
            <input
              type="text"
              className="pow-input"
              value={blockData}
              onChange={(e) => {
                setBlockData(e.target.value);
                setNonce(0);
                setAttempts(0);
                setIsFound(false);
              }}
              disabled={isMining}
            />
          </div>

          <div className="pow-slider-wrap">
            <div className="pow-slider-labels">
              <span className="pow-label">
                Độ khó — <strong className="pow-accent">{difficulty} số 0 dẫn đầu</strong>
              </span>
              <span className="pow-muted">Kỳ vọng ~{formatNum(expectedAttempts)} phép thử</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(Number(e.target.value));
                setNonce(0);
                setAttempts(0);
                setIsFound(false);
              }}
              disabled={isMining}
              className="pow-slider"
            />
          </div>

          <div className="pow-actions">
            {!isMining && nonce > 0 && !isFound ? (
              <button className="pow-btn pow-btn-resume" onClick={handleResumeMining}>
                ▶ Tiếp tục đào
              </button>
            ) : (
              <button
                className="pow-btn pow-btn-start"
                onClick={handleStartMining}
                disabled={isMining}
              >
                ▶ Bắt đầu đào
              </button>
            )}

            {nonce > 0 && !isMining && !isFound && (
              <button className="pow-btn pow-btn-restart" onClick={handleStartMining}>
                🔄 Đào lại
              </button>
            )}

            <button
              className="pow-btn pow-btn-stop"
              onClick={handleStopMining}
              disabled={!isMining}
            >
              ⏸ Tạm dừng
            </button>
          </div>

          <div className="pow-progress">
            <div
              className="pow-progress-bar"
              style={{
                width: `${currentProgressPct}%`,
                background: isFound ? 'var(--accent-green)' : 'var(--accent-orange)',
                transition: isFound ? 'width 0.3s ease' : 'none',
              }}
              role="progressbar"
              aria-label="Tiến độ thử nonce"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(currentProgressPct)}
            />
          </div>

          <div className="pow-kpi-grid" aria-live="polite">
            <div className="pow-kpi">
              <div className="pow-kpi-value pow-accent">{formatNum(nonce)}</div>
              <div className="pow-kpi-label">nonce hiện tại</div>
            </div>
            <div className="pow-kpi">
              <div className="pow-kpi-value">{formatNum(attempts)}</div>
              <div className="pow-kpi-label">lần thử</div>
            </div>
            <div className="pow-kpi">
              <div className="pow-kpi-value">{formatNum(hashRate)}</div>
              <div className="pow-kpi-label">hash/giây</div>
            </div>
            <div className="pow-kpi">
              <div className="pow-kpi-value">{elapsedTime.toFixed(1)}s</div>
              <div className="pow-kpi-label">thời gian</div>
            </div>
          </div>
        </div>

        {/* CARD 2: MÃ BĂM ĐANG THỬ */}
        <div className="pow-card">
          <div className="pow-hash-header">
            <h3 className="pow-hash-title">Mã băm đang thử</h3>
            <span className="pow-target-badge">
              Mục tiêu: <strong>{targetPrefix}...</strong>
            </span>
          </div>

          <div className="pow-hash-display">
            {isFound ? (
              <>
                <span className="pow-hash-found">{currentHash.slice(0, difficulty)}</span>
                <span className="pow-hash-rest">{currentHash.slice(difficulty)}</span>
              </>
            ) : (
              <span className="pow-hash-pending">{currentHash}</span>
            )}
          </div>

          <div className="pow-rules-box">
            <strong>Luật chơi: </strong>
            Nội dung khối là bất biến, thứ duy nhất thợ đào được đổi là nonce. Họ tăng nonce và băm lại cho tới khi mã băm bắt đầu bằng đủ số chữ số 0.
          </div>

          {isFound && foundInfo && (
            <div className="pow-found-box">
              <span>✅</span>
              <div>
                <strong>Tìm thấy! </strong>
                nonce = <code>{formatNum(foundInfo.nonce)}</code> sau{' '}
                <code>{formatNum(foundInfo.attempts)}</code> lần thử ({foundInfo.time} giây).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BẢNG SO SÁNH ĐỘ KHÓ */}
      <div className="pow-table-card">
        <h3 className="pow-table-title">Vì sao độ khó lại quan trọng</h3>
        <p className="pow-chart-note">
          So sánh số hash kỳ vọng theo từng mức difficulty. Trục đứng dùng log₂ để thể hiện rõ mức tăng lũy thừa.
        </p>
        <div className="pow-difficulty-chart" role="img" aria-label="Biểu đồ số lần thử kỳ vọng theo độ khó">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={difficultyTable.map((row) => ({
                ...row,
                logAttempts: Math.log2(row.expected),
              }))}
              margin={{ top: 12, right: 12, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis dataKey="diff" tickFormatter={(value) => `D${value}`} stroke="var(--theme-text-muted)" />
              <YAxis
                domain={[0, 24]}
                tickFormatter={(value) => `2^${value}`}
                stroke="var(--theme-text-muted)"
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--theme-surface-solid)',
                  border: '1px solid var(--theme-border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--theme-text-strong)',
                }}
                formatter={(_value, _name, item) => [
                  `${formatNum(item.payload.expected)} lần thử`,
                  `Difficulty ${item.payload.diff}`,
                ]}
                labelFormatter={() => 'Số lần thử kỳ vọng'}
              />
              <Bar dataKey="logAttempts" radius={[6, 6, 0, 0]}>
                {difficultyTable.map((row) => (
                  <Cell
                    key={row.diff}
                    fill={row.diff === difficulty ? 'var(--accent-cyan)' : 'var(--accent-purple)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="pow-table-wrap">
          <table className="pow-table">
            <thead>
              <tr>
                <th>Độ khó</th>
                <th>Mẫu Hash cần tìm</th>
                <th>Số phép thử kỳ vọng</th>
                <th>Ở tốc độ 200.000 Hash/giây</th>
              </tr>
            </thead>
            <tbody>
              {difficultyTable.map((row) => (
                <tr key={row.diff} className={row.diff === difficulty ? 'active' : ''}>
                  <td><strong>{row.diff}</strong></td>
                  <td className="muted">{row.sample}</td>
                  <td>{formatNum(row.expected)}</td>
                  <td className="time">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
