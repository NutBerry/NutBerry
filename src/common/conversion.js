
const HEXMAP = {};

for (let i = 0; i <= 0xff; i++) {
  HEXMAP[i.toString(16).padStart(2, '0')] = i;
}

export function bufferify (val) {
  return Uint8Array.from(arrayify(val));
}

export function arrayify (val) {
  if (Array.isArray(val)) {
    return val;
  }

  let v = val;

  if (typeof v === 'number' || typeof v === 'bigint') {
    if (!v) {
      return [0];
    } else {
      v = v.toString(16);
    }
  }

  if (typeof v === 'object') {
    return Array.from(v);
  }

  if (typeof v !== 'string') {
    v = v.toString(16);
  }

  v = v.replace('0x', '');
  if (v.length % 2) {
    v = '0' + v;
  }

  const vLen = v.length;
  const res = [];
  for (let i = 0; i < vLen; i += 2) {
    const n = HEXMAP[v.substring(i, i + 2).toLowerCase()];

    if (n === undefined) {
      throw new TypeError(`invalid hex string ${v}`);
    }

    res.push(n);
  }

  return res;
}

export function packString (values, defs) {
  let res = '';
  const len = values.length;

  for (let i = 0; i < len; i++) {
    const def = defs[i] * 2;
    const v = values[i];

    if (typeof v === 'number' || typeof v === 'bigint') {
      res += BigInt.asUintN(defs[i] * 8, v.toString()).toString(16).padStart(def, '0');
      continue;
    }

    res += v.toString(16).replace('0x', '').padStart(def, '0');
  }

  return res;
}

export function toHex (buf) {
  const len = buf.length;
  let res = '';

  for (let i = 0; i < len; i++) {
    res += (buf[i] | 0).toString(16).padStart(2, '0');
  }

  return res;
}

export function toHexPrefix (buf) {
  return '0x' + toHex(buf);
}

export function bufToHex (buf, start, end) {
  const len = buf.length;
  const max = end > len ? len : end;
  let res = '0x';
  let i;

  for (i = start; i < max; i++) {
    res += (buf[i] | 0).toString(16).padStart(2, '0');
  }

  for (; i < end; i++) {
    res += '00';
  }

  return res;
}

export function toBigInt (val) {
  if (typeof val === 'number' || typeof val === 'bigint') {
    return BigInt(val);
  }

  // assuming this is a number
  if (typeof val === 'string') {
    return BigInt(val);
  }

  // everything else
  return BigInt(toHexPrefix(arrayify(val)));
}
