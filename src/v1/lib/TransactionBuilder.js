import { arrayify, bufToHex, toHex, toBigInt } from '../../common/conversion.js';
import { keccak256HexPrefix, recoverAddress } from '../../common/utils.js';
import SUPPORTED_TYPES from './valueTypes.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function hash (val) {
  if (typeof val === 'string') {
    if (!val.startsWith('0x')) {
      return keccak256HexPrefix(encoder.encode(val));
    }
  }

  return keccak256HexPrefix(val);
}

function pad32 (x) {
  const v = arrayify(x);

  if (v.length === 32) {
    return v;
  }

  return Array(32 - v.length).fill(0).concat(v);
}

function padEnd32 (x) {
  const v = arrayify(x);

  if (v.length === 32) {
    return v;
  }

  return v.concat(Array(32 - v.length).fill(0));
}

function decodeValue (type, typeSize, val) {
  if (type === 'string') {
    return decoder.decode(Uint8Array.from(val));
  }
  // uint
  if (type[0] === 'u') {
    const n = SUPPORTED_TYPES[type] * 8;
    return BigInt.asUintN(n, bufToHex(val, 0, typeSize));
  }
  // int
  if (type[0] === 'i') {
    const n = SUPPORTED_TYPES[type] * 8;
    return BigInt.asIntN(n, bufToHex(val, 0, typeSize));
  }

  // everything else
  // pad left with zeros
  return '0x' + bufToHex(val, 0, typeSize).replace('0x', '').padStart((SUPPORTED_TYPES[type] || typeSize) * 2, '0');
}

function encodeHashingValue (type, val) {
  if (type === 'string') {
    return '0x' + toHex(encoder.encode(val));
  }

  if (type === 'bytes') {
    return '0x' + toHex(arrayify(val));
  }

  const n = SUPPORTED_TYPES[type];

  // bytes
  if (type[0] === 'b') {
    return '0x' + BigInt.asUintN(n * 8, toBigInt(val)).toString(16).padStart(n * 2, '0').padEnd(64, '0');
  }

  // int
  if (type[0] === 'i') {
    const tmp = BigInt.asUintN(n * 8, BigInt(val)).toString(16);
    return '0x' + tmp.padStart(tmp.length + (tmp.length % 2), '0').padStart(64, 'f');
  }

  // everything else
  return '0x' + BigInt.asUintN(n * 8, BigInt(val)).toString(16).padStart(64, '0');
}

function encodeValue (type, val) {
  let ret = [];

  if (type === 'string') {
    ret = Array.from(encoder.encode(val));
  } else if (type === 'bytes') {
    ret = arrayify(val);
  } else {
    // we strip leading zeroes from everything else
    // TODO: strip bytesXX values on the right
    const n = SUPPORTED_TYPES[type] * 8;
    const str = BigInt.asUintN(n, toBigInt(val)).toString(16);
    const v = str.padStart(str.length % 2 ? str.length + 1 : str.length, '0');
    ret = arrayify(v);
  }

  const isStatic = type !== 'bytes' && type !== 'string';
  // if static then size = 1 byte else 2 bytes
  const len = ret.length.toString(16).padStart(isStatic ? 2 : 4, '0');
  ret = arrayify(len).concat(ret);

  return ret;
}

