import secp from '@noble/secp256k1';

import { bufferify } from './conversion.js';

export function privateToPublic (_privateKey) {
  const privateKey = bufferify(_privateKey);

  return secp.getPublicKey(privateKey, false).slice(1);
}

export async function ecsign (msgHash, privateKey, chainId) {
  const sig = await secp.sign(msgHash, privateKey, { recovered: true, canonical: true, der: false });
  const recovery = sig[1];
  const rs = sig[0];
  return {
    r: rs.slice(0, 64),
    s: rs.slice(64, 128),
    //v: chainId ? recovery + (chainId * 2 + 35) : recovery + 27,
    v: recovery,
  };
};

export function ecrecover (msgHash, v, r, s, chainId) {
  const recovery = chainId ? v - (2 * chainId + 35) : v - 27;

  if (recovery !== 0 && recovery !== 1) {
    throw new Error('Invalid signature v value');
  }

  const sig = new secp.Signature(r, s);

  return secp.recoverPublicKey(msgHash, sig, recovery).slice(1);
}
