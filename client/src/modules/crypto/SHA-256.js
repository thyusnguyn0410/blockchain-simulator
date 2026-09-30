import CryptoJS from 'crypto-js';

/**
 * TÍNH NĂNG 1: Tính mã băm SHA-256 dùng CryptoJS
 */
export const calculateSHA256 = (data) => {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex).toLowerCase();
};

/**
 * TÍNH NĂNG PHỤ HỖ TRỢ GIAO DIỆN: Định dạng chuỗi Hash 64 ký tự
 */
export const formatHashFormatted = (h) => 
  h?.length === 64 ? h.match(/.{1,16}/g).map(l => l.match(/.{1,4}/g).join(' ')).join('\n') : h;

/**
 * TÍNH NĂNG 2: Mô phỏng Hiệu ứng Thác đổ (Avalanche Effect)
 */
export function checkAvalancheEffect(i1, i2) {
  const h1 = calculateSHA256(i1);
  const h2 = calculateSHA256(i2);
  
  const b1 = BigInt('0x' + h1).toString(2).padStart(256, '0');
  const b2 = BigInt('0x' + h2).toString(2).padStart(256, '0');
  
  let diff = 0;
  for (let i = 0; i < 256; i++) {
    if (b1[i] !== b2[i]) diff++;
  }
  
  return { 
    input1: i1, 
    hash1: h1, 
    input2: i2, 
    hash2: h2, 
    differentBits: diff, 
    percentageChange: `${((diff / 256) * 100).toFixed(2)}%` 
  };
}

/**
 * TÍNH NĂNG 3: Khai thác Block bằng Proof of Work (Bruteforce Nonce)
 */
export function bruteforceHash(data, targetPrefix = '0000') {
  let nonce = 0;
  let hash = '';
  const start = Date.now();
  const prefix = targetPrefix.toLowerCase();
  
  do { 
    nonce++;
    hash = calculateSHA256(data + nonce); 
  } while (!hash.startsWith(prefix));
  
  return { 
    nonce, 
    hash, 
    timeTakenSeconds: `${((Date.now() - start) / 1000).toFixed(3)}s` 
  };
}