export default class TransactionBuilder {
  constructor (typedData, excludeSender = false) {
    const typedDataObj = typeof typedData === 'string' ? JSON.parse(typedData) : typedData;

    // TODO: merge
    this.types = typedDataObj.types;
    this.primaryTypes = typedDataObj.primaryTypes;
    this.typeHashes = {};
    this.fieldNames = {};
    this.functionSigs = {};
    this.excludeSender = excludeSender;

    for (const k in this.types) {
      // ignore EIP712Domain
      if (k === 'EIP712Domain') {
        continue;
      }
      this.typeHashes[k] = hash(this.encodeType(k));
    }

    for (const t of this.primaryTypes) {
      const fieldNames = [];

      if (this.fieldNames[t]) {
        throw new Error('should not happen');
      }

      this.fieldNames[t] = fieldNames;
      const fields = Array.from(this.types[t]).reverse();
      let todo = [];

      // initial seed
      for (const field of fields) {
        todo.push({ field, parent: [] });
      }

      while (todo.length) {
        const { field, parent, customType } = todo.pop();

        if (this.types[field.type] !== undefined) {
          // a custom type - not a primitive
          const x = this.types[field.type];
          for (let k of Array.from(x).reverse()) {
            todo.push(
              {
                field: k,
                customType: field.type,
                parent: parent.concat([field.name]),
              }
            );
          }
          continue;
        }

        if (!SUPPORTED_TYPES.hasOwnProperty(field.type)) {
          throw new TypeError(`unsupported type: ${field.type}`);
        }

        // everything else
        fieldNames.push({ name: field.name, customType, type: field.type, parent });
      }
    }

    for (const primaryType of this.primaryTypes) {
      let functionString = `on${primaryType}(${this.excludeSender ? '' : 'address,'}`;
      const fields = this.fieldNames[primaryType];

      for (const field of fields) {
        functionString += field.type + ',';
      }
      functionString = functionString.slice(0, -1) + ')';

      const functionSig = hash(functionString).slice(0, 10);
      this.functionSigs[primaryType] = functionSig;
    }

    this.domainStructHash = this.structHash('EIP712Domain', typedDataObj.domain);
  }

  decode (bytes, start) {
    start = start | 0;
    let offset = start;

    const firstByte = bytes[offset++];
    const primaryType = this.primaryTypes[(firstByte >> 1)];
    const r = bufToHex(bytes, offset, offset += 32);
    const s = bufToHex(bytes, offset, offset += 32);
    const root = {};

    if (!primaryType) {
      throw new Error('Unknown transaction type');
    }

    for (const field of this.fieldNames[primaryType]) {
      let value;
      let obj = root;

      for (const key of field.parent) {
        let f = obj[key];
        if (!f) {
          f = {};
          obj[key] = f;
        }
        obj = f;
      }

      const encType = field.type;
      const isStatic = encType !== 'bytes' && encType !== 'string';
      // if static 1 byte else 2 bytes
      const typeSize = Number(bufToHex(bytes, offset, offset += (isStatic ? 1 : 2)));
      const val = bytes.slice(offset, offset += typeSize);

      // convert bytes to type
      const decodedValue = decodeValue(encType, typeSize, val);

      obj[field.name] = decodedValue;
    }

    const v = (firstByte & 1) + 27;
    const ret = {
      primaryType,
      message: root,
      v,
      r,
      s,
    };

    const typedDataHash = this.sigHash(ret);
    // TODO: support chainId parameter across all calls
    const chainId = 0;
    ret.from = recoverAddress(typedDataHash, v, r, s, chainId);
    ret.hash = keccak256HexPrefix(bytes.slice(start, offset));
    ret.size = offset - start;

    return ret;
  }

  encode (tx) {
    const transactionType = this.primaryTypes.indexOf(tx.primaryType);
    if (transactionType === -1) {
      throw new Error(`Invalid primaryType ${tx.primaryType}`);
    }
    const firstByte = (Number(tx.v) - 27) | (transactionType << 1);

    let ret = arrayify(firstByte).concat(arrayify(tx.r)).concat(arrayify(tx.s));

    for (const field of this.fieldNames[tx.primaryType]) {
      let value = tx.message;
      for (const p of field.parent) {
        value = value[p];
      }
      value = value[field.name];

      const encodedValue = encodeValue(field.type, value);
      ret = ret.concat(encodedValue);
    }

    return ret;
  }

  // Returns the function declaration as input for the typeHash
  encodeType (primaryType) {
    const struct = this.types[primaryType];
    const deps = [];
    const todo = [];

    for (const x of struct) {
      todo.push(x.type);
    }

    while (todo.length) {
      const type = todo.pop();

      if (type !== primaryType && this.types[type] && deps.indexOf(type) === -1) {
        deps.push(type);

        for (const x of this.types[type]) {
          todo.push(x.type);
        }
      }
    }

    let str = '';
    // primary first, then alphabetical
    for (const type of [primaryType].concat(deps.sort())) {
      const args = this.types[type].map(({ name, type }) => `${type} ${name}`).join(',');
      str += `${type}(${args})`;
    }

    return str;
  }

