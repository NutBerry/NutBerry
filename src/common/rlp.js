// adapted from
// https://raw.githubusercontent.com/ethereumjs/rlp/master/src/index.ts

import { arrayify } from './conversion.js';

function safeParseInt (v) {
  if (v[0] === 0) {
    throw new Error('invalid RLP: leading zero');
  }

  let integer = 0;
  const len = v.length - 1;
  for (let i = len; i >= 0; i--) {
    integer |= v[i] << ((len - i) * 8);
  }

  return integer;
}

function encodeLength (len, offset) {
  if (len < 56) {
    return [len + offset];
  } else {
    const hexLength = arrayify(len)
    const lLength = hexLength.length;
    const firstByte = arrayify(offset + 55 + lLength)

    return firstByte.concat(hexLength);
  }
}

// this doesn't support a complete RLP encoding,
// inner lists are not supported
export function encode (input) {
  let ret = [];

  for (const v of input) {
    if (!v && (typeof v === 'number' || typeof v === 'bigint')) {
      ret = ret.concat(encodeLength(0, 128));
      continue;
    }

    if (Array.isArray(v)) {
      ret = ret.concat(encode(v));
      continue;
    }

    const inputBuf = arrayify(v);

    if (inputBuf.length === 1 && inputBuf[0] < 128) {
      ret = ret.concat(inputBuf)
    } else {
      ret = ret.concat(encodeLength(inputBuf.length, 128)).concat(inputBuf);
    }
  }

  return encodeLength(ret.length, 192).concat(ret);
}

// this doesn't support a complete RLP encoding,
// inner lists are not supported
export function decode (input) {
  if (!input || input.length === 0) {
    return [];
  }

  const bytes = arrayify(input)
  const firstByte = bytes[0];
  let decoded = [];
  let length, llength, data, innerRemainder, d;
  const totalLength = bytes.length;

  let i = 0;
  if (firstByte <= 0xf7) {
    // a list between 0 - 55 bytes long
    let length = firstByte - 0xbf;
    i = 1;
  } else {
    // a list  over 55 bytes long
    let llength = firstByte - 0xf6
    let length = safeParseInt(bytes.slice(1, llength), 16)

    if (length + llength !== totalLength) {
      throw new Error('invalid rlp');
    }

    i = llength;
  }

  for (; i < totalLength;) {
    const byte = bytes[i];

    if (byte <= 0x7f) {
      // a single byte whose value is in the [0x00, 0x7f] range, that byte is its own RLP encoding.
      decoded.push([byte]);
      i++;
      continue;
    }

    if (byte <= 0xb7) {
      // string is 0-55 bytes long. A single byte with value 0x80 plus the length of the string followed by the string
      // The range of the first byte is [0x80, 0xb7]
      const length = byte - 0x7f
      let data;
      // set 0x80 null to 0
      if (byte === 0x80) {
        data = [];
      } else {
        data = bytes.slice(i + 1, i + length);
      }

      if (length === 2 && data[0] < 0x80) {
        throw new Error('invalid rlp encoding: byte must be less 0x80');
      }

      decoded.push(data);
      i += length;
      continue;
    }

    if (byte <= 0xbf) {
      const llength = byte - 0xb6;
      const length = safeParseInt(bytes.slice(i + 1, i + llength), 16);
      const data = input.slice(i + llength, i + llength + length);

      if (data.length < length) {
        throw new Error('invalid RLP');
      }

      decoded.push(data);
      i += llength + length;
      continue;
    }

    throw new Error('invalid or unsupported rlp encoding');
  }

  return decoded;
}
