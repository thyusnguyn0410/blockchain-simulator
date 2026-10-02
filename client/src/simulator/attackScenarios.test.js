import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPair, createSignedTransaction } from '../modules/crypto/ECDSA.js';
import { Blockchain } from '../modules/blockchain/coreBlockchain.js';
import {
  simulateTxTampering,
  simulateBlockTampering,
  simulateDoubleSpending,
  simulateFork
} from './attackScenarios.js';

describe('Blockchain Attack Scenarios Tests', () => {
  let keys;
  let validTx;

  beforeEach(() => {
    keys = generateKeyPair();
    validTx = createSignedTransaction(keys.privateKey, {
      from: "Vi_Cua_Toi",
      to: "Vi_Cua_Ban",
      amount: 10,
      nonce: 1
    });
  });

  describe('Scenario 1: Transaction Tampering', () => {
    it('simulateTxTampering runs without throwing error', () => {
      expect(() => simulateTxTampering(validTx)).not.toThrow();
    });

    it('valid transaction has signature and publicKey', () => {
      expect(validTx.signature).toBeDefined();
      expect(validTx.publicKey).toBeDefined();
      expect(validTx.amount).toBe(10);
    });
  });

  describe('Scenario 2: Block Tampering', () => {
  it('blockchain reports INVALID after block is tampered', () => {
    const chain = new Blockchain({ difficulty: 0 });
    chain.addBlock([validTx]);
    chain.addBlock([{ from: "A", to: "B", amount: 5 }]);

    expect(chain.isChainValid()).toBe(true);

    // Dùng method tamper() của Blockchain class
    // Method này cập nhật merkleRoot nhưng không cập nhật hash
    // → hash cũ không khớp với calculateHash() mới
    chain.tamper(1, [{ from: "Hacker", to: "Hacker", amount: 1000000 }]);

    expect(chain.isChainValid()).toBe(false);
  });
});

  describe('Scenario 3: Double Spending', () => {
    it('simulateDoubleSpending runs without throwing error', () => {
      expect(() => simulateDoubleSpending(keys.privateKey)).not.toThrow();
    });
  });

  describe('Scenario 4: Fork', () => {
    it('simulateFork runs without throwing error', () => {
      expect(() => simulateFork()).not.toThrow();
    });
  });
});