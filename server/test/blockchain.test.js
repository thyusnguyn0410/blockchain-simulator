const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Blockchain, stableStringify, isValidChain, mineBlock } = require('../src/blockchain');

function signedTransaction(privateKey, publicKey, fields) {
  const body = { ...fields, publicKey };
  body.signature = crypto.sign('sha256', Buffer.from(stableStringify(fields)), privateKey).toString('hex');
  return body;
}

test('genesis, proof of work and downstream links validate; tampering is detected', () => {
  const chain = new Blockchain({ difficulty: 1 });
  const first = chain.mineNewBlock([{ info: 'first demo block' }]);
  const second = chain.mineNewBlock([{ info: 'second demo block' }]);
  assert.equal(first.index, 1);
  assert.equal(second.previousHash, first.hash);
  assert.ok(isValidChain(chain.chain));
  chain.chain[1].transactions[0].amount = 100;
  assert.equal(isValidChain(chain.chain), false);
});

test('mempool requires a valid signature, nonce and available balance', () => {
  const { privateKey, publicKey: publicDer } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const publicKey = publicDer.export({ type: 'spki', format: 'der' }).subarray(-65).toString('hex');
  const { getAddress } = require('../src/blockchain');
  const from = getAddress(publicKey);
  const chain = new Blockchain();
  chain.fundDemoAddress(from, 10);

  const fields = { from, to: 'b'.repeat(40), amount: 4, nonce: 0 };
  const tx = signedTransaction(privateKey, publicKey, fields);
  assert.equal(chain.addToMempool(tx).from, from);
  assert.throws(() => chain.addToMempool(tx), /Giao dịch trùng lặp/);
  const overspend = signedTransaction(privateKey, publicKey, { ...fields, nonce: 1, amount: 7 });
  assert.throws(() => chain.addToMempool(overspend), /Số dư không đủ/);
  assert.throws(() => chain.addToMempool({ ...tx, nonce: 1, amount: 1, signature: '00' }), /Chữ ký ECDSA/);
  const block = chain.mineNewBlock();
  assert.ok(block);
  assert.equal(block.transactions[0].type, 'FAUCET');
  assert.equal(chain.getBalance(from), 6);
  assert.ok(isValidChain(chain.chain));
});

test('cumulative work favors a more difficult branch over a longer easy branch', () => {
  const local = new Blockchain({ difficulty: 1 });
  for (let i = 0; i < 4; i += 1) local.mineNewBlock([{ info: `local-${i}` }]);
  const candidate = [local.chain[0]];
  for (let i = 0; i < 2; i += 1) {
    candidate.push(mineBlock(i + 1, candidate[i].hash, [{ info: `remote-${i}` }], 2));
  }
  assert.equal(local.replaceChain(candidate), true);
  assert.equal(local.getLatestBlock().index, 2);
});
