import React, { useState, useEffect, useRef } from 'react';
import { Block } from './coreBlockchain.js';
import { mineBlockAsync } from './pow.js';

export default function ProofOfWorkSimulator() {
  const [blockData, setBlockData] = useState('Khối đề xuất');
  const [difficulty, setDifficulty] = useState(4);
  const [isMining, setIsMining] = useState(false);
  const [isFound, setIsFound] = useState(false);

  // Lưu trạng thái Nonce và Lần thử để tiếp tục khi Resume
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

  // Đào mới hoàn toàn (Reset về 0)
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

  // Tiếp tục đào từ Nonce hiện tại
  const handleResumeMining = () => {
    if (isMining || isFound) return;
    setIsMining(true);
    startMinerProcess(nonce, attempts, elapsedTime);
  };

  // Hàm chạy bộ đào (Dùng chung cho Start & Resume)
  const startMinerProcess = (initialNonce, initialAttempts, initialTime) => {
    const prevHash = '0'.repeat(64);
    const block = new Block(1, prevHash, [blockData], undefined, difficulty);
    
    // Gán nonce bắt đầu cho khối
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

  // Tạm dừng đào
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

  // Tính % tiến trình chuẩn xác không trễ lag
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1115', color: '#e5e7eb', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', alignItems: 'start' }}>
          
          {/* CARD 1: XƯỞNG ĐÀO KHỐI */}
          <div style={{ backgroundColor: '#161920', border: '1px solid #27272a', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb', fontWeight: '600', fontSize: '18px' }}>
              <span>⛏</span>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Xưởng đào khối</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dữ liệu khối
              </label>
              <input
                type="text"
                value={blockData}
                onChange={(e) => {
                  setBlockData(e.target.value);
                  setNonce(0);
                  setAttempts(0);
                  setIsFound(false);
                }}
                disabled={isMining}
                style={{ width: '100%', backgroundColor: '#0d0e12', border: '1px solid #3f3f46', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#f3f4f6', outline: 'none', boxSizing: 'border-box', opacity: isMining ? 0.5 : 1 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>
                  Độ khó — <span style={{ color: '#f59e0b', fontWeight: '700' }}>{difficulty} số 0 dẫn đầu</span>
                </span>
                <span style={{ color: '#9ca3af' }}>Kỳ vọng ~{formatNum(expectedAttempts)} phép thử</span>
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
                style={{ width: '100%', cursor: 'pointer', accentColor: '#f59e0b', opacity: isMining ? 0.5 : 1 }}
              />
            </div>

            {/* BỘ NÚT ĐIỀU KHIỂN: TẠM DỪNG / TIẾP TỤC / ĐÀO LAI */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Nếu đang tạm dừng và đã có nonce > 0 */}
              {!isMining && nonce > 0 && !isFound ? (
                <button
                  onClick={handleResumeMining}
                  style={{ flex: 1, backgroundColor: '#059669', color: '#ffffff', fontWeight: '600', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <span>▶</span> Tiếp tục đào
                </button>
              ) : (
                <button
                  onClick={handleStartMining}
                  disabled={isMining}
                  style={{ flex: 1, backgroundColor: isMining ? '#3f3f46' : '#d97706', color: '#ffffff', fontWeight: '600', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: isMining ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <span>▶</span> Bắt đầu đào
                </button>
              )}

              {/* Nút đào lại từ đầu khi đang tạm dừng */}
              {nonce > 0 && !isMining && !isFound && (
                <button
                  onClick={handleStartMining}
                  style={{ backgroundColor: '#3f3f46', color: '#e5e7eb', fontWeight: '600', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                >
                  🔄 Đào lại
                </button>
              )}

              <button
                onClick={handleStopMining}
                disabled={!isMining}
                style={{ backgroundColor: !isMining ? '#18181b' : 'rgba(127, 29, 29, 0.4)', color: !isMining ? '#52525b' : '#f87171', border: `1px solid ${!isMining ? '#27272a' : 'rgba(153, 27, 27, 0.5)'}`, fontWeight: '600', padding: '10px 16px', borderRadius: '8px', cursor: !isMining ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <span>⏸</span> Tạm dừng
              </button>
            </div>

            {/* THANH TIẾN TRÌNH (ĐÃ SỬA LỖI TRỄ LAG) */}
            <div style={{ width: '100%', backgroundColor: '#27272a', height: '10px', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${currentProgressPct}%`,
                  backgroundColor: isFound ? '#10b981' : '#f59e0b',
                  // Bỏ transition kéo dài khi đào để thanh tiến trình nhảy theo thời gian thực
                  transition: isFound ? 'width 0.3s ease' : 'none'
                }}
              />
            </div>

            {/* THÔNG SỐ KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', paddingTop: '8px', borderTop: '1px solid #27272a', textAlign: 'center' }}>
              <div style={{ backgroundColor: '#0f1116', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatNum(nonce)}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>nonce hiện tại</div>
              </div>
              <div style={{ backgroundColor: '#0f1116', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#e5e7eb', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatNum(attempts)}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>lần thử</div>
              </div>
              <div style={{ backgroundColor: '#0f1116', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#e5e7eb', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatNum(hashRate)}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>hash/giây</div>
              </div>
              <div style={{ backgroundColor: '#0f1116', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#e5e7eb', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{elapsedTime.toFixed(1)}s</div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>thời gian</div>
              </div>
            </div>
          </div>

          {/* CARD 2: MÃ BĂM ĐANG THỬ */}
          <div style={{ backgroundColor: '#161920', border: '1px solid #27272a', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: '600', color: '#e5e7eb', fontSize: '16px' }}>Mã băm đang thử</h3>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#27272a', color: '#d1d5db', padding: '4px 10px', borderRadius: '4px', border: '1px solid #3f3f46' }}>
                Mục tiêu: <span style={{ color: '#f59e0b' }}>{targetPrefix}...</span>
              </span>
            </div>

            <div style={{ backgroundColor: '#0b0c0e', padding: '14px', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', overflowWrap: 'anywhere', lineHeight: '1.6', minHeight: '72px' }}>
              {isFound ? (
                <>
                  <span style={{ color: '#34d399', fontWeight: '700' }}>{currentHash.slice(0, difficulty)}</span>
                  <span style={{ color: '#a7f3d0' }}>{currentHash.slice(difficulty)}</span>
                </>
              ) : (
                <span style={{ color: '#fbbf24' }}>{currentHash}</span>
              )}
            </div>

            <div style={{ backgroundColor: 'rgba(120, 53, 15, 0.2)', borderLeft: '3px solid #d97706', padding: '12px', borderRadius: '0 8px 8px 0', fontSize: '12px', color: '#fde68a', lineHeight: '1.6' }}>
              <span style={{ fontWeight: '600', color: '#fbbf24' }}>Luật chơi: </span>
              Nội dung khối là bất biến, thứ duy nhất thợ đào được đổi là nonce. Họ tăng nonce và băm lại cho tới khi mã băm bắt đầu bằng đủ số chữ số 0.
            </div>

            {isFound && foundInfo && (
              <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.3)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#6ee7b7', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span>✅</span>
                <div>
                  <span style={{ fontWeight: '700' }}>Tìm thấy! </span>
                  nonce = <span style={{ fontFamily: 'monospace', color: '#ffffff' }}>{formatNum(foundInfo.nonce)}</span> sau{' '}
                  <span style={{ fontFamily: 'monospace', color: '#ffffff' }}>{formatNum(foundInfo.attempts)}</span> lần thử ({foundInfo.time} giây).
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BẢNG SO SÁNH ĐỘ KHÓ */}
        <div style={{ backgroundColor: '#161920', border: '1px solid #27272a', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontWeight: '600', color: '#e5e7eb', fontSize: '16px' }}>
            Vì sao độ khó lại quan trọng
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>Độ khó</th>
                  <th style={{ padding: '10px 12px' }}>Mẫu Hash cần tìm</th>
                  <th style={{ padding: '10px 12px' }}>Số phép thử kỳ vọng</th>
                  <th style={{ padding: '10px 12px' }}>Ở tốc độ 200.000 Hash/giây</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'monospace', color: '#d1d5db' }}>
                {difficultyTable.map((row) => (
                  <tr
                    key={row.diff}
                    style={{
                      borderBottom: '1px solid #1f2937',
                      backgroundColor: row.diff === difficulty ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                      color: row.diff === difficulty ? '#fcd34d' : '#d1d5db'
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>{row.diff}</td>
                    <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{row.sample}</td>
                    <td style={{ padding: '10px 12px' }}>{formatNum(row.expected)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'sans-serif' }}>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}