  encodeData (primaryType, data) {
    const encValues = [];

    // add typehash
    encValues.push(this.typeHashes[primaryType] || hash(this.encodeType(primaryType)));

    // add field contents
    for (const field of this.types[primaryType]) {
      const value = data[field.name];

      if (typeof value === 'undefined') {
        throw new Error(`${field.name} not defined`);
      }

      if (field.type === 'string' || field.type === 'bytes') {
        encValues.push(hash(encodeHashingValue(field.type, value)));
        continue;
      }

      if (this.types[field.type] !== undefined) {
        encValues.push(hash(this.encodeData(field.type, value)));
        continue;
      }

      encValues.push(encodeHashingValue(field.type, value));
    }

    return '0x' + encValues.flatMap(v => v.replace('0x', '')).join('');
  }

  structHash (primaryType, data) {
    return hash(this.encodeData(primaryType, data));
  }

  sigHash (tx) {
    return hash(
      '0x1901' +
      this.domainStructHash.replace('0x', '') +
      this.structHash(tx.primaryType, tx.message).replace('0x', '')
    );
  }

  info () {
    const ret = {
      EIP712Domain: {
        domainStructHash: this.domainStructHash
      }
    };

    for (const key of this.primaryTypes) {
      if (ret[key]) {
        continue;
      }

      const encodedType = this.encodeType(key);
      const typeHash = this.typeHashes[key];
      const functionSig = this.functionSigs[key];

      let functionString = `on${key}(address,`;
      for (const field of this.fieldNames[key]) {
        functionString += field.type + ',';
      }
      functionString = functionString.slice(0, -1) + ')';

      ret[key] = { encodedType, typeHash, functionSig, functionString };
    }

    return ret;
  }

  encodeCall (tx) {
    const fields = this.fieldNames[tx.primaryType];
    const functionSig = this.functionSigs[tx.primaryType];
    // order for head and tail
    // first one is always transaction sender if !this.excludeSender
    let headSize = this.excludeSender ? 0 : 32;
    for (const field of fields) {
      headSize += 32;
    }

    let head = this.excludeSender ? arrayify(functionSig) : arrayify(functionSig).concat(pad32(tx.from));
    let tail = [];
    for (const field of fields) {
      const isStatic = field.type !== 'bytes' && field.type !== 'string';

      let fieldValue = tx.message;
      for (const p of field.parent) {
        fieldValue = fieldValue[p];
      }
      fieldValue = fieldValue[field.name];

      if (isStatic) {
        head = head.concat(arrayify(encodeHashingValue(field.type, fieldValue)));
      } else {
        head = head.concat(pad32(headSize));

        const v = field.type === 'string' ? Array.from(encoder.encode(fieldValue)) : arrayify(fieldValue);
        const p = 32 * ~~((v.length + 31) / 32);

        headSize += 32 + p;
        tail = tail.concat(pad32(v.length));
        tail = tail.concat(v).concat(Array(p - v.length).fill(0));
      }
    }

    return head.concat(tail);
  }

  decodeLength (bytes, _offset) {
    const start = _offset | 0;
    let offset = start;

    // type, v
    const primaryType = this.primaryTypes[(bytes[offset++] >> 1)];
    // r, s
    offset += 64;

    if (!primaryType) {
      return offset - start;
    }

    for (const field of this.fieldNames[primaryType]) {
      const encType = field.type;
      const isStatic = encType !== 'bytes' && encType !== 'string';
      // if static 1 byte else 2 bytes
      const typeSize = Number(bufToHex(bytes, offset, offset += (isStatic ? 1 : 2)));
      offset += typeSize;
    }

    return offset - start;
  }
}
