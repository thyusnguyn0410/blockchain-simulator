import elliptic from 'elliptic';
import { calculateSHA256 } from './SHA-256.js';

// Khởi tạo đường cong elliptic secp256k1 chuẩn Bitcoin/Ethereum
const ec = new elliptic.ec('secp256k1');

/**
 * Chuẩn hóa đối tượng JSON theo thứ tự key ổn định (deterministic serialization)
 */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Đảm bảo đầu vào là một chuỗi băm 32-byte hex (SHA-256 digest)
 */
function toMessageDigest(input) {
  const text = typeof input === 'string' ? input : canonical(input);
  // Nếu đã là chuỗi 64 ký tự hex thì giữ nguyên, ngược lại băm SHA-256
  return /^[0-9a-f]{64}$/i.test(text) ? text : calculateSHA256(text);
}

// 1. Sinh ngẫu nhiên cặp khóa
export const generateKeyPair = () => {
  const key = ec.genKeyPair();
  return { 
    privateKey: key.getPrivate('hex').padStart(64, '0'), 
    publicKey: key.getPublic('hex') 
  };
};

// 2. Trích xuất và kiểm tra tính hợp lệ của Private Key
export const getPublicKeyFromPrivate = (privateKey) => {
  try {
    if (!privateKey || typeof privateKey !== 'string') return null;
    const cleanKey = privateKey.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(cleanKey)) return null;

    const scalar = BigInt(`0x${cleanKey}`);
    const curveOrder = BigInt(`0x${ec.curve.n.toString(16)}`);
    if (scalar === 0n || scalar >= curveOrder) return null;

    const key = ec.keyFromPrivate(cleanKey, 'hex');
    return key.getPublic('hex');
  } catch {
    return null;
  }
};

// 3. Kiểm tra tính hợp lệ của Public Key
export const isValidPublicKey = (publicKey) => {
  try {
    if (!publicKey || typeof publicKey !== 'string') return false;
    const key = ec.keyFromPublic(publicKey.trim(), 'hex');
    return key.validate().result;
  } catch {
    return false;
  }
};

// 4. Trích xuất địa chỉ ví từ Public Key (40 ký tự hex)
export const getAddressFromPublicKey = (publicKey) => {
  if (!isValidPublicKey(publicKey)) return null;
  return calculateSHA256(publicKey).slice(0, 40);
};

// 5. Ký thông điệp / giao dịch
export const signMessage = (param1, param2) => {
  try {
    // Tự động nhận diện privateKey (chuỗi hex 64 ký tự)
    const isParam1Priv = typeof param1 === 'string' && getPublicKeyFromPrivate(param1);
    const privateKey = isParam1Priv ? param1 : param2;
    const message = isParam1Priv ? param2 : param1;

    if (!getPublicKeyFromPrivate(privateKey)) return null;
    const digest = toMessageDigest(message);

    return ec.keyFromPrivate(privateKey, 'hex')
      .sign(digest, 'hex', { canonical: true })
      .toDER('hex');
  } catch {
    return null;
  }
};

// 6. Xác thực chữ ký số ECDSA
export const verifySignature = (publicKey, message, signature) => {
  try {
    if (!isValidPublicKey(publicKey) || !signature) return false;
    const digest = toMessageDigest(message);
    return ec.keyFromPublic(publicKey, 'hex').verify(digest, signature);
  } catch {
    return false;
  }
};

// 7. Tạo đối tượng giao dịch hoàn chỉnh đã có chữ ký chuẩn P4
export function createSignedTransaction(privateKey, tx) {
  const publicKey = getPublicKeyFromPrivate(privateKey);
  if (!publicKey) throw new Error('Private key không hợp lệ.');

  const body = {
    from: tx.from || getAddressFromPublicKey(publicKey),
    to: tx.to,
    amount: Number(tx.amount),
    nonce: Number(tx.nonce || 0),
  };

  const signature = signMessage(privateKey, canonical(body));
  return {
    ...body,
    publicKey,
    signature,
    createdAt: tx.createdAt || new Date().toISOString()
  };
}

export { canonical as canonicalize };
