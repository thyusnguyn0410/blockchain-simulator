import elliptic from 'elliptic';
import { calculateSHA256 } from './SHA-256.js';

const ec = new elliptic.ec('secp256k1');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const generateKeyPair = () => {
  const key = ec.genKeyPair();
  return { privateKey: key.getPrivate('hex'), publicKey: key.getPublic('hex') };
};

export const getPublicKeyFromPrivate = (privateKey) => {
  try {
    if (!/^[0-9a-f]{64}$/i.test(privateKey)) return null;
    const scalar = BigInt(`0x${privateKey}`);
    if (scalar === 0n || scalar >= BigInt(`0x${ec.curve.n.toString(16)}`)) return null;
    const key = ec.keyFromPrivate(privateKey, 'hex');
    return key.getPublic('hex');
  } catch {
    return null;
  }
};

export const isValidPublicKey = (publicKey) => {
  try {
    const key = ec.keyFromPublic(publicKey, 'hex');
    return key.validate().result;
  } catch {
    return false;
  }
};

export const getAddressFromPublicKey = (publicKey) => calculateSHA256(publicKey).slice(0, 40);

export const signMessage = (privateKey, message) => {
  try {
    if (!getPublicKeyFromPrivate(privateKey)) return null;
    return ec.keyFromPrivate(privateKey, 'hex').sign(calculateSHA256(message), 'hex', { canonical: true }).toDER('hex');
  } catch {
    return null;
  }
};

export const verifySignature = (publicKey, message, signature) => {
  try {
    return isValidPublicKey(publicKey) && ec.keyFromPublic(publicKey, 'hex').verify(calculateSHA256(message), signature);
  } catch {
    return false;
  }
};

export function createSignedTransaction(privateKey, tx) {
  const publicKey = getPublicKeyFromPrivate(privateKey);
  if (!publicKey) throw new Error('Private key không hợp lệ.');
  const body = { from: getAddressFromPublicKey(publicKey), to: tx.to, amount: Number(tx.amount), nonce: Number(tx.nonce) };
  return { ...body, publicKey, signature: signMessage(privateKey, canonical(body)) };
}

export { canonical as canonicalize };
