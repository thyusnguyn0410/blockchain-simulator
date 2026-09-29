import CryptoJS from 'crypto-js';

export const calculateSHA256 = (data) => CryptoJS.SHA256(String(data)).toString(CryptoJS.enc.Hex).toLowerCase();

export const formatHashFormatted = (hash) => (
  hash?.length === 64 ? hash.match(/.{1,16}/g).map((line) => line.match(/.{1,4}/g).join(' ')).join('\n') : hash
);

export function checkAvalancheEffect(input1, input2) {
  const hash1 = calculateSHA256(input1);
  const hash2 = calculateSHA256(input2);
  let differentBits = 0;
  for (let i = 0; i < hash1.length; i += 1) {
    differentBits += (parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16)).toString(2).replaceAll('0', '').length;
  }
  return {
    input1, hash1, input2, hash2, differentBits,
    percentageChange: `${((differentBits / 256) * 100).toFixed(2)}%`,
  };
}

export function bruteforceHash(data, difficulty = 2, maxAttempts = 250_000) {
  const level = typeof difficulty === 'string' && /^0{1,5}$/.test(difficulty)
    ? difficulty.length
    : Number(difficulty);
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new RangeError('Độ khó chỉ từ 1 đến 5.');
  const prefix = '0'.repeat(level);
  const startedAt = performance.now();
  for (let nonce = 0; nonce < maxAttempts; nonce += 1) {
    const hash = calculateSHA256(`${data}${nonce}`);
    if (hash.startsWith(prefix)) {
      return { nonce, hash, attempts: nonce + 1, timeTakenSeconds: `${((performance.now() - startedAt) / 1000).toFixed(3)}s` };
    }
  }
  return { found: false, attempts: maxAttempts, timeTakenSeconds: `${((performance.now() - startedAt) / 1000).toFixed(3)}s` };
}
