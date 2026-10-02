import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  calculateSHA256,
  checkAvalancheEffect,
} from './SHA-256.js';
import {
  canonicalize,
  createSignedTransaction,
  generateKeyPair,
  getAddressFromPublicKey,
  getPublicKeyFromPrivate,
  verifySignature,
} from './ECDSA.js';
import {
  getMerkleProof,
  getMerkleRoot,
  verifyMerkleProof,
} from './MerkleTree.js';

test('SHA-256 returns the expected 64-character hexadecimal digest', () => {
  const hash = calculateSHA256('abc');

  assert.equal(hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('avalanche comparison counts changed bits in the 256-bit digest', () => {
  const result = checkAvalancheEffect('Hello, blockchain', 'hello, blockchain');

  assert.equal(result.differentBits > 0, true);
  assert.equal(result.differentBits <= 256, true);
  assert.equal(result.percentageChange, `${((result.differentBits / 256) * 100).toFixed(2)}%`);
  assert.equal(checkAvalancheEffect('same', 'same').differentBits, 0);
});

test('ECDSA transaction signature validates and fails after signed data is edited', () => {
  const keyPair = generateKeyPair();
  const transaction = createSignedTransaction(keyPair.privateKey, {
    to: 'b'.repeat(40),
    amount: 2.5,
    nonce: 0,
  });
  const signedFields = {
    from: transaction.from,
    to: transaction.to,
    amount: transaction.amount,
    nonce: transaction.nonce,
  };

  assert.equal(transaction.from, getAddressFromPublicKey(keyPair.publicKey));
  assert.equal(transaction.publicKey, keyPair.publicKey);
  assert.equal(verifySignature(keyPair.publicKey, canonicalize(signedFields), transaction.signature), true);
  assert.equal(verifySignature(keyPair.publicKey, canonicalize({ ...signedFields, amount: 25 }), transaction.signature), false);
  assert.equal(getPublicKeyFromPrivate('f'.repeat(64)), null);
});

test('Merkle proof verifies the selected transaction and rejects altered content', () => {
  const transactions = ['tx-a', 'tx-b', 'tx-c', 'tx-d', 'tx-e'];
  const root = getMerkleRoot(transactions);
  const proof = getMerkleProof(transactions, 4);

  assert.equal(verifyMerkleProof(transactions[4], proof, root), true);
  assert.equal(verifyMerkleProof('tx-edited', proof, root), false);
  assert.equal(proof.length, 3);
});