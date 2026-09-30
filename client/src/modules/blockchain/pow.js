import { calculateSHA256 as sha256 } from "../crypto/SHA-256.js";

/**
 * 1. ĐÀO KHỐI ĐỒNG BỘ (Synchronous Mining)
 */
export function mineBlock(block, targetDifficulty) {
  const difficulty = targetDifficulty !== undefined ? targetDifficulty : (block.difficulty || 0);
  const target = "0".repeat(difficulty);
  const start = Date.now();
  let attempts = 0;

  block.difficulty = difficulty;

  if (difficulty <= 0) {
    block.hash = typeof block.calculateHash === 'function' 
      ? block.calculateHash() 
      : (typeof block.computeHash === 'function' ? block.computeHash() : sha256(JSON.stringify(block)));
    return {
      nonce: block.nonce || 0,
      hash: block.hash,
      attempts: 0,
      timeTakenSeconds: "0.000s"
    };
  }

  while (true) {
    attempts++;
    block.hash = typeof block.calculateHash === 'function' 
      ? block.calculateHash() 
      : (typeof block.computeHash === 'function' ? block.computeHash() : sha256(JSON.stringify(block)));

    if (block.hash.startsWith(target)) {
      break;
    }
    
    block.nonce = (block.nonce || 0) + 1;
  }

  const timeTaken = ((Date.now() - start) / 1000).toFixed(3);
  return {
    nonce: block.nonce,
    hash: block.hash,
    attempts,
    timeTakenSeconds: `${timeTaken}s`
  };
}

/**
 * 2. KIỂM TRA TÍNH HỢP LỆ CỦA BẰNG CHỨNG CÔNG VIỆC (PoW Verification)
 */
export function verifyProofOfWork(block, targetDifficulty) {
  const difficulty = targetDifficulty !== undefined ? targetDifficulty : (block.difficulty || 0);
  if (difficulty <= 0) return true;

  const target = "0".repeat(difficulty);
  
  const computedHash = typeof block.calculateHash === 'function' 
    ? block.calculateHash() 
    : (typeof block.computeHash === 'function' ? block.computeHash() : sha256(JSON.stringify(block)));

  const isHashValid = block.hash === computedHash;
  const meetsTarget = computedHash.startsWith(target);

  return isHashValid && meetsTarget;
}

/**
 * 3. ĐÀO KHỐI BẤT ĐỒNG BỘ (Async Mining - Không gây treo UI)
 */
export function mineBlockAsync(block, difficulty, cb = {}, sliceMs = 28) {
  const target = "0".repeat(difficulty);
  let cancelled = false;
  let attempts = 0;
  const startedAt = performance.now();
  const CHECK_EVERY = 512;

  block.difficulty = difficulty;
  
  // Lấy nonce hiện tại của block, nếu chưa có mới khởi tạo = 0
  block.nonce = typeof block.nonce === 'number' ? block.nonce : 0; 
  
  const getHash = () => typeof block.calculateHash === 'function' 
    ? block.calculateHash() 
    : (typeof block.computeHash === 'function' ? block.computeHash() : sha256(JSON.stringify(block)));

  block.hash = getHash();

  function getState(found) {
    const elapsed = (performance.now() - startedAt) / 1000;
    return {
      nonce: block.nonce,
      hash: block.hash,
      attempts,
      seconds: elapsed,
      hashrate: elapsed > 0 ? Math.round(attempts / elapsed) : 0,
      found: !!found
    };
  }

  const yieldSoon = (fn) => {
    if (typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => fn();
      channel.port2.postMessage(0);
    } else {
      setTimeout(fn, 0);
    }
  };

  function step() {
    if (cancelled) return;
    const deadline = performance.now() + sliceMs;

    do {
      for (let i = 0; i < CHECK_EVERY; i++) {
        if (block.hash.startsWith(target)) {
          if (cb.onDone) cb.onDone(getState(true));
          return;
        }
        block.nonce++;
        block.hash = getHash();
        attempts++;
      }
    } while (performance.now() < deadline);

    if (cb.onProgress) cb.onProgress(getState(false));
    yieldSoon(step);
  }

  yieldSoon(step);

  return {
    cancel: () => {
      cancelled = true;
    }
  };
}