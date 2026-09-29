import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Blockchain,
  ZERO_HASH,
  calculateBlockHash,
  createGenesisBlock,
  getMerkleProof,
  getMerkleRoot,
  validateChain,
  verifyMerkleProof,
} from './coreBlockchain.js';

test('genesis hash is deterministic and satisfies its proof of work', () => {
  const genesis = createGenesisBlock();

  assert.equal(genesis.index, 0);
  assert.equal(genesis.previousHash, ZERO_HASH);
  assert.equal(genesis.hash.length, 64);
  assert.equal(genesis.hash, calculateBlockHash(genesis));
  assert.equal(genesis.hash.startsWith('0'), true);
  assert.equal(validateChain([genesis]), true);
});

test('new blocks link to previous hashes and form a valid chain', () => {
  const chain = new Blockchain({ difficulty: 1 });
  const first = chain.addBlock([{ sender: 'Alice', recipient: 'Bob', amount: 5 }]);
  const second = chain.addBlock([{ sender: 'Bob', recipient: 'Carol', amount: 2 }]);

  assert.equal(chain.length, 3);
  assert.equal(chain.head.index, 0);
  assert.equal(chain.tail, second);
  assert.equal(chain.head.next, first);
  assert.equal(first.previousHash, chain.head.hash);
  assert.equal(second.previousHash, first.hash);
  assert.equal(first.hash.startsWith('0'), true);
  assert.equal(chain.isChainValid(), true);
});

test('tampering invalidates the chain and recomputation restores its hashes', () => {
  const chain = new Blockchain({ difficulty: 1 });
  chain.addBlock([{ sender: 'Alice', recipient: 'Bob', amount: 5 }]);
  chain.addBlock([{ sender: 'Bob', recipient: 'Carol', amount: 2 }]);

  chain.tamper(1, [{ sender: 'Mallory', recipient: 'Mallory', amount: 500 }]);
  assert.equal(chain.isChainValid(), false);
  assert.equal(chain.validateDetailed()[1].valid, false);

  assert.ok(chain.recomputeFrom(1) > 0);
  assert.equal(chain.isChainValid(), true);
  assert.equal(chain.validateDetailed().every((result) => result.valid), true);
});

test('Merkle proofs support odd leaf counts and reject edited transactions', () => {
  const transactions = ['tx-a', 'tx-b', 'tx-c', 'tx-d', 'tx-e'];
  const root = getMerkleRoot(transactions);

  transactions.forEach((transaction, index) => {
    const proof = getMerkleProof(transactions, index);
    assert.ok(proof.length <= Math.ceil(Math.log2(transactions.length)));
    assert.equal(verifyMerkleProof(transaction, proof, root), true);
  });

  assert.equal(verifyMerkleProof('edited', getMerkleProof(transactions, 0), root), false);
  assert.deepEqual(getMerkleProof(transactions, transactions.length), []);
});

test('cloning preserves hashes while isolating later mutations', () => {
  const original = new Blockchain({ difficulty: 1 });
  original.addBlock([{ sender: 'Alice', recipient: 'Bob', amount: 5 }]);
  const clone = original.clone();

  assert.equal(clone.isChainValid(), true);
  assert.notEqual(clone.toArray(), original.toArray());
  assert.equal(clone.head.next, clone.tail);

  clone.tamper(1, [{ sender: 'Mallory', recipient: 'Mallory', amount: 99 }]);
  assert.equal(original.isChainValid(), true);
  assert.equal(clone.isChainValid(), false);
});
