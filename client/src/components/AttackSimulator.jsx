import { useState } from "react";
import {
  createSignedTransaction,
  generateKeyPair,
} from "../modules/crypto/ECDSA.js";
import { Block } from "../modules/blockchain/coreBlockchain.js";
import {
  simulateBlockTampering,
  simulateDoubleSpending,
  simulateFork,
  simulateTxTampering,
} from "../simulator/attackScenarios.js";

const scenarios = [
  {
    id: "transaction",
    title: "Sửa đổi giao dịch",
    description: "Thay đổi số tiền sau khi giao dịch đã được ký.",
    result: "Chữ ký không còn khớp với dữ liệu. Giao dịch bị phát hiện và từ chối.",
    run: () => {
      const { privateKey } = generateKeyPair();
      const transaction = createSignedTransaction(privateKey, {
        to: "Bob",
        amount: 2,
        nonce: 1,
      });
      simulateTxTampering(transaction);
    },
  },
  {
    id: "block",
    title: "Sửa đổi Block",
    description: "Thay giao dịch trong block sau khi hash đã được tạo.",
    result: "Merkle Root và hash thay đổi. Chuỗi không còn xác thực được.",
    run: () => {
      const block = new Block(1, "0".repeat(64), [{ from: "Alice", to: "Bob", amount: 1 }]);
      simulateBlockTampering(block);
    },
  },
  {
    id: "double-spend",
    title: "Double Spending",
    description: "Phát hai giao dịch cùng nonce để chi tiêu cùng số dư.",
    result: "Phát hiện xung đột nonce và từ chối giao dịch thứ hai.",
    run: () => simulateDoubleSpending(),
  },
  {
    id: "fork",
    title: "Fork",
    description: "So sánh hai nhánh chain cùng phát triển từ một điểm.",
    result: "Mạng chọn chain dài hơn và loại bỏ nhánh thua trong quá trình đồng thuận.",
    run: () => simulateFork(),
  },
];

export default function AttackSimulator() {
  const [results, setResults] = useState({});
  const [enabledScenarios, setEnabledScenarios] = useState(() => (
    Object.fromEntries(scenarios.map(({ id }) => [id, true]))
  ));

 const runScenario = (scenario) => {
  try {
    const runResult = scenario.run();
    const message = (runResult && typeof runResult === 'object' && runResult.message)
      ? runResult.message
      : scenario.result;
    
    setResults((current) => ({
      ...current,
      [scenario.id]: { 
        ok: true, 
        message, 
        data: runResult  // ← Lưu cả object dữ liệu
      },
    }));
  } catch (error) {
    setResults((current) => ({
      ...current,
      [scenario.id]: {
        ok: false,
        message: `Không thể chạy mô phỏng: ${error.message}`,
      },
    }));
  }
};

  return (
    <div className="attack-grid">
      {scenarios.map((scenario) => {
        const result = results[scenario.id];
        const enabled = enabledScenarios[scenario.id];
        return (
          <article className={`attack-card ${enabled ? '' : 'is-disabled'}`} key={scenario.id}>
            <div className="attack-card-top">
              <div className="attack-card-heading">
                <span className="attack-icon" aria-hidden="true">⚠</span>
                <h3>{scenario.title}</h3>
              </div>
              <button
                type="button"
                className="attack-toggle"
                aria-pressed={enabled}
                aria-label={`${enabled ? 'Tắt' : 'Bật'} kịch bản ${scenario.title}`}
                onClick={() => setEnabledScenarios((current) => ({
                  ...current,
                  [scenario.id]: !current[scenario.id],
                }))}
              >
                <span className={`attack-toggle-indicator ${enabled ? 'is-on' : ''}`} aria-hidden="true" />
                {enabled ? 'Đang bật' : 'Đang tắt'}
              </button>
            </div>
            <p>{scenario.description}</p>
            <button
              type="button"
              className="ui-button outline-button"
              onClick={() => runScenario(scenario)}
              disabled={!enabled}
            >
              Chạy kịch bản
            </button>
           {result && (
  <div
    className={`attack-result ${result.ok ? "success" : "error"}`}
    role={result.ok ? "status" : "alert"}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <span aria-hidden="true">{result.ok ? "✓" : "!"}</span>
      <strong>
        {scenario.id === "fork" ? "Kết quả Fork" : result.message}
      </strong>
    </div>

    {/* Hiển thị bảng cho kịch bản Fork */}
    {scenario.id === "fork" && result.data && (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        marginTop: '4px',
      }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#94a3b8' }}>Chain</th>
            <th style={{ textAlign: 'center', padding: '6px 8px', color: '#94a3b8' }}>Số block</th>
            <th style={{ textAlign: 'center', padding: '6px 8px', color: '#94a3b8' }}>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '6px 8px' }}>Chain gốc</td>
            <td style={{ textAlign: 'center', padding: '6px 8px' }}>{result.data.originalLength}</td>
            <td style={{ textAlign: 'center', padding: '6px 8px', color: '#94a3b8' }}>—</td>
          </tr>
          <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <td style={{ padding: '6px 8px' }}>
              Chain A {result.data.winner === "Chain A" && "🏆"}
            </td>
            <td style={{ textAlign: 'center', padding: '6px 8px' }}>{result.data.chainALength}</td>
            <td style={{
              textAlign: 'center',
              padding: '6px 8px',
              color: result.data.winner === "Chain A" ? '#22c55e' : '#ef4444',
              fontWeight: 'bold',
            }}>
              {result.data.winner === "Chain A" ? "Thắng" : "Bị loại"}
            </td>
          </tr>
          <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <td style={{ padding: '6px 8px' }}>
              Chain B {result.data.winner === "Chain B" && "🏆"}
            </td>
            <td style={{ textAlign: 'center', padding: '6px 8px' }}>{result.data.chainBLength}</td>
            <td style={{
              textAlign: 'center',
              padding: '6px 8px',
              color: result.data.winner === "Chain B" ? '#22c55e' : '#ef4444',
              fontWeight: 'bold',
            }}>
              {result.data.winner === "Chain B" ? "Thắng" : "Bị loại"}
            </td>
          </tr>
        </tbody>
      </table>
    )}

    {/* Hiển thị message cho các kịch bản khác */}
    {scenario.id !== "fork" && (
      <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
        {result.message}
      </p>
    )}
  </div>
)}
          </article>
        );
      })}
    </div>
  );
}
