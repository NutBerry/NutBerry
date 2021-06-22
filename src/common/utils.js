import { arrayify, bufferify, bufToHex } from './conversion.js';
import { ecsign, ecrecover, privateToPublic } from './signing.js';
import { encode as rlpEncode, decode as rlpDecode } from './rlp.js';
import Keccak256 from './Keccak256.js';

const keccak = new Keccak256();

export function stripZeros (v) {
  if (v.length === 0) {
    return v;
  }

  let start = 0;

  while (v[start] === 0) {
    start++
  }

  return v.slice(start);
}

// https://eips.ethereum.org/EIPS/eip-2930
export async function signRlpTransaction (txObj, privKeyBuf, chainId) {
  const nonce = Number(txObj.nonce) || '0x';
  const gasPrice = txObj.gasPrice || '0x';
  const gasLimit = txObj.gas || '0x';
  let accessList = [];

  if (txObj.accessList) {
    for (const obj of txObj.accessList) {
      accessList.push([obj.address, obj.storageKeys || []])
    }
  }

  const to = txObj.to;
  const value = txObj.value || '0x';
  const data = bufferify(txObj.data);
  const tmp = [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList];

  const unsigned = [1].concat(rlpEncode(tmp));
  const unsignedHash = keccak.reset().update(unsigned).digestArray();
  const { v, r, s } = await ecsign(unsignedHash, privKeyBuf, chainId);
  const signed = [1].concat(rlpEncode(
    [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, stripZeros(r), stripZeros(s)]
  ));
  const rawTxHex = bufToHex(signed, 0, signed.length);
  const txHash = `0x${keccak.reset().update(signed).digest()}`;

  return { txHash, rawTxHex };
}

export function recoverAddress (msg, v, r, s, chainId) {
  const from =
    '0x' +
    keccak.reset().update(
      ecrecover(
        bufferify(msg),
        Number(v) | 0,
        bufferify(r),
        bufferify(s),
        Number(chainId) | 0
      )
    ).digest().slice(24, 64);

  return from;
}

export async function sha256 (array) {
  if (typeof window !== 'undefined') {
    const arrayBuffer = await window.crypto.subtle.digest('sha-256', Uint8Array.from(array));
    return new Uint8Array(arrayBuffer);
  }

  const { createHash } = await import('crypto');
  return createHash('sha256').update(Uint8Array.from(array)).digest();
}

export function keccak256 (array) {
  return keccak.reset().update(array).digestArray();
}

export function keccak256HexPrefix (array) {
  return `0x${keccak.reset().update(array).digest()}`;
}

export function publicToAddress (_pubKey) {
  const pubKey = bufferify(_pubKey);

  if (pubKey.length !== 64) {
    throw new Error('pubKey.length !== 64');
  }

  return keccak256(pubKey).slice(-20);
}

export function privateToAddress (privateKey) {
  return publicToAddress(privateToPublic(privateKey));
}

export function timeLog (...args) {
  const now = Date.now();
  const delta = now - (globalThis._timeLogLast || now);

  console.log(`+${delta} ms`, ...args);

  globalThis._timeLogLast = now;
}

export function formatObject (obj) {
  const ret = {};

  for (const key in obj) {
    let value = obj[key];

    if (typeof value === 'number' || typeof value === 'bigint') {
      value = `0x${value.toString(16)}`;
    }

    ret[key] = value;
  }

  return ret;
}

export function maybeDecodeError (hexStr) {
  const ERROR_SIG = '0x08c379a0';

  if (hexStr && hexStr.startsWith(ERROR_SIG)) {
    const strLen = Number('0x' + hexStr.substring(74, 138)) & 0xffff;
    // strip the first 68 bytes (136 + 2 for 0x)
    const buf = bufferify(hexStr.substring(138, 138 + (strLen * 2)));
    return (new TextDecoder()).decode(buf);
  }

  return '';
}
