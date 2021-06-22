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
  const rLen = _sig[0][offset];
  const sLen = _sig[0][offset += (rLen + 2)];

  offset = 4;
  sig.set(_sig[0].subarray(offset, offset += rLen), 32 - rLen);
  offset += 2;
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

  // DER encoding
  // 0x30${length}02${rLen}${r}02${sLen}${s}
  const sig = new Uint8Array(70);
  sig[0] = 48;
  sig[1] = 68;
  sig[2] = 2;
  sig[3] = 32;
  sig.set(r, 4 + (32 - r.length));
  sig[36] = 2;
  sig[37] = 32;
  sig.set(s, 38 + (32 - s.length));

  return secp.recoverPublicKey(msgHash, sig, recovery).slice(1);
}
