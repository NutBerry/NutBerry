import secp from 'noble-secp256k1';

import { bufferify } from './conversion.js';

export function privateToPublic (_privateKey) {
  const privateKey = bufferify(_privateKey);

  return secp.getPublicKey(privateKey, false).slice(1);
}

export async function ecsign (msgHash, privateKey, chainId) {
  // DER encoding
  // 0x30${length}02${rLen}${r}02${sLen}${s}
  const _sig = await secp.sign(msgHash, privateKey, { recovered: true, canonical: true });
  const sig = new Uint8Array(64);

  let offset = 3;
  let rLen = _sig[0][offset];
  let sLen = _sig[0][offset += (rLen + 2)];

  offset = 4;
  if (rLen > 32) {
    rLen = 32;
    offset++;
  }
  sig.set(_sig[0].subarray(offset, offset += rLen), 32 - rLen);
  offset += 2;
  if (sLen > 32) {
    sLen = 32;
    offset++;
  }
  sig.set(_sig[0].subarray(offset, offset + sLen), 64 - sLen);

  const recovery = _sig[1];
  return {
    r: sig.slice(0, 32),
    s: sig.slice(32, 64),
    //v: chainId ? recovery + (chainId * 2 + 35) : recovery + 27,
    v: recovery,
  };
};

export function ecrecover (msgHash, v, r, s, chainId) {
  const recovery = chainId ? v - (2 * chainId + 35) : v - 27;

  if (recovery !== 0 && recovery !== 1) {
    throw new Error('Invalid signature v value');
  }

  let skipR = 0;
  for (const v of r) {
    if (v === 0) {
      skipR++;
    }
    break;
  }
  let skipS = 0;
  for (const v of s) {
    if (v === 0) {
      skipS++;
    }
    break;
  }

  // DER encoding
  // 0x30${length}02${rLen}${r}02${sLen}${s}
  const rLen = r.length - skipR;
  const sLen = s.length - skipS;
  const sig = new Uint8Array(6 + rLen + sLen);
  sig[0] = 48;
  sig[1] = sig.length - 2;
  sig[2] = 2;
  sig[3] = rLen;
  sig.set(r.subarray(skipR), 4);
  let offset = 4 + rLen;
  sig[offset++] = 2;
  sig[offset++] = sLen;
  sig.set(s.subarray(skipS), offset);

  return secp.recoverPublicKey(msgHash, sig, recovery).slice(1);
}
