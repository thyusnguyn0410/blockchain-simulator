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

  const runScenario = (scenario) => {
    try {
      scenario.run();
      setResults((current) => ({
        ...current,
        [scenario.id]: { ok: true, message: scenario.result },
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
        return (
          <article className="attack-card" key={scenario.id}>
            <div className="attack-card-heading">
              <span className="attack-icon" aria-hidden="true">⚠</span>
              <h3>{scenario.title}</h3>
            </div>
            <p>{scenario.description}</p>
            <button
              type="button"
              className="ui-button outline-button"
              onClick={() => runScenario(scenario)}
            >
              Chạy kịch bản
            </button>
            {result && (
              <p
                className={`attack-result ${result.ok ? "success" : "error"}`}
                role={result.ok ? "status" : "alert"}
              >
                <span aria-hidden="true">{result.ok ? "✓" : "!"}</span> {result.message}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
