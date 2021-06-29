if (typeof process !== 'undefined') {
  globalThis['process$1'] = process;
  import('crypto').then(function(esm){globalThis['require$$0']=esm});
  globalThis['fs'] = undefined;
  globalThis['path$1'] = undefined;
} else {
  globalThis['Buffer'] = {
    from: function (a, b) {
      if (b !== 'hex') {
        throw new Error('unsupported Buffer.from');
      }
      const len = a.length / 2;
      const ret = Array(len);
      for (let i = 0; i < len; i++) {
        const x = i * 2;
        ret[i] = parseInt(a.substring(x, x + 2), 16);
      }
      return ret;
    }
  };
}


const UINT_ZERO$1 = '0x0000000000000000000000000000000000000000000000000000000000000000';

function toStr (value, pad) {
  if (value === undefined) {
    throw new Error('value undefined');
  }

  if (typeof value === 'string') {
    if (value.length > pad) {
      return '0x' + value.replace('0x', '').slice(-pad);
    }
    return '0x' + value.replace('0x', '').padStart(pad, '0');
  }

  return '0x' + value.toString(16).padStart(pad, '0');
}

class Inventory {
  static fromJSON (obj) {
    const ret = new this();
    ret.storage = Object.assign({}, obj.storage);
    ret.reads = Object.assign({}, obj.reads);
    ret.writes = Object.assign({}, obj.writes);

    return ret;
  }

  constructor () {
    this.storage = {};
    this.reads = {};
    this.writes = {};
  }

  toJSON () {
    const storage = this.storage;
    const reads = this.reads;
    const writes = this.writes;

    return { storage, reads, writes };
  }

  clone () {
    const ret = this.toJSON();

    return this.constructor.fromJSON(ret);
  }

  freeze () {
    Object.freeze(this);
    Object.freeze(this.storage);
    Object.freeze(this.reads);
    Object.freeze(this.writes);
  }

  clearCache() {
    this.reads = {};
    this.writes = {};
  }

  _getValue (key) {
    return this.storage[key];
  }

  _setValue (key, value) {
    const v = toStr(value, 64);

    this.storage[key] = v;
    this.writes[key] = v;
  }

  storageLoad (target, key) {
    const v = this._getValue(key) || UINT_ZERO$1;

    if (!this.reads[key] || !this.writes[key]) {
      this.reads[key] = v;
    }

    return v;
  }

  storageStore (key, value) {
    this._setValue(key, value);
  }
}

const HEXMAP = {};

for (let i = 0; i <= 0xff; i++) {
  HEXMAP[i.toString(16).padStart(2, '0')] = i;
}

function bufferify (val) {
  return Uint8Array.from(arrayify(val));
}

function arrayify (val) {
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

function packString (values, defs) {
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

function toHex (buf) {
  const len = buf.length;
  let res = '';

  for (let i = 0; i < len; i++) {
    res += (buf[i] | 0).toString(16).padStart(2, '0');
  }

  return res;
}

function toHexPrefix (buf) {
  return '0x' + toHex(buf);
}

function bufToHex (buf, start, end) {
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

function toBigInt (val) {
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

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var nobleSecp256k1 = {};

(function (exports) {
/*! noble-secp256k1 - MIT License (c) Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.schnorr = exports.verify = exports.sign = exports.getSharedSecret = exports.recoverPublicKey = exports.getPublicKey = exports.SignResult = exports.Signature = exports.Point = exports.CURVE = void 0;
const CURVE = {
    a: 0n,
    b: 7n,
    P: 2n ** 256n - 2n ** 32n - 977n,
    n: 2n ** 256n - 432420386565659656852420866394968145599n,
    h: 1n,
    Gx: 55066263022277343669578718895168534326250603453777594175500187360389116729240n,
    Gy: 32670510020758816978083085130507043184471273380659243275938904335757337482424n,
    beta: 0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501een,
};
exports.CURVE = CURVE;
function weistrass(x) {
    const { a, b } = CURVE;
    return mod(x ** 3n + a * x + b);
}
const USE_ENDOMORPHISM = CURVE.a === 0n;
class JacobianPoint {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    static fromAffine(p) {
        if (!(p instanceof Point)) {
            throw new TypeError('JacobianPoint#fromAffine: expected Point');
        }
        return new JacobianPoint(p.x, p.y, 1n);
    }
    static toAffineBatch(points) {
        const toInv = invertBatch(points.map((p) => p.z));
        return points.map((p, i) => p.toAffine(toInv[i]));
    }
    static normalizeZ(points) {
        return JacobianPoint.toAffineBatch(points).map(JacobianPoint.fromAffine);
    }
    equals(other) {
        const a = this;
        const b = other;
        const az2 = mod(a.z * a.z);
        const az3 = mod(a.z * az2);
        const bz2 = mod(b.z * b.z);
        const bz3 = mod(b.z * bz2);
        return mod(a.x * bz2) === mod(az2 * b.x) && mod(a.y * bz3) === mod(az3 * b.y);
    }
    negate() {
        return new JacobianPoint(this.x, mod(-this.y), this.z);
    }
    double() {
        const X1 = this.x;
        const Y1 = this.y;
        const Z1 = this.z;
        const A = X1 ** 2n;
        const B = Y1 ** 2n;
        const C = B ** 2n;
        const D = 2n * ((X1 + B) ** 2n - A - C);
        const E = 3n * A;
        const F = E ** 2n;
        const X3 = mod(F - 2n * D);
        const Y3 = mod(E * (D - X3) - 8n * C);
        const Z3 = mod(2n * Y1 * Z1);
        return new JacobianPoint(X3, Y3, Z3);
    }
    add(other) {
        if (!(other instanceof JacobianPoint)) {
            throw new TypeError('JacobianPoint#add: expected JacobianPoint');
        }
        const X1 = this.x;
        const Y1 = this.y;
        const Z1 = this.z;
        const X2 = other.x;
        const Y2 = other.y;
        const Z2 = other.z;
        if (X2 === 0n || Y2 === 0n)
            return this;
        if (X1 === 0n || Y1 === 0n)
            return other;
        const Z1Z1 = Z1 ** 2n;
        const Z2Z2 = Z2 ** 2n;
        const U1 = X1 * Z2Z2;
        const U2 = X2 * Z1Z1;
        const S1 = Y1 * Z2 * Z2Z2;
        const S2 = Y2 * Z1 * Z1Z1;
        const H = mod(U2 - U1);
        const r = mod(S2 - S1);
        if (H === 0n) {
            if (r === 0n) {
                return this.double();
            }
            else {
                return JacobianPoint.ZERO;
            }
        }
        const HH = mod(H ** 2n);
        const HHH = mod(H * HH);
        const V = U1 * HH;
        const X3 = mod(r ** 2n - HHH - 2n * V);
        const Y3 = mod(r * (V - X3) - S1 * HHH);
        const Z3 = mod(Z1 * Z2 * H);
        return new JacobianPoint(X3, Y3, Z3);
    }
    subtract(other) {
        return this.add(other.negate());
    }
    multiplyUnsafe(scalar) {
        if (!isValidScalar(scalar))
            throw new TypeError('Point#multiply: expected valid scalar');
        let n = mod(BigInt(scalar), CURVE.n);
        if (!USE_ENDOMORPHISM) {
            let p = JacobianPoint.ZERO;
            let d = this;
            while (n > 0n) {
                if (n & 1n)
                    p = p.add(d);
                d = d.double();
                n >>= 1n;
            }
            return p;
        }
        let [k1neg, k1, k2neg, k2] = splitScalarEndo(n);
        let k1p = JacobianPoint.ZERO;
        let k2p = JacobianPoint.ZERO;
        let d = this;
        while (k1 > 0n || k2 > 0n) {
            if (k1 & 1n)
                k1p = k1p.add(d);
            if (k2 & 1n)
                k2p = k2p.add(d);
            d = d.double();
            k1 >>= 1n;
            k2 >>= 1n;
        }
        if (k1neg)
            k1p = k1p.negate();
        if (k2neg)
            k2p = k2p.negate();
        k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
        return k1p.add(k2p);
    }
    precomputeWindow(W) {
        const windows = USE_ENDOMORPHISM ? 128 / W + 1 : 256 / W + 1;
        let points = [];
        let p = this;
        let base = p;
        for (let window = 0; window < windows; window++) {
            base = p;
            points.push(base);
            for (let i = 1; i < 2 ** (W - 1); i++) {
                base = base.add(p);
                points.push(base);
            }
            p = base.double();
        }
        return points;
    }
    wNAF(n, affinePoint) {
        if (!affinePoint && this.equals(JacobianPoint.BASE))
            affinePoint = Point.BASE;
        const W = (affinePoint && affinePoint._WINDOW_SIZE) || 1;
        if (256 % W) {
            throw new Error('Point#wNAF: Invalid precomputation window, must be power of 2');
        }
        let precomputes = affinePoint && pointPrecomputes.get(affinePoint);
        if (!precomputes) {
            precomputes = this.precomputeWindow(W);
            if (affinePoint && W !== 1) {
                precomputes = JacobianPoint.normalizeZ(precomputes);
                pointPrecomputes.set(affinePoint, precomputes);
            }
        }
        let p = JacobianPoint.ZERO;
        let f = JacobianPoint.ZERO;
        const windows = USE_ENDOMORPHISM ? 128 / W + 1 : 256 / W + 1;
        const windowSize = 2 ** (W - 1);
        const mask = BigInt(2 ** W - 1);
        const maxNumber = 2 ** W;
        const shiftBy = BigInt(W);
        for (let window = 0; window < windows; window++) {
            const offset = window * windowSize;
            let wbits = Number(n & mask);
            n >>= shiftBy;
            if (wbits > windowSize) {
                wbits -= maxNumber;
                n += 1n;
            }
            if (wbits === 0) {
                f = f.add(window % 2 ? precomputes[offset].negate() : precomputes[offset]);
            }
            else {
                const cached = precomputes[offset + Math.abs(wbits) - 1];
                p = p.add(wbits < 0 ? cached.negate() : cached);
            }
        }
        return [p, f];
    }
    multiply(scalar, affinePoint) {
        if (!isValidScalar(scalar))
            throw new TypeError('Point#multiply: expected valid scalar');
        let n = mod(BigInt(scalar), CURVE.n);
        let point;
        let fake;
        if (USE_ENDOMORPHISM) {
            const [k1neg, k1, k2neg, k2] = splitScalarEndo(n);
            let k1p, k2p, f1p, f2p;
            [k1p, f1p] = this.wNAF(k1, affinePoint);
            [k2p, f2p] = this.wNAF(k2, affinePoint);
            if (k1neg)
                k1p = k1p.negate();
            if (k2neg)
                k2p = k2p.negate();
            k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
            [point, fake] = [k1p.add(k2p), f1p.add(f2p)];
        }
        else {
            [point, fake] = this.wNAF(n, affinePoint);
        }
        return JacobianPoint.normalizeZ([point, fake])[0];
    }
    toAffine(invZ = invert(this.z)) {
        const invZ2 = invZ ** 2n;
        const x = mod(this.x * invZ2);
        const y = mod(this.y * invZ2 * invZ);
        return new Point(x, y);
    }
}
JacobianPoint.BASE = new JacobianPoint(CURVE.Gx, CURVE.Gy, 1n);
JacobianPoint.ZERO = new JacobianPoint(0n, 1n, 0n);
const pointPrecomputes = new WeakMap();
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    _setWindowSize(windowSize) {
        this._WINDOW_SIZE = windowSize;
        pointPrecomputes.delete(this);
    }
    static fromCompressedHex(bytes) {
        const isShort = bytes.length === 32;
        const x = bytesToNumber(isShort ? bytes : bytes.slice(1));
        const y2 = weistrass(x);
        let y = sqrtMod(y2);
        const isYOdd = (y & 1n) === 1n;
        if (isShort) {
            if (isYOdd)
                y = mod(-y);
        }
        else {
            const isFirstByteOdd = (bytes[0] & 1) === 1;
            if (isFirstByteOdd !== isYOdd)
                y = mod(-y);
        }
        const point = new Point(x, y);
        point.assertValidity();
        return point;
    }
    static fromUncompressedHex(bytes) {
        const x = bytesToNumber(bytes.slice(1, 33));
        const y = bytesToNumber(bytes.slice(33));
        const point = new Point(x, y);
        point.assertValidity();
        return point;
    }
    static fromHex(hex) {
        const bytes = ensureBytes(hex);
        const header = bytes[0];
        if (bytes.length === 32 || (bytes.length === 33 && (header === 0x02 || header === 0x03))) {
            return this.fromCompressedHex(bytes);
        }
        if (bytes.length === 65 && header === 0x04)
            return this.fromUncompressedHex(bytes);
        throw new Error(`Point.fromHex: received invalid point. Expected 32-33 compressed bytes or 65 uncompressed bytes, not ${bytes.length}`);
    }
    static fromPrivateKey(privateKey) {
        return Point.BASE.multiply(normalizePrivateKey(privateKey));
    }
    static fromSignature(msgHash, signature, recovery) {
        let h = msgHash instanceof Uint8Array ? bytesToNumber(msgHash) : hexToNumber(msgHash);
        const sig = normalizeSignature(signature);
        sig.assertValidity();
        const { r, s } = sig;
        if (recovery !== 0 && recovery !== 1) {
            throw new Error('Cannot recover signature: invalid yParity bit');
        }
        const prefix = 2 + (recovery & 1);
        const P_ = Point.fromHex(`0${prefix}${pad64(r)}`);
        const sP = JacobianPoint.fromAffine(P_).multiplyUnsafe(s);
        const hG = JacobianPoint.BASE.multiply(h);
        const rinv = invert(r, CURVE.n);
        const Q = sP.subtract(hG).multiplyUnsafe(rinv);
        const point = Q.toAffine();
        point.assertValidity();
        return point;
    }
    toRawBytes(isCompressed = false) {
        return hexToBytes(this.toHex(isCompressed));
    }
    toHex(isCompressed = false) {
        const x = pad64(this.x);
        if (isCompressed) {
            return `${this.y & 1n ? '03' : '02'}${x}`;
        }
        else {
            return `04${x}${pad64(this.y)}`;
        }
    }
    toHexX() {
        return this.toHex(true).slice(2);
    }
    toRawX() {
        return this.toRawBytes(true).slice(1);
    }
    assertValidity() {
        const msg = 'Point is not on elliptic curve';
        const { P } = CURVE;
        const { x, y } = this;
        if (x === 0n || y === 0n || x >= P || y >= P)
            throw new Error(msg);
        const left = mod(y * y);
        const right = weistrass(x);
        if ((left - right) % P !== 0n)
            throw new Error(msg);
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
    negate() {
        return new Point(this.x, mod(-this.y));
    }
    double() {
        return JacobianPoint.fromAffine(this).double().toAffine();
    }
    add(other) {
        return JacobianPoint.fromAffine(this).add(JacobianPoint.fromAffine(other)).toAffine();
    }
    subtract(other) {
        return this.add(other.negate());
    }
    multiply(scalar) {
        return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
    }
}
exports.Point = Point;
Point.BASE = new Point(CURVE.Gx, CURVE.Gy);
Point.ZERO = new Point(0n, 0n);
function sliceDer(s) {
    return Number.parseInt(s[0], 16) >= 8 ? '00' + s : s;
}
class Signature {
    constructor(r, s) {
        this.r = r;
        this.s = s;
    }
    static fromHex(hex) {
        if (typeof hex !== 'string' && !(hex instanceof Uint8Array)) {
            throw new TypeError(`Signature.fromHex: Expected string or Uint8Array`);
        }
        const str = hex instanceof Uint8Array ? bytesToHex(hex) : hex;
        const length = parseByte(str.slice(2, 4));
        if (str.slice(0, 2) !== '30' || length !== str.length - 4 || str.slice(4, 6) !== '02') {
            throw new Error('Signature.fromHex: Invalid signature');
        }
        const rLen = parseByte(str.slice(6, 8));
        const rEnd = 8 + rLen;
        const rr = str.slice(8, rEnd);
        if (rr.startsWith('00') && parseByte(rr.slice(2, 4)) <= 0x7f) {
            throw new Error('Signature.fromHex: Invalid r with trailing length');
        }
        const r = hexToNumber(rr);
        const separator = str.slice(rEnd, rEnd + 2);
        if (separator !== '02') {
            throw new Error('Signature.fromHex: Invalid r-s separator');
        }
        const sLen = parseByte(str.slice(rEnd + 2, rEnd + 4));
        const diff = length - sLen - rLen - 10;
        if (diff > 0 || diff === -4) {
            throw new Error(`Signature.fromHex: Invalid total length`);
        }
        if (sLen > length - rLen - 4) {
            throw new Error(`Signature.fromHex: Invalid s`);
        }
        const sStart = rEnd + 4;
        const ss = str.slice(sStart, sStart + sLen);
        if (ss.startsWith('00') && parseByte(ss.slice(2, 4)) <= 0x7f) {
            throw new Error(`Signature.fromHex: Invalid s with trailing length`);
        }
        const s = hexToNumber(ss);
        return new Signature(r, s);
    }
    assertValidity() {
        const { r, s } = this;
        if (!isWithinCurveOrder(r))
            throw new Error('Invalid Signature: r must be 0 < r < n');
        if (!isWithinCurveOrder(s))
            throw new Error('Invalid Signature: s must be 0 < s < n');
    }
    toRawBytes(isCompressed = false) {
        return hexToBytes(this.toHex(isCompressed));
    }
    toHex(isCompressed = false) {
        const sHex = sliceDer(numberToHex(this.s));
        if (isCompressed)
            return sHex;
        const rHex = sliceDer(numberToHex(this.r));
        const rLen = numberToHex(rHex.length / 2);
        const sLen = numberToHex(sHex.length / 2);
        const length = numberToHex(rHex.length / 2 + sHex.length / 2 + 4);
        return `30${length}02${rLen}${rHex}02${sLen}${sHex}`;
    }
}
exports.Signature = Signature;
exports.SignResult = Signature;
function concatBytes(...arrays) {
    if (arrays.length === 1)
        return arrays[0];
    const length = arrays.reduce((a, arr) => a + arr.length, 0);
    const result = new Uint8Array(length);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const arr = arrays[i];
        result.set(arr, pad);
        pad += arr.length;
    }
    return result;
}
function bytesToHex(uint8a) {
    let hex = '';
    for (let i = 0; i < uint8a.length; i++) {
        hex += uint8a[i].toString(16).padStart(2, '0');
    }
    return hex;
}
function pad64(num) {
    return num.toString(16).padStart(64, '0');
}
function pad32b(num) {
    return hexToBytes(pad64(num));
}
function numberToHex(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToNumber: expected string, got ' + typeof hex);
    }
    return BigInt(`0x${hex}`);
}
function hexToBytes(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
    }
    if (hex.length % 2)
        throw new Error('hexToBytes: received invalid unpadded hex');
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        array[i] = Number.parseInt(hex.slice(j, j + 2), 16);
    }
    return array;
}
function ensureBytes(hex) {
    return hex instanceof Uint8Array ? hex : hexToBytes(hex);
}
function bytesToNumber(bytes) {
    return hexToNumber(bytesToHex(bytes));
}
function parseByte(str) {
    return Number.parseInt(str, 16) * 2;
}
function isValidScalar(num) {
    if (typeof num === 'bigint' && num > 0n)
        return true;
    if (typeof num === 'number' && num > 0 && Number.isSafeInteger(num))
        return true;
    return false;
}
function mod(a, b = CURVE.P) {
    const result = a % b;
    return result >= 0 ? result : b + result;
}
function pow2(x, power) {
    const { P } = CURVE;
    let res = x;
    while (power-- > 0n) {
        res *= res;
        res %= P;
    }
    return res;
}
function sqrtMod(x) {
    const { P } = CURVE;
    const b2 = (x * x * x) % P;
    const b3 = (b2 * b2 * x) % P;
    const b6 = (pow2(b3, 3n) * b3) % P;
    const b9 = (pow2(b6, 3n) * b3) % P;
    const b11 = (pow2(b9, 2n) * b2) % P;
    const b22 = (pow2(b11, 11n) * b11) % P;
    const b44 = (pow2(b22, 22n) * b22) % P;
    const b88 = (pow2(b44, 44n) * b44) % P;
    const b176 = (pow2(b88, 88n) * b88) % P;
    const b220 = (pow2(b176, 44n) * b44) % P;
    const b223 = (pow2(b220, 3n) * b3) % P;
    const t1 = (pow2(b223, 23n) * b22) % P;
    const t2 = (pow2(t1, 6n) * b2) % P;
    return pow2(t2, 2n);
}
function invert(number, modulo = CURVE.P) {
    if (number === 0n || modulo <= 0n) {
        throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    let a = mod(number, modulo);
    let b = modulo;
    let [x, y, u, v] = [0n, 1n, 1n, 0n];
    while (a !== 0n) {
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;
        [b, a] = [a, r];
        [x, y] = [u, v];
        [u, v] = [m, n];
    }
    const gcd = b;
    if (gcd !== 1n)
        throw new Error('invert: does not exist');
    return mod(x, modulo);
}
function invertBatch(nums, n = CURVE.P) {
    const len = nums.length;
    const scratch = new Array(len);
    let acc = 1n;
    for (let i = 0; i < len; i++) {
        if (nums[i] === 0n)
            continue;
        scratch[i] = acc;
        acc = mod(acc * nums[i], n);
    }
    acc = invert(acc, n);
    for (let i = len - 1; i >= 0; i--) {
        if (nums[i] === 0n)
            continue;
        const tmp = mod(acc * nums[i], n);
        nums[i] = mod(acc * scratch[i], n);
        acc = tmp;
    }
    return nums;
}
const divNearest = (a, b) => (a + b / 2n) / b;
const POW_2_128 = 2n ** 128n;
function splitScalarEndo(k) {
    const { n } = CURVE;
    const a1 = 0x3086d221a7d46bcde86c90e49284eb15n;
    const b1 = -0xe4437ed6010e88286f547fa90abfe4c3n;
    const a2 = 0x114ca50f7a8e2f3f657c1108d9d44cfd8n;
    const b2 = a1;
    const c1 = divNearest(b2 * k, n);
    const c2 = divNearest(-b1 * k, n);
    let k1 = mod(k - c1 * a1 - c2 * a2, n);
    let k2 = mod(-c1 * b1 - c2 * b2, n);
    const k1neg = k1 > POW_2_128;
    const k2neg = k2 > POW_2_128;
    if (k1neg)
        k1 = n - k1;
    if (k2neg)
        k2 = n - k2;
    if (k1 > POW_2_128 || k2 > POW_2_128)
        throw new Error('splitScalarEndo: Endomorphism failed');
    return [k1neg, k1, k2neg, k2];
}
function truncateHash(hash) {
    if (typeof hash !== 'string')
        hash = bytesToHex(hash);
    let msg = hexToNumber(hash || '0');
    const byteLength = hash.length / 2;
    const delta = byteLength * 8 - 256;
    if (delta > 0) {
        msg = msg >> BigInt(delta);
    }
    if (msg >= CURVE.n) {
        msg -= CURVE.n;
    }
    return msg;
}
async function getQRSrfc6979(msgHash, privateKey) {
    const num = typeof msgHash === 'string' ? hexToNumber(msgHash) : bytesToNumber(msgHash);
    const h1 = pad32b(num);
    const x = pad32b(privateKey);
    const h1n = bytesToNumber(h1);
    let v = new Uint8Array(32).fill(1);
    let k = new Uint8Array(32).fill(0);
    const b0 = Uint8Array.from([0x00]);
    const b1 = Uint8Array.from([0x01]);
    k = await exports.utils.hmacSha256(k, v, b0, x, h1);
    v = await exports.utils.hmacSha256(k, v);
    k = await exports.utils.hmacSha256(k, v, b1, x, h1);
    v = await exports.utils.hmacSha256(k, v);
    for (let i = 0; i < 1000; i++) {
        v = await exports.utils.hmacSha256(k, v);
        const T = bytesToNumber(v);
        let qrs;
        if (isWithinCurveOrder(T) && (qrs = calcQRSFromK(T, h1n, privateKey))) {
            return qrs;
        }
        k = await exports.utils.hmacSha256(k, v, b0);
        v = await exports.utils.hmacSha256(k, v);
    }
    throw new TypeError('secp256k1: Tried 1,000 k values for sign(), all were invalid');
}
function isWithinCurveOrder(num) {
    return 0 < num && num < CURVE.n;
}
function calcQRSFromK(k, msg, priv) {
    const max = CURVE.n;
    const q = Point.BASE.multiply(k);
    const r = mod(q.x, max);
    const s = mod(invert(k, max) * (msg + r * priv), max);
    if (r === 0n || s === 0n)
        return;
    return [q, r, s];
}
function normalizePrivateKey(key) {
    let num;
    if (typeof key === 'bigint') {
        num = key;
    }
    else if (Number.isSafeInteger(key) && key > 0) {
        num = BigInt(key);
    }
    else if (typeof key === 'string') {
        if (key.length !== 64)
            throw new Error('Expected 32 bytes of private key');
        num = hexToNumber(key);
    }
    else if (key instanceof Uint8Array) {
        if (key.length !== 32)
            throw new Error('Expected 32 bytes of private key');
        num = bytesToNumber(key);
    }
    else {
        throw new TypeError('Expected valid private key');
    }
    if (!isWithinCurveOrder(num))
        throw new Error('Expected private key: 0 < key < n');
    return num;
}
function normalizePublicKey(publicKey) {
    return publicKey instanceof Point ? publicKey : Point.fromHex(publicKey);
}
function normalizeSignature(signature) {
    return signature instanceof Signature ? signature : Signature.fromHex(signature);
}
function getPublicKey(privateKey, isCompressed = false) {
    const point = Point.fromPrivateKey(privateKey);
    if (typeof privateKey === 'string') {
        return point.toHex(isCompressed);
    }
    return point.toRawBytes(isCompressed);
}
exports.getPublicKey = getPublicKey;
function recoverPublicKey(msgHash, signature, recovery) {
    const point = Point.fromSignature(msgHash, signature, recovery);
    return typeof msgHash === 'string' ? point.toHex() : point.toRawBytes();
}
exports.recoverPublicKey = recoverPublicKey;
function isPub(item) {
    const arr = item instanceof Uint8Array;
    const str = typeof item === 'string';
    const len = (arr || str) && item.length;
    if (arr)
        return len === 33 || len === 65;
    if (str)
        return len === 66 || len === 130;
    if (item instanceof Point)
        return true;
    return false;
}
function getSharedSecret(privateA, publicB, isCompressed = false) {
    if (isPub(privateA))
        throw new TypeError('getSharedSecret: first arg must be private key');
    if (!isPub(publicB))
        throw new TypeError('getSharedSecret: second arg must be public key');
    const b = normalizePublicKey(publicB);
    b.assertValidity();
    const shared = b.multiply(normalizePrivateKey(privateA));
    return typeof privateA === 'string'
        ? shared.toHex(isCompressed)
        : shared.toRawBytes(isCompressed);
}
exports.getSharedSecret = getSharedSecret;
async function sign(msgHash, privateKey, { recovered, canonical } = {}) {
    if (msgHash == null)
        throw new Error(`sign: expected valid msgHash, not "${msgHash}"`);
    const priv = normalizePrivateKey(privateKey);
    const [q, r, s] = await getQRSrfc6979(msgHash, priv);
    let recovery = (q.x === r ? 0 : 2) | Number(q.y & 1n);
    let adjustedS = s;
    const HIGH_NUMBER = CURVE.n >> 1n;
    if (s > HIGH_NUMBER && canonical) {
        adjustedS = CURVE.n - s;
        recovery ^= 1;
    }
    const sig = new Signature(r, adjustedS);
    const hashed = typeof msgHash === 'string' ? sig.toHex() : sig.toRawBytes();
    return recovered ? [hashed, recovery] : hashed;
}
exports.sign = sign;
function verify(signature, msgHash, publicKey) {
    const { n } = CURVE;
    const sig = normalizeSignature(signature);
    try {
        sig.assertValidity();
    }
    catch (error) {
        return false;
    }
    const { r, s } = sig;
    const h = truncateHash(msgHash);
    if (h === 0n)
        return false;
    const pubKey = JacobianPoint.fromAffine(normalizePublicKey(publicKey));
    const s1 = invert(s, n);
    const u1 = mod(h * s1, n);
    const u2 = mod(r * s1, n);
    const Ghs1 = JacobianPoint.BASE.multiply(u1);
    const Prs1 = pubKey.multiplyUnsafe(u2);
    const R = Ghs1.add(Prs1).toAffine();
    const v = mod(R.x, n);
    return v === r;
}
exports.verify = verify;
async function taggedHash(tag, ...messages) {
    const tagB = new Uint8Array(tag.split('').map((c) => c.charCodeAt(0)));
    const tagH = await exports.utils.sha256(tagB);
    const h = await exports.utils.sha256(concatBytes(tagH, tagH, ...messages));
    return bytesToNumber(h);
}
async function createChallenge(x, P, message) {
    const rx = pad32b(x);
    const t = await taggedHash('BIP0340/challenge', rx, P.toRawX(), message);
    return mod(t, CURVE.n);
}
function hasEvenY(point) {
    return mod(point.y, 2n) === 0n;
}
class SchnorrSignature {
    constructor(r, s) {
        this.r = r;
        this.s = s;
        if (r === 0n || s === 0n || r >= CURVE.P || s >= CURVE.n)
            throw new Error('Invalid signature');
    }
    static fromHex(hex) {
        const bytes = ensureBytes(hex);
        if (bytes.length !== 64) {
            throw new TypeError(`SchnorrSignature.fromHex: expected 64 bytes, not ${bytes.length}`);
        }
        const r = bytesToNumber(bytes.slice(0, 32));
        const s = bytesToNumber(bytes.slice(32));
        return new SchnorrSignature(r, s);
    }
    toHex() {
        return pad64(this.r) + pad64(this.s);
    }
    toRawBytes() {
        return hexToBytes(this.toHex());
    }
}
function schnorrGetPublicKey(privateKey) {
    const P = Point.fromPrivateKey(privateKey);
    return typeof privateKey === 'string' ? P.toHexX() : P.toRawX();
}
async function schnorrSign(msgHash, privateKey, auxRand = exports.utils.randomBytes()) {
    if (msgHash == null)
        throw new TypeError(`sign: Expected valid message, not "${msgHash}"`);
    if (!privateKey)
        privateKey = 0n;
    const { n } = CURVE;
    const m = ensureBytes(msgHash);
    const d0 = normalizePrivateKey(privateKey);
    const rand = ensureBytes(auxRand);
    if (rand.length !== 32)
        throw new TypeError('sign: Expected 32 bytes of aux randomness');
    const P = Point.fromPrivateKey(d0);
    const d = hasEvenY(P) ? d0 : n - d0;
    const t0h = await taggedHash('BIP0340/aux', rand);
    const t = d ^ t0h;
    const k0h = await taggedHash('BIP0340/nonce', pad32b(t), P.toRawX(), m);
    const k0 = mod(k0h, n);
    if (k0 === 0n)
        throw new Error('sign: Creation of signature failed. k is zero');
    const R = Point.fromPrivateKey(k0);
    const k = hasEvenY(R) ? k0 : n - k0;
    const e = await createChallenge(R.x, P, m);
    const sig = new SchnorrSignature(R.x, mod(k + e * d, n));
    const isValid = await schnorrVerify(sig.toRawBytes(), m, P.toRawX());
    if (!isValid)
        throw new Error('sign: Invalid signature produced');
    return typeof msgHash === 'string' ? sig.toHex() : sig.toRawBytes();
}
async function schnorrVerify(signature, msgHash, publicKey) {
    const sig = signature instanceof SchnorrSignature ? signature : SchnorrSignature.fromHex(signature);
    const m = typeof msgHash === 'string' ? hexToBytes(msgHash) : msgHash;
    const P = normalizePublicKey(publicKey);
    const e = await createChallenge(sig.r, P, m);
    const sG = Point.fromPrivateKey(sig.s);
    const eP = P.multiply(e);
    const R = sG.subtract(eP);
    if (R.equals(Point.BASE) || !hasEvenY(R) || R.x !== sig.r)
        return false;
    return true;
}
exports.schnorr = {
    Signature: SchnorrSignature,
    getPublicKey: schnorrGetPublicKey,
    sign: schnorrSign,
    verify: schnorrVerify,
};
Point.BASE._setWindowSize(8);
exports.utils = {
    isValidPrivateKey(privateKey) {
        try {
            normalizePrivateKey(privateKey);
            return true;
        }
        catch (error) {
            return false;
        }
    },
    randomBytes: (bytesLength = 32) => {
        if (typeof window == 'object' && 'crypto' in window) {
            return window.crypto.getRandomValues(new Uint8Array(bytesLength));
        }
        else if (typeof process === 'object' && 'node' in process.versions) {
            const { randomBytes } = require$$0;
            return new Uint8Array(randomBytes(bytesLength).buffer);
        }
        else {
            throw new Error("The environment doesn't have randomBytes function");
        }
    },
    randomPrivateKey: () => {
        let i = 8;
        while (i--) {
            const b32 = exports.utils.randomBytes(32);
            const num = bytesToNumber(b32);
            if (num > 1n && num < CURVE.n)
                return b32;
        }
        throw new Error('Valid private key was not found in 8 iterations. PRNG is broken');
    },
    sha256: async (message) => {
        if (typeof window == 'object' && 'crypto' in window) {
            const buffer = await window.crypto.subtle.digest('SHA-256', message.buffer);
            return new Uint8Array(buffer);
        }
        else if (typeof process === 'object' && 'node' in process.versions) {
            const { createHash } = require$$0;
            return Uint8Array.from(createHash('sha256').update(message).digest());
        }
        else {
            throw new Error("The environment doesn't have sha256 function");
        }
    },
    hmacSha256: async (key, ...messages) => {
        if (typeof window == 'object' && 'crypto' in window) {
            const ckey = await window.crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign']);
            const message = concatBytes(...messages);
            const buffer = await window.crypto.subtle.sign('HMAC', ckey, message);
            return new Uint8Array(buffer);
        }
        else if (typeof process === 'object' && 'node' in process.versions) {
            const { createHmac } = require$$0;
            const hash = createHmac('sha256', key);
            for (let message of messages) {
                hash.update(message);
            }
            return Uint8Array.from(hash.digest());
        }
        else {
            throw new Error("The environment doesn't have hmac-sha256 function");
        }
    },
    precompute(windowSize = 8, point = Point.BASE) {
        const cached = point === Point.BASE ? point : new Point(point.x, point.y);
        cached._setWindowSize(windowSize);
        cached.multiply(3n);
        return cached;
    },
};
}(nobleSecp256k1));

var secp = /*@__PURE__*/getDefaultExportFromCjs(nobleSecp256k1);

function privateToPublic (_privateKey) {
  const privateKey = bufferify(_privateKey);

  return secp.getPublicKey(privateKey, false).slice(1);
}

async function ecsign (msgHash, privateKey, chainId) {
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
}
function ecrecover (msgHash, v, r, s, chainId) {
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

// adapted from

function encodeLength (len, offset) {
  if (len < 56) {
    return [len + offset];
  } else {
    const hexLength = arrayify(len);
    const lLength = hexLength.length;
    const firstByte = arrayify(offset + 55 + lLength);

    return firstByte.concat(hexLength);
  }
}

// this doesn't support a complete RLP encoding,
// inner lists are not supported
function encode (input) {
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
      ret = ret.concat(inputBuf);
    } else {
      ret = ret.concat(encodeLength(inputBuf.length, 128)).concat(inputBuf);
    }
  }

  return encodeLength(ret.length, 192).concat(ret);
}

// adapted from https://github.com/cryptocoinjs/keccak.git

const P1600_ROUND_CONSTANTS = [
  1,
  0,
  32898,
  0,
  32906,
  2147483648,
  2147516416,
  2147483648,
  32907,
  0,
  2147483649,
  0,
  2147516545,
  2147483648,
  32777,
  2147483648,
  138,
  0,
  136,
  0,
  2147516425,
  0,
  2147483658,
  0,
  2147516555,
  0,
  139,
  2147483648,
  32905,
  2147483648,
  32771,
  2147483648,
  32770,
  2147483648,
  128,
  2147483648,
  32778,
  0,
  2147483658,
  2147483648,
  2147516545,
  2147483648,
  32896,
  2147483648,
  2147483649,
  0,
  2147516424,
  2147483648,
];

function p1600 (s) {
  for (let round = 0; round < 24; ++round) {
    // theta
    const lo0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
    const hi0 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
    const lo1 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
    const hi1 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
    const lo2 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
    const hi2 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
    const lo3 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
    const hi3 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
    const lo4 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
    const hi4 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

    let lo = lo4 ^ (lo1 << 1 | hi1 >>> 31);
    let hi = hi4 ^ (hi1 << 1 | lo1 >>> 31);
    const t1slo0 = s[0] ^ lo;
    const t1shi0 = s[1] ^ hi;
    const t1slo5 = s[10] ^ lo;
    const t1shi5 = s[11] ^ hi;
    const t1slo10 = s[20] ^ lo;
    const t1shi10 = s[21] ^ hi;
    const t1slo15 = s[30] ^ lo;
    const t1shi15 = s[31] ^ hi;
    const t1slo20 = s[40] ^ lo;
    const t1shi20 = s[41] ^ hi;
    lo = lo0 ^ (lo2 << 1 | hi2 >>> 31);
    hi = hi0 ^ (hi2 << 1 | lo2 >>> 31);
    const t1slo1 = s[2] ^ lo;
    const t1shi1 = s[3] ^ hi;
    const t1slo6 = s[12] ^ lo;
    const t1shi6 = s[13] ^ hi;
    const t1slo11 = s[22] ^ lo;
    const t1shi11 = s[23] ^ hi;
    const t1slo16 = s[32] ^ lo;
    const t1shi16 = s[33] ^ hi;
    const t1slo21 = s[42] ^ lo;
    const t1shi21 = s[43] ^ hi;
    lo = lo1 ^ (lo3 << 1 | hi3 >>> 31);
    hi = hi1 ^ (hi3 << 1 | lo3 >>> 31);
    const t1slo2 = s[4] ^ lo;
    const t1shi2 = s[5] ^ hi;
    const t1slo7 = s[14] ^ lo;
    const t1shi7 = s[15] ^ hi;
    const t1slo12 = s[24] ^ lo;
    const t1shi12 = s[25] ^ hi;
    const t1slo17 = s[34] ^ lo;
    const t1shi17 = s[35] ^ hi;
    const t1slo22 = s[44] ^ lo;
    const t1shi22 = s[45] ^ hi;
    lo = lo2 ^ (lo4 << 1 | hi4 >>> 31);
    hi = hi2 ^ (hi4 << 1 | lo4 >>> 31);
    const t1slo3 = s[6] ^ lo;
    const t1shi3 = s[7] ^ hi;
    const t1slo8 = s[16] ^ lo;
    const t1shi8 = s[17] ^ hi;
    const t1slo13 = s[26] ^ lo;
    const t1shi13 = s[27] ^ hi;
    const t1slo18 = s[36] ^ lo;
    const t1shi18 = s[37] ^ hi;
    const t1slo23 = s[46] ^ lo;
    const t1shi23 = s[47] ^ hi;
    lo = lo3 ^ (lo0 << 1 | hi0 >>> 31);
    hi = hi3 ^ (hi0 << 1 | lo0 >>> 31);
    const t1slo4 = s[8] ^ lo;
    const t1shi4 = s[9] ^ hi;
    const t1slo9 = s[18] ^ lo;
    const t1shi9 = s[19] ^ hi;
    const t1slo14 = s[28] ^ lo;
    const t1shi14 = s[29] ^ hi;
    const t1slo19 = s[38] ^ lo;
    const t1shi19 = s[39] ^ hi;
    const t1slo24 = s[48] ^ lo;
    const t1shi24 = s[49] ^ hi;

    // rho & pi
    const t2slo0 = t1slo0;
    const t2shi0 = t1shi0;
    const t2slo16 = (t1shi5 << 4 | t1slo5 >>> 28);
    const t2shi16 = (t1slo5 << 4 | t1shi5 >>> 28);
    const t2slo7 = (t1slo10 << 3 | t1shi10 >>> 29);
    const t2shi7 = (t1shi10 << 3 | t1slo10 >>> 29);
    const t2slo23 = (t1shi15 << 9 | t1slo15 >>> 23);
    const t2shi23 = (t1slo15 << 9 | t1shi15 >>> 23);
    const t2slo14 = (t1slo20 << 18 | t1shi20 >>> 14);
    const t2shi14 = (t1shi20 << 18 | t1slo20 >>> 14);
    const t2slo10 = (t1slo1 << 1 | t1shi1 >>> 31);
    const t2shi10 = (t1shi1 << 1 | t1slo1 >>> 31);
    const t2slo1 = (t1shi6 << 12 | t1slo6 >>> 20);
    const t2shi1 = (t1slo6 << 12 | t1shi6 >>> 20);
    const t2slo17 = (t1slo11 << 10 | t1shi11 >>> 22);
    const t2shi17 = (t1shi11 << 10 | t1slo11 >>> 22);
    const t2slo8 = (t1shi16 << 13 | t1slo16 >>> 19);
    const t2shi8 = (t1slo16 << 13 | t1shi16 >>> 19);
    const t2slo24 = (t1slo21 << 2 | t1shi21 >>> 30);
    const t2shi24 = (t1shi21 << 2 | t1slo21 >>> 30);
    const t2slo20 = (t1shi2 << 30 | t1slo2 >>> 2);
    const t2shi20 = (t1slo2 << 30 | t1shi2 >>> 2);
    const t2slo11 = (t1slo7 << 6 | t1shi7 >>> 26);
    const t2shi11 = (t1shi7 << 6 | t1slo7 >>> 26);
    const t2slo2 = (t1shi12 << 11 | t1slo12 >>> 21);
    const t2shi2 = (t1slo12 << 11 | t1shi12 >>> 21);
    const t2slo18 = (t1slo17 << 15 | t1shi17 >>> 17);
    const t2shi18 = (t1shi17 << 15 | t1slo17 >>> 17);
    const t2slo9 = (t1shi22 << 29 | t1slo22 >>> 3);
    const t2shi9 = (t1slo22 << 29 | t1shi22 >>> 3);
    const t2slo5 = (t1slo3 << 28 | t1shi3 >>> 4);
    const t2shi5 = (t1shi3 << 28 | t1slo3 >>> 4);
    const t2slo21 = (t1shi8 << 23 | t1slo8 >>> 9);
    const t2shi21 = (t1slo8 << 23 | t1shi8 >>> 9);
    const t2slo12 = (t1slo13 << 25 | t1shi13 >>> 7);
    const t2shi12 = (t1shi13 << 25 | t1slo13 >>> 7);
    const t2slo3 = (t1slo18 << 21 | t1shi18 >>> 11);
    const t2shi3 = (t1shi18 << 21 | t1slo18 >>> 11);
    const t2slo19 = (t1shi23 << 24 | t1slo23 >>> 8);
    const t2shi19 = (t1slo23 << 24 | t1shi23 >>> 8);
    const t2slo15 = (t1slo4 << 27 | t1shi4 >>> 5);
    const t2shi15 = (t1shi4 << 27 | t1slo4 >>> 5);
    const t2slo6 = (t1slo9 << 20 | t1shi9 >>> 12);
    const t2shi6 = (t1shi9 << 20 | t1slo9 >>> 12);
    const t2slo22 = (t1shi14 << 7 | t1slo14 >>> 25);
    const t2shi22 = (t1slo14 << 7 | t1shi14 >>> 25);
    const t2slo13 = (t1slo19 << 8 | t1shi19 >>> 24);
    const t2shi13 = (t1shi19 << 8 | t1slo19 >>> 24);
    const t2slo4 = (t1slo24 << 14 | t1shi24 >>> 18);
    const t2shi4 = (t1shi24 << 14 | t1slo24 >>> 18);

    // chi
    s[0] = t2slo0 ^ (~t2slo1 & t2slo2);
    s[1] = t2shi0 ^ (~t2shi1 & t2shi2);
    s[10] = t2slo5 ^ (~t2slo6 & t2slo7);
    s[11] = t2shi5 ^ (~t2shi6 & t2shi7);
    s[20] = t2slo10 ^ (~t2slo11 & t2slo12);
    s[21] = t2shi10 ^ (~t2shi11 & t2shi12);
    s[30] = t2slo15 ^ (~t2slo16 & t2slo17);
    s[31] = t2shi15 ^ (~t2shi16 & t2shi17);
    s[40] = t2slo20 ^ (~t2slo21 & t2slo22);
    s[41] = t2shi20 ^ (~t2shi21 & t2shi22);
    s[2] = t2slo1 ^ (~t2slo2 & t2slo3);
    s[3] = t2shi1 ^ (~t2shi2 & t2shi3);
    s[12] = t2slo6 ^ (~t2slo7 & t2slo8);
    s[13] = t2shi6 ^ (~t2shi7 & t2shi8);
    s[22] = t2slo11 ^ (~t2slo12 & t2slo13);
    s[23] = t2shi11 ^ (~t2shi12 & t2shi13);
    s[32] = t2slo16 ^ (~t2slo17 & t2slo18);
    s[33] = t2shi16 ^ (~t2shi17 & t2shi18);
    s[42] = t2slo21 ^ (~t2slo22 & t2slo23);
    s[43] = t2shi21 ^ (~t2shi22 & t2shi23);
    s[4] = t2slo2 ^ (~t2slo3 & t2slo4);
    s[5] = t2shi2 ^ (~t2shi3 & t2shi4);
    s[14] = t2slo7 ^ (~t2slo8 & t2slo9);
    s[15] = t2shi7 ^ (~t2shi8 & t2shi9);
    s[24] = t2slo12 ^ (~t2slo13 & t2slo14);
    s[25] = t2shi12 ^ (~t2shi13 & t2shi14);
    s[34] = t2slo17 ^ (~t2slo18 & t2slo19);
    s[35] = t2shi17 ^ (~t2shi18 & t2shi19);
    s[44] = t2slo22 ^ (~t2slo23 & t2slo24);
    s[45] = t2shi22 ^ (~t2shi23 & t2shi24);
    s[6] = t2slo3 ^ (~t2slo4 & t2slo0);
    s[7] = t2shi3 ^ (~t2shi4 & t2shi0);
    s[16] = t2slo8 ^ (~t2slo9 & t2slo5);
    s[17] = t2shi8 ^ (~t2shi9 & t2shi5);
    s[26] = t2slo13 ^ (~t2slo14 & t2slo10);
    s[27] = t2shi13 ^ (~t2shi14 & t2shi10);
    s[36] = t2slo18 ^ (~t2slo19 & t2slo15);
    s[37] = t2shi18 ^ (~t2shi19 & t2shi15);
    s[46] = t2slo23 ^ (~t2slo24 & t2slo20);
    s[47] = t2shi23 ^ (~t2shi24 & t2shi20);
    s[8] = t2slo4 ^ (~t2slo0 & t2slo1);
    s[9] = t2shi4 ^ (~t2shi0 & t2shi1);
    s[18] = t2slo9 ^ (~t2slo5 & t2slo6);
    s[19] = t2shi9 ^ (~t2shi5 & t2shi6);
    s[28] = t2slo14 ^ (~t2slo10 & t2slo11);
    s[29] = t2shi14 ^ (~t2shi10 & t2shi11);
    s[38] = t2slo19 ^ (~t2slo15 & t2slo16);
    s[39] = t2shi19 ^ (~t2shi15 & t2shi16);
    s[48] = t2slo24 ^ (~t2slo20 & t2slo21);
    s[49] = t2shi24 ^ (~t2shi20 & t2shi21);

    // iota
    s[0] ^= P1600_ROUND_CONSTANTS[round * 2];
    s[1] ^= P1600_ROUND_CONSTANTS[round * 2 + 1];
  }
}

const BIG_8 = BigInt(8);
const BIG_255 = BigInt(255);
const BIG_256 = BigInt(256);

class Keccak256 {
  constructor () {
    this.state = new Uint32Array(50);

    // 1088 / 8
    this.blockSize = 136;
    this.count = 0;
    this.squeezing = false;
  }

  updateBigInt (n, byteLen) {
    let m = BigInt(byteLen * 8);

    for (let i = 0; i < byteLen; i++) {
      const val = Number((n >> (m -= BIG_8)) & BIG_255);

      this.state[~~(this.count / 4)] ^= val << (8 * (this.count % 4));
      this.count += 1;

      if (this.count === this.blockSize) {
        p1600(this.state);
        this.count = 0;
      }
    }

    return this;
  }

  update (data) {
    const len = data.length;

    if (typeof data === 'string') {
      let i = data.startsWith('0x') ? 2 : 0;

      for (; i < len; i += 2) {
        const val = parseInt(data.substring(i, i + 2), 16);

        this.state[~~(this.count / 4)] ^= val << (8 * (this.count % 4));
        this.count += 1;

        if (this.count === this.blockSize) {
          p1600(this.state);
          this.count = 0;
        }
      }

      return this;
    }

    for (let i = 0; i < len; i++) {
      const val = data[i];

      this.state[~~(this.count / 4)] ^= val << (8 * (this.count % 4));
      this.count += 1;

      if (this.count === this.blockSize) {
        p1600(this.state);
        this.count = 0;
      }
    }

    return this;
  }

  *drain () {
    if (!this.squeezing) {
      const bits = 0x01;

      this.state[~~(this.count / 4)] ^= bits << (8 * (this.count % 4));
      this.state[~~((this.blockSize - 1) / 4)] ^= 0x80 << (8 * ((this.blockSize - 1) % 4));

      p1600(this.state);

      this.count = 0;
      this.squeezing = true;
    }

    for (let i = 0; i < 32; ++i) {
      const val = (this.state[~~(this.count / 4)] >>> (8 * (this.count % 4))) & 0xff;

      yield val;

      this.count += 1;
      if (this.count === this.blockSize) {
        p1600(this.state);
        this.count = 0;
      }
    }
  }

  digest () {
    let output = '';

    for (const val of this.drain()) {
      output += val.toString(16).padStart(2, '0');
    }

    return output;
  }

  digestArray () {
    const output = Array(32);

    let i = 0;
    for (const val of this.drain()) {
      output[i++] = val;
    }

    return output;
  }

  digestBigInt () {
    let output = BigInt(0);
    let i = BIG_256;

    for (const val of this.drain()) {
      output |= BigInt(val) << (i -= BIG_8);
    }

    return output;
  }

  reset () {
    this.state.fill(0);

    this.count = 0;
    this.squeezing = false;

    return this;
  }
}

const keccak$1 = new Keccak256();

function stripZeros (v) {
  if (v.length === 0) {
    return v;
  }

  let start = 0;

  while (v[start] === 0) {
    start++;
  }

  return v.slice(start);
}

// https://eips.ethereum.org/EIPS/eip-2930
async function signRlpTransaction (txObj, privKeyBuf, chainId) {
  const nonce = Number(txObj.nonce) || '0x';
  const gasPrice = txObj.gasPrice || '0x';
  const gasLimit = txObj.gas || '0x';
  let accessList = [];

  if (txObj.accessList) {
    for (const obj of txObj.accessList) {
      accessList.push([obj.address, obj.storageKeys || []]);
    }
  }

  const to = txObj.to;
  const value = txObj.value || '0x';
  const data = bufferify(txObj.data);
  const tmp = [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList];

  const unsigned = [1].concat(encode(tmp));
  const unsignedHash = keccak$1.reset().update(unsigned).digestArray();
  const { v, r, s } = await ecsign(unsignedHash, privKeyBuf);
  const signed = [1].concat(encode(
    [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, stripZeros(r), stripZeros(s)]
  ));
  const rawTxHex = bufToHex(signed, 0, signed.length);
  const txHash = `0x${keccak$1.reset().update(signed).digest()}`;

  return { txHash, rawTxHex };
}

function recoverAddress (msg, v, r, s, chainId) {
  const from =
    '0x' +
    keccak$1.reset().update(
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

function keccak256 (array) {
  return keccak$1.reset().update(array).digestArray();
}

function keccak256HexPrefix (array) {
  return `0x${keccak$1.reset().update(array).digest()}`;
}

function publicToAddress (_pubKey) {
  const pubKey = bufferify(_pubKey);

  if (pubKey.length !== 64) {
    throw new Error('pubKey.length !== 64');
  }

  return keccak256(pubKey).slice(-20);
}

function privateToAddress (privateKey) {
  return publicToAddress(privateToPublic(privateKey));
}

function timeLog (...args) {
  const now = Date.now();
  const delta = now - (globalThis._timeLogLast || now);

  console.log(`+${delta} ms`, ...args);

  globalThis._timeLogLast = now;
}

function formatObject (obj) {
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

function maybeDecodeError (hexStr) {
  const ERROR_SIG = '0x08c379a0';

  if (hexStr && hexStr.startsWith(ERROR_SIG)) {
    const strLen = Number('0x' + hexStr.substring(74, 138)) & 0xffff;
    // strip the first 68 bytes (136 + 2 for 0x)
    const buf = bufferify(hexStr.substring(138, 138 + (strLen * 2)));
    return (new TextDecoder()).decode(buf);
  }

  return '';
}

const BIG_ZERO$7 = BigInt(0);
const BIG_ONE$5 = BigInt(1);
const ZERO_HASH$3 = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ADDRESS_ZERO$1 = '0x0000000000000000000000000000000000000000';

function slicePadEnd (buf, start, end) {
  const ret = buf.slice(start, end);
  const padding = (end - start) - ret.length;

  if (padding !== 0) {
    return buf.concat(new Array(padding).fill(0));
  }

  return ret;
}

// TODO
// This needs to be rebased
class Block$1 {
  decodeTransactionLength (buf, offset, bridge) {
    return 1;
  }

  encodeTx (tx, bridge) {
    return '0xff';
  }

  decodeTx (rawStringOrArray, bridge) {
    return { from: ADDRESS_ZERO$1, to: ADDRESS_ZERO$1, hash: ZERO_HASH$3, nonce: BIG_ZERO$7 };
  }

  async executeTx (tx, bridge, dry) {
    return { errno: 0, returnValue: '0x', logs: [] };
  }

  toRaw (bridge) {
    if (this._raw) {
      return this._raw;
    }

    let ret = '0x' + packString([this.number, this.blockType, this.timestamp], [32, 32, 32]);

    for (const tx of this.transactions) {
      ret += this.encodeTx(tx, bridge).replace('0x', '');
    }

    return ret;
  }

  async fromBeacon (data, rootBlock, bridge) {
    this.blockType = 2;
    this._raw = '0x' + packString([this.number, this.blockType, Number(rootBlock.timestamp), data], [32, 32, 32, 0]);
    this.hash = keccak256HexPrefix(this._raw);
    this.timestamp = Number(rootBlock.timestamp);

    this.log(`new Block ${this.number}/${this.hash}`);

    const buf = arrayify(this._raw);
    const bufLength = buf.length;
    // skip block header
    let offset = 96;

    while (offset < bufLength) {
      try {
        const txLen = this.decodeTransactionLength(buf, offset, bridge);
        const txOffset = offset;
        const rawTx = buf.slice(offset, offset += txLen);

        try {
          this.txOffsets[txOffset] = await this.addTransaction(rawTx, bridge, true);
        } catch (e) {
          this.log('informative', e);
        }
      } catch (e) {
        this.log('TODO - proper tx parsing', e);
      }
    }

    this.log('Done');
  }

  async fromCustomBeacon (data, rootBlock, bridge) {
    this.blockType = 3;
    this._raw = '0x' + packString([this.number, this.blockType, Number(rootBlock.timestamp), data], [32, 32, 32, 0]);
    this.hash = keccak256HexPrefix(this._raw);
    this.timestamp = Number(rootBlock.timestamp);

    this.log(`new Custom-Block ${this.number}/${this.hash}`);

    try {
      // block header
      const txOffset = 96;
      this.txOffsets[txOffset] = await this.addCustomMessage('0x' + data, bridge);
    } catch (e) {
      this.log('fromCustomBeacon', e);
    }
  }

  async onDeposit (data, rootBlock, bridge) {
    this.blockType = 1;
    this.timestamp = Number(rootBlock.timestamp);
    this.isDepositBlock = true;

    this._raw = '0x' + packString([this.number, this.blockType, this.timestamp, data], [32, 32, 32, 0]);
    this.hash = keccak256HexPrefix(this._raw);

    this.log(`new Deposit-Block ${this.number}/${this.hash}`);

    const buf = arrayify(this._raw);
    const bufLength = buf.length;
    // skip block header
    let offset = 96;
    while (offset < bufLength) {
      try {
        const txOffset = offset;
        const owner = toHexPrefix(slicePadEnd(buf, offset, offset += 20));
        const token = toHexPrefix(slicePadEnd(buf, offset, offset += 20));
        const value = toHexPrefix(slicePadEnd(buf, offset, offset += 32));
        const tokenType = toHexPrefix(slicePadEnd(buf, offset, offset += 32));

        this.txOffsets[txOffset] = await this.addDeposit({ owner, token, value, tokenType }, bridge);
      } catch (e) {
        this.log('onDeposit', e);
      }
    }

    this.log('Done');
  }

  constructor (prevBlock) {
    // previous block - if applicable
    this.prevBlock = prevBlock;
    // the blockHash - non-zero if this block was submitted to the Bridge.
    this.hash = ZERO_HASH$3;
    // the blockNumber
    this.number = prevBlock ? prevBlock.number + BIG_ONE$5 : BIG_ONE$5;
    // the timestamp (from the L1 block)
    this.timestamp = prevBlock ? prevBlock.timestamp : 0;
    // address > nonce mapping
    this.nonces = {};
    // ordered list of transactions in this Block
    this.transactions = [];
    this.isDepositBlock = false;
    this.submissionDeadline = 0;
    this.txOffsets = {};
    this.blockType = 0;

    this._barrier = null;

    if (prevBlock) {
      // copy nonces since `prevBlock`
      this.nonces = Object.assign({}, prevBlock.nonces);
    }
  }

  calculateSize () {
    let ret = 0;

    for (const tx of this.transactions) {
      const size = tx.size || ((this.encodeTx(tx).length - 2) / 2);

      ret += size;
    }

    return ret;
  }

  async addDeposit (obj, bridge) {
    // borrow the transactions field for a deposit (we only have one deposit per block atm)
    // transactionHash = blockHash

    this.log('addDeposit', obj);
    const tx = {
      hash: this.hash,
      from: obj.owner,
      to: obj.token,
      data: obj.value,
      nonce: BIG_ZERO$7,
      status: '0x1',
      errno: 0,
      logs: [],
      returnData: '0x',
      size: 104,
    };
    this.transactions.push(tx);

    return tx;
  }

  async addCustomMessage (data, bridge) {
    const tx = {
      hash: this.hash,
      from: ADDRESS_ZERO$1,
      to: ADDRESS_ZERO$1,
      data: data,
      nonce: BIG_ZERO$7,
      status: '0x1',
      errno: 0,
      logs: [],
      returnData: '0x',
      // 0x...
      size: (data.length / 2) - 1,
    };
    this.transactions.push(tx);

    return tx;
  }

  log (...args) {
    timeLog(`${this.isDepositBlock ? 'DepositBlock' : 'Block'}(${this.number})`, ...args);
  }

  freeze () {
  }

  prune () {
    this.log('prune');
    this._raw = null;
    this.nonces = {};
  }

  async rebase (block, bridge) {
    this.log(`Rebase:Started ${block.transactions.length} transactions`);

    for (const tx of block.transactions) {
      if (this.prevBlock) {
        let duplicate = false;

        for (const _tx of this.prevBlock.transactions) {
          if (_tx.hash === tx.hash) {
            duplicate = true;
            break;
          }
        }

        if (duplicate) {
          this.log('Rebase:Dropping tx', tx.hash);
          continue;
        }
      }

      this.log('Rebase:Adding tx', tx.hash);
      try {
        await this.addDecodedTransaction(tx, bridge);
      } catch (e) {
        this.log(e);
      }
    }

    this.log(`Rebase:Complete ${this.transactions.length} transactions left`);
  }

  async addTransaction (rawStringOrArray, bridge, fromBeacon) {
    if (this._barrier) {
      try {
        this.log('active barrier');
        await this._barrier;
      } catch (e) {
        // ignore
      }
    }

    try {
      this._barrier = new Promise(
        async (resolve, reject) => {
          try {
            const tx = this.decodeTx(rawStringOrArray, bridge);
            resolve(await this.addDecodedTransaction(tx, bridge, fromBeacon));
          } catch (e) {
            reject(e);
          }
        }
      );
      const ret = await this._barrier;
      this._barrier = null;
      return ret;
    } catch (e) {
      this._barrier = null;
      throw e;
    }
  }

  async addDecodedTransaction (tx, bridge, fromBeacon) {
    if (this.validateTransaction(tx)) {
      const { errno, returnValue, logs } = await this.executeTx(tx, bridge);

      this.log(`${tx.from}:${tx.nonce}:${tx.hash}`);

      // TODO
      // check modified storage keys, take MAX_SOLUTION_SIZE into account
      if (errno !== 0) {
        this.log(`invalid tx errno:${errno}`);

        if (!fromBeacon) {
          // if this transaction is not already included in a block, then throw
          const errMsg = maybeDecodeError(returnValue);
          if (errMsg) {
            throw new Error(errMsg);
          } else {
            throw new Error(`transaction evm errno: ${errno}`);
          }
        }
      }

      tx.logs = logs || [];
      tx.status = errno === 0 ? '0x1' : '0x0';
      tx.errno = errno;
      tx.returnData = returnValue;

      this.nonces[tx.from] = tx.nonce + BIG_ONE$5;

      if (bridge.debugMode || errno === 0 || fromBeacon) {
        // 'save' the transaction
        this.transactions.push(tx);
      }

      return tx;
    }

    this.log('invalid or duplicate tx', tx.hash);

    return null;
  }

  validateTransaction (tx) {
    return true;
  }

  async dryExecuteTx (tx, bridge) {
    const { errno, returnValue } = await this.executeTx(tx, bridge, true);

    if (errno !== 0) {
      const errMsg = maybeDecodeError(returnValue);
      if (errMsg) {
        throw new Error(errMsg);
      } else {
        throw new Error(`evm errno: ${errno}`);
      }
    }
    return returnValue || '0x';
  }

  async submitBlock (bridge) {
    const transactions = [];
    const tmp = [];

    // TODO
    // this also has to take MAX_SOLUTION_SIZE into account
    let payloadLength = 0;
    for (const tx of this.transactions) {
      if (tx.submitted) {
        this.log(`Already marked as submitted: ${tx.from}:${tx.nonce}`);
        continue;
      }
      if (tx.errno !== 0) {
        this.log(`Skipping due to transaction errno:${tx.errno} from:${tx.from} nonce:${tx.nonce}`);
        continue;
      }

      this.log('Preparing ' + tx.from + ':' + tx.nonce + ':' + tx.hash);

      const encoded = this.encodeTx(tx, bridge).replace('0x', '');
      const byteLength = encoded.length / 2;

      if (payloadLength + byteLength > bridge.MAX_BLOCK_SIZE) {
        this.log('reached MAX_BLOCK_SIZE');
        break;
      }

      payloadLength += byteLength;

      transactions.push(encoded);
      // mark it as submitted
      // if we get any errors in submitBlock, we unmark all again
      tmp.push(tx);
      tx.submitted = true;
    }

    if (transactions.length === 0) {
      this.log('Nothing to submit');
      return;
    }

    const rawData = transactions.join('');
    const txData = bridge.rootBridge.encodeSubmit(rawData);
    const n = this.number;

    let tx;
    try {
      // post data
      tx = await bridge.wrapSendTransaction(txData);
    } catch (e) {
      this.log(e);
      // TODO: check if we really failed to submit the block

      // unmark all transactions
      for (const v of tmp) {
        v.submitted = false;
      }
    }

    this.log('Block.submitBlock.postData', Number(tx.gasUsed));
    this.log(
      {
        total: this.transactions.length,
        submitted: transactions.length,
      }
    );

    // TODO: blockHash/number might not be the same if additional blocks are submitted in the meantime
    return n;
  }

  /// @dev Computes the solution for this Block.
  async computeSolution (bridge) {
    // first 32 bytes are the (unused) stateRoot
    const payload = ''.padStart(64, '0');

    if ((payload.length / 2) > bridge.MAX_SOLUTION_SIZE) {
      throw new Error(`Reached MAX_SOLUTION_SIZE: ${payload.length / 2} bytes`);
    }

    const solution = {
      payload,
      hash: keccak256HexPrefix(payload),
    };

    return solution;
  }

  async computeChallenge (challengeOffset, bridge) {
    const blockData = this.toRaw(bridge);

    return { blockData, witnesses: [], rounds: 1 };
  }
}

const ZERO_LOGS_BLOOM = `0x${''.padStart(512, '0')}`;
const ZERO_NONCE = '0x0000000000000000';
const ZERO_HASH$2 = `0x${''.padStart(64, '0')}`;
const MAX_HASH = `0x${''.padStart(64, 'f')}`;
const BIG_ZERO$6 = BigInt(0);

const BLOCK_ZERO = {
  hash: MAX_HASH,
  parentHash: MAX_HASH,
  sha3Uncles: ZERO_HASH$2,
  stateRoot: ZERO_HASH$2,
  transactionsRoot: ZERO_HASH$2,
  receiptsRoot: ZERO_HASH$2,
  number: '0x0',
  timestamp: '0x0',
  nonce: ZERO_NONCE,
  difficulty: '0x0',
  gasLimit: '0x0',
  gasUsed: '0x0',
  miner: '0x0000000000000000000000000000000000000000',
  extraData: '0x',
  transactions: [],
  uncles: [],
};

function toQuantity (val) {
  return `0x${val.toString(16)}`;
}

function formatTransaction (tx, txIndex, block) {
  const transactionIndex = `0x${txIndex.toString(16)}`;
  const blockHash = block.hash || ZERO_HASH$2;
  const blockNumber = `0x${block.number.toString(16)}`;

  // Typed data transaction
  if (tx.primaryType) {
    return {
      transactionIndex,
      blockHash,
      blockNumber,
      primaryType: tx.primaryType,
      message: formatObject(tx.message),
      from: tx.from,
      to: tx.to,
      r: tx.r,
      s: tx.s,
      v: tx.v,
      nonce: '0x' + tx.nonce.toString(16),
      hash: tx.hash,
      gasPrice: '0x0',
      gas: '0x0',
      value: '0x0',
    };
  }

  return {
    transactionIndex,
    blockHash,
    blockNumber,
    from: tx.from,
    r: tx.r,
    s: tx.s,
    v: tx.v,
    to: tx.to,
    input: tx.data,
    nonce: '0x' + tx.nonce.toString(16),
    hash: tx.hash,
    gasPrice: '0x0',
    gas: '0x0',
    value: '0x0',
  };
}

function blockRequest (block, withTxData) {
  if (!block) {
    throw new Error('Requested Block not found');
  }

  const transactions = [];

  for (let txIndex = 0, len = block.transactions.length; txIndex < len; txIndex++) {
    const tx = block.transactions[txIndex];

    if (withTxData) {
      transactions.push(formatTransaction(tx, txIndex, block));
    } else {
      transactions.push(tx.hash);
    }
  }

  return {
    hash: block.hash || ZERO_HASH$2,
    parentHash: block.prevBlock ? block.prevBlock.hash : ZERO_HASH$2,
    sha3Uncles: ZERO_HASH$2,
    stateRoot: ZERO_HASH$2,
    transactionsRoot: ZERO_HASH$2,
    receiptsRoot: ZERO_HASH$2,
    number: `0x${block.number.toString(16)}`,
    timestamp: `0x${block.timestamp.toString(16)}`,
    // TODO: implement block nonce
    nonce: ZERO_NONCE,
    difficulty: '0x0',
    gasLimit: '0x0',
    gasUsed: '0x0',
    miner: '0x0000000000000000000000000000000000000000',
    extraData: '0x',
    transactions,
    uncles: [],
  };
}

class Methods {
  static 'debug_submitBlock' (obj, bridge) {
    return bridge.submitBlock();
  }

  static 'debug_submitSolution' (obj, bridge) {
    return bridge.submitSolution([BigInt(obj.params[0])]);
  }

  static 'debug_finalizeSolution' (obj, bridge) {
    return bridge.finalizeSolution(BigInt(obj.params[0]));
  }

  static 'debug_directReplay' (obj, bridge) {
    return bridge.directReplay(BigInt(obj.params[0]));
  }

  static 'debug_kill' () {
    setTimeout(function () {
      process.exit(1);
    }, 10);

    return true;
  }

  static 'debug_haltEvents' (obj, bridge) {
    bridge._debugHaltEvents = obj.params[0] ? true : false;
    return bridge._debugHaltEvents;
  }

  static 'debug_forwardChain' (obj, bridge) {
    return bridge.forwardChain();
  }

  static async 'debug_storage' (obj, bridge) {
    const bbt = bridge.pendingBlock.bbt;
    const stateRootBridge = BigInt(await bridge.rootBridge.stateRoot());

    if (stateRootBridge !== bbt.root.hash) {
      throw new Error('stateRoot mismatch on contract');
    }

    return bridge.pendingBlock.inventory.storage;
  }

  static 'web3_clientVersion' (obj, bridge) {
    return bridge.rootBridge.protocolAddress;
  }

  static 'net_version' (obj, bridge) {
    return bridge.CHAIN_ID.toString();
  }

  static 'eth_chainId' (obj, bridge) {
    return `0x${bridge.CHAIN_ID.toString(16)}`;
  }

  static 'eth_gasPrice' (obj) {
    // always zero, Hooray 🎉
    return '0x0';
  }

  static async 'eth_syncing' (obj, bridge) {
    const rootBridge = bridge.rootBridge;

    //if (rootBridge.ready) {
    //  return false;
    //}

    if (!this._syncStatus) {
      this._syncStatus = {
        startingBlock: toQuantity(await rootBridge.createdAtBlock()),
        currentBlock: toQuantity(rootBridge.eventFilter.fromBlock - 1),
        highestBlock: toQuantity(rootBridge.eventFilter.toBlock),
      };
      setTimeout(() => this._syncStatus = null, 1000);
    }

    return this._syncStatus;
  }

  static async 'eth_blockNumber' (obj, bridge) {
    return `0x${bridge.pendingBlock.number.toString(16)}`;
  }

  static async 'eth_getBlockByNumber' (obj, bridge) {
    let maybeNumber = obj.params[0];
    if (maybeNumber === 'latest' || maybeNumber === 'pending') {
      maybeNumber = bridge.pendingBlock.number;
    }

    const num = BigInt(maybeNumber);

    // special case
    if (num === BIG_ZERO$6) {
      return BLOCK_ZERO;
    }

    const withTxData = obj.params[1] ? true : false;
    const block = await bridge.getBlockByNumber(num, true);

    return blockRequest(block, withTxData);
  }

  static async 'eth_getBlockByHash' (obj, bridge) {
    const withTxData = obj.params[1] ? true : false;
    const block = await bridge.getBlockByHash(obj.params[0], true);

    return blockRequest(block, withTxData);
  }

  static async 'eth_getBalance' (obj) {
    // always zero
    return '0x0';
  }

  static async 'eth_getTransactionCount' (obj, bridge) {
    // TODO: pending, latest
    // currently returns pending-nonce
    const nonce = await bridge.getNonce(obj.params[0]);
    return `0x${nonce.toString(16)}`;
  }

  static async 'eth_estimateGas' (obj) {
    // always zero
    return '0x0';
  }

  static async 'eth_getTransactionReceipt' (obj, bridge) {
    const txHash = obj.params[0];
    const { block, tx, txIndex } = bridge.getBlockOfTransaction(txHash);

    if (!tx) {
      throw new Error('Transaction not found');
    }

    const transactionIndex = `0x${txIndex.toString(16)}`;
    const blockHash = block.hash || ZERO_HASH$2;
    const blockNumber = `0x${block.number.toString(16)}`;
    const logs = [];

    if (tx.logs) {
      const logLen = tx.logs.length;

      for (let i = 0; i < logLen; i++) {
        const logIndex = `0x${i.toString(16)}`;
        const log = tx.logs[i];
        const obj = {
          transactionLogIndex: logIndex,
          transactionIndex,
          blockNumber,
          transactionHash: tx.hash,
          address: log.address,
          topics: log.topics,
          data: log.data,
          logIndex,
          blockHash,
        };
        logs.push(obj);
      }
    }

    // TODO: proper receipts
    return {
      transactionHash: tx.hash,
      transactionIndex,
      blockHash,
      blockNumber,
      from: tx.from,
      to: tx.to,
      status: tx.status,
      logs: logs,
      contractAddress: null,
      logsBloom: ZERO_LOGS_BLOOM,
      cumulativeGasUsed: '0x0',
      gasUsed: '0x0',
    };
  }

  static async 'eth_getTransactionDetails' (obj, bridge) {
    const txHash = obj.params[0];
    const { block, tx, txIndex } = bridge.getBlockOfTransaction(txHash);

    if (!tx) {
      throw new Error('Transaction not found');
    }

    return {
      errno: `0x${tx.errno.toString(16)}`,
      returnData: tx.returnData,
    };
  }

  static async 'eth_getTransactionByHash' (obj, bridge) {
    const txHash = obj.params[0];
    const { block, tx, txIndex } = bridge.getBlockOfTransaction(txHash);

    if (!tx) {
      throw new Error('Transaction not found');
    }

    return formatTransaction(tx, txIndex, block);
  }

  static async 'eth_call' (obj, bridge) {
    obj.params[1];
    // from, to, data, gas, gasPrice, value
    const tx = obj.params[0];
    return bridge.runCall(tx);
  }

  static async 'eth_getCode' (obj, bridge) {
    return bridge.getCode(obj.params[0], obj.params[1]);
  }

  static async 'eth_sendRawTransaction' (obj, bridge) {
    const data = obj.params[0];
    return bridge.runTx({ data });
  }

  static async 'eth_getLogs' (obj, bridge) {
    // TODO
    // Support
    // - blockhash filter
    // - nested topic queries
    // - pending, earliest ..
    // - correct log indices
    const eventFilter = obj.params[0];
    const filterAddress = eventFilter.address ? eventFilter.address.toLowerCase() : null;
    const filterAddressFrom = eventFilter.from ? eventFilter.from.toLowerCase() : null;
    const filterTopics = eventFilter.topics || [];
    const filterMessageTypes = eventFilter.primaryTypes || [];
    const maxResults = eventFilter.maxResults | 0;
    const res = [];

    if (!(filterTopics.length || filterMessageTypes.length)) {
      return res;
    }

    const stop = BigInt(eventFilter.toBlock || bridge.pendingBlock.number);
    const start = BigInt(eventFilter.fromBlock || bridge.pendingBlock.number);
    const reverse = stop < start;

    for (let i = BIG_ZERO$6, len = reverse ? start - stop : stop - start; i <= len; i++) {
      const block = await bridge.getBlockByNumber(reverse ? start - i : start + i, true);

      if (!block) {
        break;
      }

      const blockHash = block.hash || ZERO_HASH$2;
      const blockNumber = `0x${block.number.toString(16)}`;
      const txsLength = block.transactions.length;

      for (let x = 0; x < txsLength; x++) {
        const txIndex = reverse ? txsLength - (x + 1) : x;
        const tx = block.transactions[txIndex];

        if (tx.status !== '0x1') {
          continue;
        }

        if (filterAddress && tx.to !== filterAddress) {
          continue;
        }

        if (filterAddressFrom && tx.from !== filterAddressFrom) {
          continue;
        }

        if (tx.primaryType && filterMessageTypes.indexOf(tx.primaryType) !== -1) {
          if (res.push(formatTransaction(tx, txIndex, block)) === maxResults) {
            return res;
          }
          continue;
        }

        if (filterTopics.length === 0) {
          continue;
        }

        const transactionIndex = `0x${txIndex.toString(16)}`;
        const logsLength = tx.logs.length;
        for (let y = 0; y < logsLength; y++) {
          const logIndex = reverse ? logsLength - (y + 1) : y;
          const log = tx.logs[logIndex];
          const filterTopicsLength = filterTopics.length;
          let skip = false;

          for (let t = 0; t < filterTopicsLength; t++) {
            const q = filterTopics[t];
            if (!q) {
              continue;
            }
            if (log.topics[t] !== q) {
              skip = true;
              break;
            }
          }
          if (skip) {
            continue;
          }

          const idx = `0x${logIndex.toString(16)}`;
          const obj = {
            transactionLogIndex: idx,
            transactionIndex,
            blockNumber,
            transactionHash: tx.hash,
            address: log.address,
            topics: log.topics,
            data: log.data,
            logIndex: idx,
            blockHash,
          };

          if (res.push(obj) === maxResults) {
            return res;
          }
        }
      }
    }

    return res;
  }

  // TODO
  // eth_getStorageAt
}

async function createFetchJson (url) {
  const headers = {
    'content-type': 'application/json',
    'accept-encoding': 'gzip',
  };
  const method = 'POST';

  if (typeof fetch !== 'undefined') {
    // browser
    return async function (rpcMethod, params) {
      const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: rpcMethod, params });
      const resp = await fetch(url, { body: payload, method, headers });
      const obj = await resp.json();

      if (obj.error) {
        throw new Error(obj.error.message);
      }

      return obj.result;
    };
  }

  // nodejs
  {
    const http = await import('http');
    const https = await import('https');
    const { gunzipSync } = await import('zlib');
    const { parse } = await import('url');
    const urlParse = parse;

    return async function (rpcMethod, params) {
      const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: rpcMethod, params });

      return new Promise(
        function (resolve, reject) {
          const timeoutMsec = 500000;
          const fetchOptions = urlParse(url);

          fetchOptions.method = method;
          fetchOptions.headers = headers;

          const proto = fetchOptions.protocol === 'http:' ? http : https;
          const req = proto.request(fetchOptions);

          let body = Buffer.alloc(0);

          req.setTimeout(timeoutMsec, () => req.abort());
          req.on('error', reject);
          req.on('socket', (socket) => socket.setTimeout(timeoutMsec));
          req.on('response', function (resp) {
            resp.on('data', function (buf) {
              body = Buffer.concat([body, buf]);
            });
            resp.on('end', function () {
              try {
                const obj = JSON.parse(resp.headers['content-encoding'] === 'gzip' ? gunzipSync(body) : body);

                if (obj.error) {
                  reject(obj.error);
                }
                resolve(obj.result);
              } catch (e) {
                reject(e.message || e);
              }
            });
          });

          req.end(payload);
        }
      );
    };
  }
}

// Deposit(address,address,uint256,uint256)
const TOPIC_DEPOSIT = '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7';
// BlockBeacon()
const TOPIC_BEACON = '0x98f7f6a06026bc1e4789634d93bff8d19b1c3b070cc440b6a6ae70bae9fec6dc';
// CustomBlockBeacon()
const TOPIC_CUSTOM_BEACON = '0xb078ebcc4cca318b4b52d21e9a19505dfb2bcdaad38bee3d6b5d95b7d329b870';
// NewSolution()
const TOPIC_SOLUTION = '0xd180748b1b0c35f46942acf30f64a94a79d303ffd18cce62cbbb733b436298cb';
// RollupUpgrade(address)
const TOPIC_ROLLUP_UPGRADE = '0x1af6bceb4b9de70d3a0d322db3ebde262ab3f6375cc4c59f04a39834d8c03f0d';

const FUNC_SIG_SUBMIT_BLOCK = '0x25ceb4b2';
const FUNC_SIG_SUBMIT_SOLUTION = '0x84634f44';
const FUNC_SIG_CHALLENGE = '0xd2ef7398';
const FUNC_SIG_FINALIZE = '0x9af5db2e';
const FUNC_SIG_DISPUTE = '0x1f2f7fc3';

const FUNC_SIG_MAX_BLOCK_SIZE = '0x6ce02363';
const FUNC_SIG_INSPECTION_PERIOD = '0xe70f0e35';
const FUNC_SIG_INSPECTION_PERIOD_MULTIPLIER = '0xfe4314fe';
const FUNC_SIG_BLOCK_META = '0x3749779c';
const FUNC_SIG_FINALIZED_HEIGHT = '0xb2223bd6';

const STATE_ROOT_STORAGE_KEY = '0xd27f023774f5a743d69cfc4b80b1efe4be7912753677c20f45ee5464160b7d24';
const CHALLENGE_OFFSET_KEY = '0xd733644cc0b916a23c558a3a2815e430d2373e6f5bf71acb729373a0dd995878';

const UINT_ZERO = '0x'.padEnd(66, '0');
const UINT_MAX = '0x'.padEnd(66, 'f');
const BIG_ZERO$5 = BigInt(0);
const BIG_ONE$4 = BigInt(1);
const MAX_SHIFT = BigInt(255);

class RootBridge {
  constructor (options) {
    this.rootRpcUrl = options.rootRpcUrl;
    this.protocolAddress = options.contract.toLowerCase();

    this.eventQueue = [];
    this.eventFilter = {
      fromBlock: 0,
      toBlock: 0,
      address: this.protocolAddress,
      topics: [
        [TOPIC_DEPOSIT, TOPIC_BEACON, TOPIC_CUSTOM_BEACON, TOPIC_SOLUTION, TOPIC_ROLLUP_UPGRADE],
      ],
    };

    this.eventHandlers = {};
    this.eventHandlers[TOPIC_DEPOSIT] =
      async (evt, delegate) => {
        let offset = 26;
        const data =
          evt.data.substring(offset, offset += 40)
          + evt.data.substring(offset += 24, offset += 40)
          + evt.data.substring(offset, offset += 64)
          + evt.data.substring(offset, offset += 64);

        const rootBlock = await this.fetchRootBlock(evt.blockHash);

        await delegate.onDeposit(data, rootBlock);
      };
    this.eventHandlers[TOPIC_BEACON] =
      async (evt, delegate) => {
        const tx = await this.fetchJson('eth_getTransactionByHash', [evt.transactionHash]);
        const rootBlock = await this.fetchRootBlock(evt.blockHash);
        const data = tx.input.substring(10, tx.input.length);

        await delegate.onBlockBeacon(tx, data, rootBlock);
      };
    this.eventHandlers[TOPIC_CUSTOM_BEACON] =
      async (evt, delegate) => {
        const tx = await this.fetchJson('eth_getTransactionByHash', [evt.transactionHash]);
        const rootBlock = await this.fetchRootBlock(evt.blockHash);
        const data = tx.input.substring(10, tx.input.length);

        await delegate.onCustomBlockBeacon(tx, data, rootBlock);
      };
    this.eventHandlers[TOPIC_SOLUTION] =
      async (evt, delegate) => {
        const tx = await this.fetchJson('eth_getTransactionByHash', [evt.transactionHash]);
        // strip the function sig
        const data = tx.input.substring(10, tx.input.length);
        // first 32 bytes is block number
        let blockNum = BigInt('0x' + data.substring(0, 64));

        for (let i = 64, len = data.length; i < len;) {
          const solutionHash = '0x' + data.substring(i, i += 64).padEnd(64, '0');

          if (solutionHash === UINT_ZERO || solutionHash === UINT_MAX) {
            continue;
          }
          await delegate.onSolution(blockNum, solutionHash, evt);
          blockNum++;
        }
      };
    this.eventHandlers[TOPIC_ROLLUP_UPGRADE] =
      async (evt, delegate) => {
        const address = `0x${evt.data.substring(26, 66)}`;

        await delegate.onRollupUpgrade(address, evt);
      };
  }

  log (...args) {
    timeLog('RootBridge', ...args);
  }

  async init () {
    // construct it once
    this.fetchJson = await createFetchJson(this.rootRpcUrl);
  }

  async abiCall (data) {
    const res = await this.fetchJson('eth_call',
      [
        {
          to: this.protocolAddress,
          data,
        },
        'latest',
      ]
    );

    return res;
  }

  async getStorage (key) {
    return await this.fetchJson('eth_getStorageAt',
      [
        this.protocolAddress,
        key,
        'latest',
      ]
    );
  }

  async INSPECTION_PERIOD () {
    const res = await this.abiCall(FUNC_SIG_INSPECTION_PERIOD);

    return Number(res);
  }

  async INSPECTION_PERIOD_MULTIPLIER () {
    const res = await this.abiCall(FUNC_SIG_INSPECTION_PERIOD_MULTIPLIER);

    return Number(res);
  }

  async MAX_BLOCK_SIZE () {
    const res = await this.abiCall(FUNC_SIG_MAX_BLOCK_SIZE);

    return Number(res);
  }

  async stateRoot () {
    let res = '0x';

    try {
      res = await this.getStorage(STATE_ROOT_STORAGE_KEY);
    } catch (e) {
      this.log('stateRoot', e);
    }

    if (res === '0x') {
      return false;
    }

    return res;
  }

  async canFinalizeBlock (blockNumber) {
    const res = await this.abiCall(`0x5b11ae01${blockNumber.toString(16).replace('0x', '').padStart(64, '0')}`);

    return !!Number(res);
  }

  async isDisputed (blockNumber) {
    const res = await this.abiCall(`${FUNC_SIG_BLOCK_META}${blockNumber.toString(16).replace('0x', '').padStart(64, '0')}`);

    // if the lsb is 1, then the solution was disputed
    return !!(BigInt(res) & BIG_ONE$4);
  }

  async createdAtBlock () {
    const res = await this.getStorage('0x319a610c8254af7ecb1f669fb64fa36285b80cad26faf7087184ce1dceb114df');

    return Number(res);
  }

  async finalizedHeight () {
    const res = await this.abiCall(FUNC_SIG_FINALIZED_HEIGHT);

    return BigInt(res);
  }

  async challengeOffset () {
    const res = await this.getStorage(CHALLENGE_OFFSET_KEY);

    return Number(res);
  }

  async fetchRootBlock (blockHash) {
    const res = await this.fetchJson('eth_getBlockByHash',
      [
        blockHash,
        false
      ]
    );

    return res;
  }

  encodeSubmit (data) {
    return {
      to: this.protocolAddress,
      data: FUNC_SIG_SUBMIT_BLOCK + data.replace('0x', ''),
    };
  }

  encodeChallenge ({ blockData, witnesses, rounds }) {
    const payload = blockData.replace('0x', '');
    let data = FUNC_SIG_CHALLENGE +
               (payload.length / 2).toString(16).padStart(64, '0') +
               rounds.toString(16).padStart(64, '0');

    if (witnesses.length) {
      for (const { readWitnessN, readWitness, writeWitnessN, writeWitness } of witnesses) {
        data += packString(
          [
            readWitnessN,
            readWitness,
            writeWitnessN,
            writeWitness,
          ],
          [32, 0, 32, 0]
        );
      }
    } else {
      data += packString([0, 0], [32, 32]);
    }

    return {
      to: this.protocolAddress,
      data: data + payload,
    };
  }

  encodeSolution (blockNumber, solutionHash) {
    return {
      to: this.protocolAddress,
      data: FUNC_SIG_SUBMIT_SOLUTION + blockNumber.toString(16).padStart(64, '0') + solutionHash.replace('0x', ''),
    };
  }

  encodeDispute (blockNumbers) {
    if (!blockNumbers.length) {
      throw new Error(`need at least one blockNumber`);
    }

    let blockN = blockNumbers[0];
    let mask = BIG_ZERO$5;

    for (const blockNumber of blockNumbers) {
      const i = blockNumber - blockN;

      if (i > MAX_SHIFT || i < BIG_ZERO$5) {
        throw new Error(`distance too large: ${blockN} / ${blockNumber}`);
      }

      mask |= BIG_ONE$4 << i;
    }

    return {
      to: this.protocolAddress,
      data: FUNC_SIG_DISPUTE + blockN.toString(16).padStart(64, '0') + mask.toString(16).padStart(64, '0'),
    };
  }

  encodeFinalize (firstBlockNumber, payloads) {
    let packed = packString([firstBlockNumber], [32]);
    for (const payload of payloads) {
      packed += packString([payload.length  / 2, payload], [32, 0]);
    }
    return {
      to: this.protocolAddress,
      data: FUNC_SIG_FINALIZE + packed,
    };
  }

  async initialSync (delegate) {
    // this is our starting point
    const createdAtBlock = await this.createdAtBlock();
    const latestBlock = Number(await this.fetchJson('eth_blockNumber', []));

    // sync
    this.eventFilter.fromBlock = createdAtBlock;

    const quantityStepping = 100;
    let fetchQuantity = 100;
    for (let i = createdAtBlock; i <= latestBlock;)  {
      let toBlock = i + fetchQuantity;
      if (toBlock > latestBlock) {
        toBlock = latestBlock;
      }
      this.eventFilter.toBlock = toBlock;

      let res;
      try {
        const r = {
          fromBlock: '0x' + this.eventFilter.fromBlock.toString(16),
          toBlock: '0x' + this.eventFilter.toBlock.toString(16),
          address: this.eventFilter.address,
          topics: this.eventFilter.topics,
        };

        this.log(`syncing from: ${this.eventFilter.fromBlock} to: ${this.eventFilter.toBlock}`);
        res = await this.fetchJson('eth_getLogs', [r]);
      } catch (e) {
        this.log(e);

        fetchQuantity -= quantityStepping;
        if (fetchQuantity < 1) {
          fetchQuantity = 1;
        }
        continue;
      }

      const len = res.length;
      for (let i = 0; i < len; i++) {
        await this._dispatchEvent(res[i], delegate);
      }

      i = toBlock + 1;
      this.eventFilter.fromBlock = i;
      fetchQuantity += quantityStepping;
    }

    this.ready = true;
    this.log('synced');
  }

  async _dispatchEvent (evt, delegate) {
    const topic = evt.topics[0];

    if (this.eventHandlers.hasOwnProperty(topic)) {
      await this.eventHandlers[topic](evt, delegate);
    }
  }

  async fetchEvents (delegate) {
    const latestBlock = Number(await this.fetchJson('eth_blockNumber', []));

    if (Date.now() % 1000 === 0) {
      this.log(`latestBlock: ${latestBlock} fetch if >= ${this.eventFilter.fromBlock}`);
    }

    if (latestBlock >= this.eventFilter.fromBlock) {
      this.eventFilter.toBlock = latestBlock;

      // the event filter
      const r = {
        fromBlock: '0x' + this.eventFilter.fromBlock.toString(16),
        toBlock: '0x' + this.eventFilter.toBlock.toString(16),
        address: this.eventFilter.address,
        topics: this.eventFilter.topics,
      };
      // fetch
      const events = await this.fetchJson('eth_getLogs', [r]);

      if (events.length) {
        this.log(`${events.length} new events`);
      }

      // save new height
      this.eventFilter.fromBlock = latestBlock + 1;
      // append to the event queue
      this.eventQueue = this.eventQueue.concat(events);
    }

    // now drain the eventQueue
    {
      const queue = this.eventQueue;
      let i = 0;
      for (const len = queue.length; i < len; i++) {
        try {
          await this._dispatchEvent(queue[i], delegate);
        } catch (e) {
          this.log(e);
          // break on error
          break;
        }
      }
      // remove the elements that succeeded
      this.eventQueue = queue.slice(i);
    }

    // everything that accumulates after an error in `this.eventQueue`
    // will be processed next time this function gets called
  }
}

const BIG_ZERO$4 = BigInt(0);
const BIG_ONE$3 = BigInt(1);
const ZERO_HASH$1 = '0000000000000000000000000000000000000000000000000000000000000000';

const IS_NATIVE_ENV = typeof process !== 'undefined';

/// @dev Glue for everything.
class Bridge$1 {
  constructor (options, BlockClass) {
    this.bytecodeCache = Object.create(null);
    this.pendingBlock = new (BlockClass || Block$1)(null);

    this.disableValidation = options.operatingMode === 'producer';
    this.disableBlockProduction = options.operatingMode === 'validator';
    this.debugMode = options.debugMode ? true : false;
    this.eventCheckMs = options.eventCheckMs || 1000;
    // may include custom flags
    this.featureFlags = options.featureFlags | 0;

    // options regarding block submission behaviour
    this.blockSizeThreshold = options.blockSizeThreshold || 1000;
    this.blockTimeThreshold = (options.blockTimeThreshold * 1000) || 60000;

    // options regarding solution submission behaviour
    this.submitSolutionThreshold = options.submitSolutionThreshold || 256;
    // challenge behaviour
    this.alwaysChallengeDisputedBlocks = !!options.alwaysChallengeDisputedBlocks;

    // incoming transactions
    this.maxTransactionSize = Number(options.maxTransactionSize) | 0;

    // rpc related
    this.rpcApiKey = options.rpcApiKey || '';
    this.disabledRpcMethods = (options.disabledRpcMethods || '').split(',');

    // TODO: find a better place / method
    this._pendingBlockSubmission = false;
    this._lastBlockSubmission = Date.now();

    if (options.privKey) {
      this.privKey = options.privKey.replace('0x', '');
      this.signer = toHexPrefix(privateToAddress(this.privKey));
    } else {
      this.log('Warning: No private key - Read-only mode');
    }

    this.rootBridge = new RootBridge(options);

    // keep track of pending transactions
    this._pendingTransactionPool = [];
    // address of the rollup contract
    // can be changed via the RollupUpgrade(address) event
    this.implementationAddress = this.rootBridge.protocolAddress;
  }

  log (...args) {
    timeLog('Bridge', ...args);
  }

  async reloadConfig () {
    // safe number for the client (not enforced)
    this.MAX_SOLUTION_SIZE = 8 << 10;
    this.MAX_BLOCK_SIZE = await this.rootBridge.MAX_BLOCK_SIZE();
    this.INSPECTION_PERIOD = await this.rootBridge.INSPECTION_PERIOD();
    this.INSPECTION_PERIOD_MULTIPLIER = await this.rootBridge.INSPECTION_PERIOD_MULTIPLIER();
    this.CHAIN_ID = Number(await this.rootBridge.fetchJson('net_version', []));

    const rootProviderVersion = await this.rootBridge.fetchJson('web3_clientVersion', []);

    this.log(
      {
        rootRpcUrl: this.rootBridge.rootRpcUrl,
        rootProviderVersion,
        bridge: this.rootBridge.protocolAddress,
        implementation: this.implementationAddress,
        MAX_BLOCK_SIZE: this.MAX_BLOCK_SIZE,
        MAX_SOLUTION_SIZE: this.MAX_SOLUTION_SIZE,
        INSPECTION_PERIOD: this.INSPECTION_PERIOD,
        INSPECTION_PERIOD_MULTIPLIER: this.INSPECTION_PERIOD_MULTIPLIER,
        CHAIN_ID: this.CHAIN_ID,
        wallet: this.signer,
        debugMode: this.debugMode,
        eventCheckMs: this.eventCheckMs,
        featureFlags: this.featureFlags,
      }
    );
  }

  async init () {
    await this.rootBridge.init();
    await this.reloadConfig();
    await this.rootBridge.initialSync(this);
    this.ready = true;
    this._eventLoop();

    // Disable automatic submissions for testing or debugging purposes.
    if (this.debugMode) {
      this.log('Disabled update loop because of debugMode');
    }

    if (IS_NATIVE_ENV) {
      // restore and check pendingTransactionPool
      const { existsSync, readFileSync, mkdirSync } = await import('fs');

      // create directories
      this._dataDir = `./data/${this.rootBridge.protocolAddress}`;
      mkdirSync(this._dataDir, { recursive: true });

      const path = `${this._dataDir}/txsafe.json`;
      if (existsSync(path)) {
        try {
          const txs = JSON.parse(readFileSync(path));

          for (const tx of txs) {
            const found = await this.getTransaction(tx.hash);

            if (!found) {
              try {
                // add again
                await this.runTx({ data: tx.raw });
              } catch (e) {
                this.log(`Error adding transaction from store`, e);
              }
            }
          }
        } catch (e) {
          this.log('restore transactions from store', e);
        }
      }
    }
  }

  async forwardChain () {
    if (this.shouldSubmitNextBlock()) {
      this._pendingBlockSubmission = true;

      this.log('submitting block...');
      try {
        await this.pendingBlock.submitBlock(this);
      } catch (e) {
        this.log(e);
      }

      this._pendingBlockSubmission = false;
      this._lastBlockSubmission = Date.now();
    }

    // finalize or submit solution, if possible
    if (!this.disableValidation) {
      const next = (await this.rootBridge.finalizedHeight()) + BIG_ONE$3;
      const wrongSolutions = [];
      const pendingSolutions = [];
      const pendingFinalizations = [];

      // we can do this for the next 256 pending blocks
      for (let i = 0; i < 256; i++) {
        const block = await this.getBlockByNumber(next + BigInt(i));

        if (!block || !block.hash) {
          break;
        }

        // this.log(`forwardChain: checking block(${block.number})`);

        // we found the next pending block
        // no solution yet?
        if (!block.submittedSolutionHash) {
          pendingSolutions.push(block.number);
        } else {
          // ...has a submitted solution
          const mySolution = await block.computeSolution(this);

          // check if the solution is already marked as invalid
          if (mySolution.hash !== block.submittedSolutionHash) {
            const alreadyDisputed = await this.rootBridge.isDisputed(block.number);

            if (!alreadyDisputed) {
              wrongSolutions.push(block.number);
            } else if (block.number === next) {
              this.log('Different results, starting challenge...');
              await this.processChallenge(block);
            }
          } else {
            // solution is correct
            pendingFinalizations.push(block.number);
          }
        }
      }

      // dispute them, if any
      if (wrongSolutions.length) {
        await this.dispute(wrongSolutions);
      }

      // submit them, if any
      // honor config parameter that specifies a threshold for submission
      if (pendingSolutions.length >= this.submitSolutionThreshold) {
        await this.submitSolution(pendingSolutions);
      }

      // for tracking the block numbers that can be normally finalized
      const todo = [];
      // finalize them, if any
      for (const blockNumber of pendingFinalizations) {
        const pendingBlock = await this.getBlockByNumber(blockNumber);

        // at this point the solution is considered valid and finalization is only a question of patience
        const canFinalize = await this.rootBridge.canFinalizeBlock(pendingBlock.number);
        this.log(`Can finalize pending block: ${pendingBlock.number}=${canFinalize}`);

        if (canFinalize) {
          todo.push(pendingBlock.number);
        } else {
          // can't finalize, maybe the solution is too young?
          if (this.alwaysChallengeDisputedBlocks) {
            const isDisputed = await this.rootBridge.isDisputed(pendingBlock.number);

            if (isDisputed) {
              this.log(`starting challenge for disputed block: ${pendingBlock.number}`);
              await this.processChallenge(pendingBlock);
            }
          }
        }
      }

      // finalize
      await this.finalizeSolution(todo);
    }
  }

  async _eventLoop () {
    try {
      if (!this._debugHaltEvents) {
        await this.rootBridge.fetchEvents(this);
      }
      if (!this.debugMode) {
        await this.forwardChain();
      }
      // filter _pendingTransactionPool
      if (IS_NATIVE_ENV) {
        const tmp = [];

        for (const tx of this._pendingTransactionPool) {
          const { block } = await this.getBlockOfTransaction(tx.hash);

          // if this transaction is inside a block that is lower than the pending one,
          // then drop it
          if (block && block.number < this.pendingBlock.number) {
            continue;
          }

          // else append it again
          tmp.push(tx);
        }

        // update
        this._pendingTransactionPool = tmp;

        const { writeFileSync } = await import('fs');
        // save to file
        writeFileSync(
          `${this._dataDir}/txsafe.json`,
          JSON.stringify(this._pendingTransactionPool)
        );
      }
    } catch (e) {
      this.log(e);
    }
    setTimeout(this._eventLoop.bind(this), this.eventCheckMs);
  }

  async onDeposit (data, rootBlock) {
    const block = new this.pendingBlock.constructor(this.pendingBlock.prevBlock);

    await block.onDeposit(data, rootBlock, this);
    await this.addBlock(block);
  }

  async onBlockBeacon (tx, data, rootBlock) {
    const block = new this.pendingBlock.constructor(this.pendingBlock.prevBlock);

    await block.fromBeacon(data, rootBlock, this);
    await this.addBlock(block);
  }

  async onCustomBlockBeacon (tx, data, rootBlock) {
    const block = new this.pendingBlock.constructor(this.pendingBlock.prevBlock);

    await block.fromCustomBeacon(data, rootBlock, this);
    await this.addBlock(block);
  }

  /// @dev Checks if `blockNumber` is the next Block that needs finalization.
  async isCurrentBlock (blockNumber) {
    const finalizedHeight = (await this.rootBridge.finalizedHeight()) + BIG_ONE$3;

    return finalizedHeight === blockNumber;
  }

  async onSolution (blockNumber, solutionHash, evt) {
    this.log('Solution registered');
    this.log({ blockNumber, solutionHash });

    const block = await this.getBlockByNumber(BigInt(blockNumber));

    // TODO
    if (!block) {
      return;
    }

    if (block.submittedSolutionHash) {
      this.log('A solution was already registered for this block. Ignoring.');
      return;
    }

    block.submittedSolutionHash = solutionHash;
    block.submittedSolutionTime = evt.blockNumber;
  }

  async onRollupUpgrade (address, evt) {
    this.log('new implementation', address);

    // create a new block and rebase
    const block = this.pendingBlock;
    const rebaseBlock = new block.constructor(block.prevBlock);
    // upgrade and recalculate everything
    this.implementationAddress = address;
    await this.reloadConfig();
    await rebaseBlock.rebase(block, this);

    this.pendingBlock = rebaseBlock;
  }

  getBlockOfTransaction (txHash) {
    let block = this.pendingBlock;

    while (block) {
      for (let txIndex = 0, len = block.transactions.length; txIndex < len; txIndex++) {
        const tx = block.transactions[txIndex];

        if (tx.hash === txHash) {
          return { block, tx, txIndex };
        }
      }
      block = block.prevBlock;
    }

    return {};
  }

  async getBlockByHash (hash, includePending) {
    if (includePending && hash === this.pendingBlock.hash) {
      return this.pendingBlock;
    }

    let block = this.pendingBlock.prevBlock;

    while (block) {
      if (block.hash === hash) {
        return block;
      }
      block = block.prevBlock;
    }

    return null;
  }

  async getBlockByNumber (num, includePending) {
    if (includePending && num === this.pendingBlock.number) {
      return this.pendingBlock;
    }

    let block = this.pendingBlock.prevBlock;

    while (block) {
      if (block.number === num) {
        return block;
      }
      block = block.prevBlock;
    }

    return null;
  }

  async addBlock (block) {
    block.freeze();

    // create a new head
    const newHead = new this.pendingBlock.constructor(block);
    const head = this.pendingBlock;

    await newHead.rebase(head, this);
    this.pendingBlock = newHead;
  }

  async getNonce (addr) {
    const nonce = this.pendingBlock.nonces[addr.toLowerCase()];

    return nonce || BIG_ZERO$4;
  }

  getTransaction (txHash) {
    let block = this.pendingBlock;

    while (block) {
      for (const tx of block.transactions) {
        if (tx.hash === txHash) {
          return tx;
        }
      }

      block = block.prevBlock;
    }

    return null;
  }

  async runCall (tx) {
    return this.pendingBlock.dryExecuteTx(tx, this);
  }

  async runTx ({ data }) {
    let hexString = data;

    if (typeof data === 'object') {
      // encode the transaction object if `data` is a object instead of a hex-string
      hexString = await this.pendingBlock.encodeTx(data, this);
    }

    if (this.maxTransactionSize > 0) {
      if (((hexString.length / 2) - 1) > this.maxTransactionSize) {
        throw new Error(`Transaction size (${this.maxTransactionSize}) exceeded`);
      }
    }

    const tx = await this.pendingBlock.addTransaction(hexString, this);

    if (!tx) {
      throw new Error('Invalid transaction');
    }

    // store tx into pending pool. We might get duplicates, but this is not an error per se.
    {
      this._pendingTransactionPool.push({ hash: tx.hash, raw: hexString });
    }

    return tx.hash;
  }

  async getCode (addr) {
    let bytecode = this.bytecodeCache[addr];

    if (!bytecode) {
      bytecode = this.rootBridge.fetchJson('eth_getCode', [addr, 'latest']);
      this.bytecodeCache[addr] = bytecode;
    }

    return bytecode;
  }

  setCode (addr, bytecodeHexStr) {
    this.bytecodeCache[addr] = bytecodeHexStr;
  }

  async submitBlock () {
    const blockNumber = await this.pendingBlock.submitBlock(this);

    return `0x${(blockNumber || 0).toString(16)}`;
  }

  async submitSolution (blockNumbers) {
    if (!blockNumbers || !Array.isArray(blockNumbers)) {
      throw new TypeError(`expected an array of block numbers`);
    }
    if (blockNumbers.length === 0 || blockNumbers.length > 256) {
      throw new Error(`invalid length of blockNumbers(${blockNumbers.length})`);
    }

    const firstBlock = blockNumbers[0];
    let lastNumber = firstBlock - BIG_ONE$3;
    let data = '';

    for (const blockNumber of blockNumbers) {
      let diff = blockNumber - lastNumber;

      if (diff < BIG_ONE$3) {
        throw new Error(`incorrect sequence of blockNumbers`);
      }

      while (diff-- > BIG_ONE$3) {
        // fill `holes`
        data += ZERO_HASH$1;
      }

      const block = await this.getBlockByNumber(blockNumber);

      if (!block) {
        throw new Error(`Block(${blockNumber}) not found`);
      }

      const mySolution = await block.computeSolution(this);
      data += mySolution.hash.replace('0x', '');
      lastNumber = blockNumber;
      this.log(`submitting solution for block(${blockNumber})`);
    }

    const receipt = await this.wrapSendTransaction(
      this.rootBridge.encodeSolution(firstBlock, data)
    );

    this.log('Bridge.submitSolution', Number(receipt.gasUsed));

    return true;
  }

  async finalizeSolution (blockNumbers) {
    if (!blockNumbers.length) {
      // nothing todo
      return true;
    }

    const TAG = 'Bridge.finalizeSolution';
    const blocks = [];
    const payloads = [];
    const firstBlockNumber = blockNumbers[0];
    for (const blockNumber of blockNumbers) {
      const block = await this.getBlockByNumber(blockNumber);

      if (!block) {
        throw new Error(`Block(${blockNumber}) not found`);
      }

      const mySolution = await block.computeSolution(this);
      this.log(TAG, mySolution);
      blocks.push(block);
      payloads.push(mySolution.payload);
    }

    const txData = this.rootBridge.encodeFinalize(
      firstBlockNumber,
      payloads
    );
    const receipt = await this.wrapSendTransaction(txData);
    this.log(TAG, Number(receipt.gasUsed));

    // TODO: maybe move this to `forwardChain`
    for (const block of blocks) {
      // all blocks except the latest submitted block are safe to prune
      if (this.pendingBlock.prevBlock !== block) {
        block.prune();
      }
    }

    return true;
  }

  async dispute (blockNumbers) {
    this.log(`dispute: ${blockNumbers}`);

    const receipt = await this.wrapSendTransaction(this.rootBridge.encodeDispute(blockNumbers));

    this.log(`txHash: ${receipt.transactionHash} status:${receipt.status}`);
  }

  async directReplay (blockNumber) {
    const block = await this.getBlockByNumber(blockNumber);

    if (!block) {
      return false;
    }

    await this.processChallenge(block);

    return true;
  }

  async processChallenge (block) {
    const TAG = `Bridge.challenge(${block.number})`;
    const cBlock = await this.rootBridge.finalizedHeight();

    if (cBlock >= block.number) {
      this.log(TAG, 'ALREADY COMPLETED');
      return;
    }

    let lastChallengeOffset = await this.rootBridge.challengeOffset();
    let cumulative = 0;
    try {
      let ctr = 0;
      while (true) {
        const lBlock = await this.rootBridge.finalizedHeight();

        if (lBlock >= block.number) {
          // done
          this.log(TAG, 'done', cumulative);
          break;
        }

        lastChallengeOffset = await this.rootBridge.challengeOffset();
        const challengeData = await block.computeChallenge(lastChallengeOffset, this);
        let tx;
        {
          // the nodes in the ethereum network have a (hardcoded in clienst) limit
          // for transactions arriving in the mempool.
          // This is not consensus related but if a transaction becomes too large,
          // then we have problem.
          const MAX_SAFE_CALLDATA_SIZE = 63 << 10;
          const rootBlock = await this.rootBridge.fetchJson('eth_getBlockByNumber', ['latest', false]);
          const maxGas = ~~Number(rootBlock.gasLimit);
          // Use 1/4 of the block gas limit as our target
          // TODO: make this configurable
          //const targetGas = ~~(maxGas * 0.25);

          const witnesses = challengeData.witnesses;
          while (witnesses.length >= 0) {
            const rounds = witnesses.length || 1;
            let tmp = Object.assign({}, challengeData);
            tmp.rounds = rounds;
            tmp.witnesses = witnesses;

            tmp = this.rootBridge.encodeChallenge(tmp);
            if (((tmp.data.length / 2) - 2) >= MAX_SAFE_CALLDATA_SIZE) {
              this.log(TAG, `Exceeded safe transaction size. Reducing payload.`);
              witnesses.pop();
              continue;
            }

            tmp.from = '0x'.padEnd(42, '1');
            tmp.gas = `0x${maxGas.toString(16)}`;

            let callRes;
            try {
              callRes = await this.rootBridge.fetchJson('eth_call', [tmp, 'latest']);
            } catch (e) {
              this.log(TAG, e);
              callRes = '0x0';
            }

            const complete = Number(callRes.substring(0, 66));
            const challengeOffset = Number('0x' + callRes.substring(66, 130));

            this.log(TAG, { rounds, complete, challengeOffset });

            if (complete || challengeOffset > lastChallengeOffset) {
              tx = tmp;
              break;
            }

            if (!witnesses.length) {
              break;
            }
            witnesses.pop();
          }

          if (!tx) {
            throw new Error('Unable to engage challenge');
          }
        }

        const receipt = await this.wrapSendTransaction(tx);
        cumulative += Number(receipt.gasUsed);

        ctr++;

        this.log(TAG, `step = ${ctr}`, Number(receipt.gasUsed));
      }
    } catch (e) {
      const cBlock = await this.rootBridge.finalizedHeight();
      if (cBlock >= block.number) {
        this.log(TAG, 'ALREADY COMPLETED');
        return;
      }

      this.log(TAG, e);
    }
  }

  async rpcCall (body) {
    const method = body.method;
    const { id, jsonrpc } = body;

    {
      // TODO: replace simple api key with nonce + HMAC or nonce + signature
      const authenticated = this.rpcApiKey ? body.auth === this.rpcApiKey : false;
      if (
        !method ||
        ((method.startsWith('debug') && (!this.debugMode && !authenticated))) ||
        (this.disabledRpcMethods.indexOf(method) !== -1 && !authenticated)
      ) {
        return {
          id,
          jsonrpc,
          error: {
            code: -32601,
            message: 'DebugMode is not enabled or request is not authenticated',
          }
        };
      }
    }

    if (Methods.hasOwnProperty(method)) {
      const func = Methods[method];

      try {
        if (!this.ready) {
          throw new Error('Bridge is not ready yet');
        }

        return {
          id,
          jsonrpc,
          result: await func.call(Methods, body, this)
        };
      } catch (e) {
        this.log(e);

        return {
          id,
          jsonrpc,
          error: {
            code: -32000,
            message: (e.message || e).toString(),
          }
        };
      }
    }

    return {
      id,
      jsonrpc,
      error: {
        code: -32601,
        message: `The method ${method} does not exist/is not available`,
      }
    };
  }

  async wrapSendTransaction (txData) {
    if (!this.signer) {
      throw new Error('Read-only mode');
    }

    const tx = {
      from: this.signer,
      to: txData.to,
      // TODO: make this a config option
      gasPrice: txData.gasPrice || '0x' + (~~(Number(await this.rootBridge.fetchJson('eth_gasPrice', [])) * 1.3)).toString(16),
      data: txData.data || '0x',
    };

    if (!tx.gas) {
      // TODO: make gasPadding a config option
      const gasPadding = 50000;
      tx.gas = `0x${(Number((await this.rootBridge.fetchJson('eth_estimateGas', [tx]))) + gasPadding).toString(16)}`;
      const ret = await this.rootBridge.fetchJson('eth_createAccessList', [tx, 'latest']);
      if (ret.error) {
        throw new Error(ret.error);
      }
      tx.accessList = ret.accessList;
    }

    tx.nonce = Number(await this.rootBridge.fetchJson('eth_getTransactionCount', [this.signer, 'pending']));

    const { txHash, rawTxHex } = await signRlpTransaction(tx, this.privKey, this.CHAIN_ID);

    await this.rootBridge.fetchJson('eth_sendRawTransaction', [rawTxHex]);

    // TODO bound loop size
    while (true) {
      const latestNonce = Number(await this.rootBridge.fetchJson('eth_getTransactionCount', [this.signer, 'pending']));

      if (latestNonce > tx.nonce) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    let receipt;
    while (true) {
      receipt = await this.rootBridge.fetchJson('eth_getTransactionReceipt', [txHash]);

      if (receipt) {
        if (Number(receipt.status) === 0) {
          throw new Error(`transaction reverted`);
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return receipt;
  }

  shouldSubmitNextBlock () {
    // TODO: support more than one
    if (this.disableBlockProduction || this._pendingBlockSubmission || !this.pendingBlock.transactions.length) {
      return false;
    }

    if (this.pendingBlock.submissionDeadline !== 0) {
      // TODO: make this a config option or calculate block submission time averages
      // 180 seconds
      const submissionTime = 180;
      const now = ~~(Date.now() / 1000);
      const shouldSubmit = now >= (this.pendingBlock.submissionDeadline - submissionTime);

      this.log(`should submit next block because of transaction deadline: ${shouldSubmit} delta: ${this.pendingBlock.submissionDeadline - now}`);

      if (shouldSubmit) {
        return shouldSubmit;
      }
    }

    const timeSinceLastSubmission = Date.now() - this._lastBlockSubmission;
    const size = this.pendingBlock.calculateSize();

    return size >= this.blockSizeThreshold || timeSinceLastSubmission >= this.blockTimeThreshold;
  }
}

var OPCODES = {
  // name, off stack, on stack
  0x00: ['STOP', 0, 0],
  0x01: ['ADD', 2, 1],
  0x02: ['MUL', 2, 1],
  0x03: ['SUB', 2, 1],
  0x04: ['DIV', 2, 1],
  0x05: ['SDIV', 2, 1],
  0x06: ['MOD', 2, 1],
  0x07: ['SMOD', 2, 1],
  0x08: ['ADDMOD', 3, 1],
  0x09: ['MULMOD', 3, 1],
  0x0a: ['EXP', 2, 1],
  0x0b: ['SIGNEXTEND', 2, 1],
  0x10: ['LT', 2, 1],
  0x11: ['GT', 2, 1],
  0x12: ['SLT', 2, 1],
  0x13: ['SGT', 2, 1],
  0x14: ['EQ', 2, 1],
  0x15: ['ISZERO', 1, 1],
  0x16: ['AND', 2, 1],
  0x17: ['OR', 2, 1],
  0x18: ['XOR', 2, 1],
  0x19: ['NOT', 1, 1],
  0x1a: ['BYTE', 2, 1],
  0x1b: ['SHL', 2, 1],
  0x1c: ['SHR', 2, 1],
  0x1d: ['SAR', 2, 1],
  0x20: ['SHA3', 2, 1],
  0x30: ['ADDRESS', 0, 1],
  0x31: ['BALANCE', 1, 1],
  0x32: ['ORIGIN', 0, 1],
  0x33: ['CALLER', 0, 1],
  0x34: ['CALLVALUE', 0, 1],
  0x35: ['CALLDATALOAD', 1, 1],
  0x36: ['CALLDATASIZE', 0, 1],
  0x37: ['CALLDATACOPY', 3, 0],
  0x38: ['CODESIZE', 0, 1],
  0x39: ['CODECOPY', 3, 0],
  0x3a: ['GASPRICE', 0, 1],
  0x3b: ['EXTCODESIZE', 1, 1],
  0x3c: ['EXTCODECOPY', 4, 0],
  0x3d: ['RETURNDATASIZE', 0, 1],
  0x3e: ['RETURNDATACOPY', 3, 0],
  0x3f: ['EXTCODEHASH', 1, 1],
  0x40: ['BLOCKHASH', 1, 1],
  0x41: ['COINBASE', 0, 1],
  0x42: ['TIMESTAMP', 0, 1],
  0x43: ['NUMBER', 0, 1],
  0x44: ['DIFFICULTY', 0, 1],
  0x45: ['GASLIMIT', 0, 1],
  0x46: ['CHAINID', 0, 1],
  0x47: ['SELFBALANCE', 0, 1],
  0x50: ['POP', 1, 0],
  0x51: ['MLOAD', 1, 1],
  0x52: ['MSTORE', 2, 0],
  0x53: ['MSTORE8', 2, 0],
  0x54: ['SLOAD', 1, 1],
  0x55: ['SSTORE', 2, 0],
  0x56: ['JUMP', 1, 0],
  0x57: ['JUMPI', 2, 0],
  0x58: ['PC', 0, 1],
  0x59: ['MSIZE', 0, 1],
  0x5a: ['GAS', 0, 1],
  0x5b: ['JUMPDEST', 0, 0],
  0x60: ['PUSH', 0, 1],
  0x61: ['PUSH', 0, 1],
  0x62: ['PUSH', 0, 1],
  0x63: ['PUSH', 0, 1],
  0x64: ['PUSH', 0, 1],
  0x65: ['PUSH', 0, 1],
  0x66: ['PUSH', 0, 1],
  0x67: ['PUSH', 0, 1],
  0x68: ['PUSH', 0, 1],
  0x69: ['PUSH', 0, 1],
  0x6a: ['PUSH', 0, 1],
  0x6b: ['PUSH', 0, 1],
  0x6c: ['PUSH', 0, 1],
  0x6d: ['PUSH', 0, 1],
  0x6e: ['PUSH', 0, 1],
  0x6f: ['PUSH', 0, 1],
  0x70: ['PUSH', 0, 1],
  0x71: ['PUSH', 0, 1],
  0x72: ['PUSH', 0, 1],
  0x73: ['PUSH', 0, 1],
  0x74: ['PUSH', 0, 1],
  0x75: ['PUSH', 0, 1],
  0x76: ['PUSH', 0, 1],
  0x77: ['PUSH', 0, 1],
  0x78: ['PUSH', 0, 1],
  0x79: ['PUSH', 0, 1],
  0x7a: ['PUSH', 0, 1],
  0x7b: ['PUSH', 0, 1],
  0x7c: ['PUSH', 0, 1],
  0x7d: ['PUSH', 0, 1],
  0x7e: ['PUSH', 0, 1],
  0x7f: ['PUSH', 0, 1],
  0x80: ['DUP', 0, 1],
  0x81: ['DUP', 0, 1],
  0x82: ['DUP', 0, 1],
  0x83: ['DUP', 0, 1],
  0x84: ['DUP', 0, 1],
  0x85: ['DUP', 0, 1],
  0x86: ['DUP', 0, 1],
  0x87: ['DUP', 0, 1],
  0x88: ['DUP', 0, 1],
  0x89: ['DUP', 0, 1],
  0x8a: ['DUP', 0, 1],
  0x8b: ['DUP', 0, 1],
  0x8c: ['DUP', 0, 1],
  0x8d: ['DUP', 0, 1],
  0x8e: ['DUP', 0, 1],
  0x8f: ['DUP', 0, 1],
  0x90: ['SWAP', 0, 0],
  0x91: ['SWAP', 0, 0],
  0x92: ['SWAP', 0, 0],
  0x93: ['SWAP', 0, 0],
  0x94: ['SWAP', 0, 0],
  0x95: ['SWAP', 0, 0],
  0x96: ['SWAP', 0, 0],
  0x97: ['SWAP', 0, 0],
  0x98: ['SWAP', 0, 0],
  0x99: ['SWAP', 0, 0],
  0x9a: ['SWAP', 0, 0],
  0x9b: ['SWAP', 0, 0],
  0x9c: ['SWAP', 0, 0],
  0x9d: ['SWAP', 0, 0],
  0x9e: ['SWAP', 0, 0],
  0x9f: ['SWAP', 0, 0],
  0xa0: ['LOG', 2, 0],
  0xa1: ['LOG', 3, 0],
  0xa2: ['LOG', 4, 0],
  0xa3: ['LOG', 5, 0],
  0xa4: ['LOG', 6, 0],
  0xf0: ['CREATE', 3, 1],
  0xf1: ['CALL', 7, 1],
  0xf2: ['CALLCODE', 7, 1],
  0xf3: ['RETURN', 2, 0],
  0xf4: ['DELEGATECALL', 6, 1],
  0xf5: ['CREATE2', 4, 1],
  0xfa: ['STATICCALL', 6, 1],
  0xfd: ['REVERT', 2, 0],
  0xfe: ['INVALID', 0, 0],
  0xff: ['SELFDESTRUCT', 1, 0],
};

const ERRNO_MAP =
  {
    'stack overflow': 0x01,
    'stack underflow': 0x02,
    'invalid opcode': 0x04,
    'invalid JUMP': 0x05,
    'instruction not supported': 0x06,
    'revert': 0x07,
    'static state change': 0x0b,
    'out of gas': 0x0d,
    'internal error': 0xff,
  };

const ERROR = {
  OUT_OF_GAS: 'out of gas',
  STACK_UNDERFLOW: 'stack underflow',
  STACK_OVERFLOW: 'stack overflow',
  INVALID_JUMP: 'invalid JUMP',
  INSTRUCTION_NOT_SUPPORTED: 'instruction not supported',
  INVALID_OPCODE: 'invalid opcode',
  REVERT: 'revert',
  STATIC_STATE_CHANGE: 'static state change',
  INTERNAL_ERROR: 'internal error',
};

function VmError (error) {
  this.error = error;
  this.errorType = 'VmError';
}
const ADDRESS_ZERO = ''.padStart(40, '0');
const MAX_INTEGER = BigInt.asUintN(256, '-1');
const SIGN_MASK = BigInt(2) ** BigInt(255);
const BIG_ZERO$3 = BigInt(0);
const BIG_ONE$2 = BigInt(1);
const BIG_TWO = BigInt(2);
const MEM_LIMIT = BigInt(2 << 20);
// https://eips.ethereum.org/EIPS/eip-1352
const MAX_PRECOMPILE$1 = BigInt(0xffff);

function toUint (v) {
  return BigInt.asUintN(256, v);
}

function toInt (v) {
  return BigInt.asIntN(256, v);
}

class EVMRuntime {
  constructor () {
    this._routines = [];

    for (let i = 0; i <= 0xff; i++) {
      const opInfo = OPCODES[i] || ['INVALID', 0, 0];
      this._routines[i] = this[opInfo[0]];
    }
  }

  async runNextStep (runState) {
    let exceptionError;
    try {
      const opCode = runState.code[runState.programCounter];
      const opInfo = OPCODES[opCode] || ['INVALID', 0, 0];
      const stackIn = opInfo[1];
      const stackOut = opInfo[2];

      if (runState.stack.length < stackIn) {
        throw new VmError(ERROR.STACK_UNDERFLOW);
      }

      if ((runState.stack.length - stackIn + stackOut) > 1024) {
        throw new VmError(ERROR.STACK_OVERFLOW);
      }

      runState.programCounter++;

      await this._routines[opCode].call(this, runState, opCode);
    } catch (e) {
      exceptionError = e;
    }

    let errno = 0;
    if (exceptionError) {
      errno = ERRNO_MAP[exceptionError.error];

      if (!errno) {
        // re-throw if it's not a vm error
        throw exceptionError;
      }

      runState.vmError = true;
    }

    if (errno !== 0 || runState.stopped) {
      // pc should not be incremented, reverse the above
      runState.programCounter--;
    }

    runState.errno = errno;
  }

  async initRunState (obj) {
    const runState = {
      code: obj.code,
      callData: obj.data,
      // caller & origin are the same in our case
      caller: obj.caller || obj.origin || ADDRESS_ZERO,
      origin: obj.origin || ADDRESS_ZERO,
      address: obj.address || ADDRESS_ZERO,
      memory: [],
      stack: [],
      memoryWordCount: 0,
      programCounter: obj.pc | 0,
      errno: 0,
      vmError: false,
      stopped: false,
      returnValue: [],
      validJumps: {},
      upstreamCall: obj.upstreamCall,
    };

    const len = runState.code.length;

    for (let i = 0; i < len; i++) {
      const op = OPCODES[runState.code[i]] || ['INVALID'];

      if (op[0] === 'PUSH') {
        i += runState.code[i] - 0x5f;
      }

      if (op[0] === 'JUMPDEST') {
        runState.validJumps[i] = true;
      }
    }

    if (obj.stack) {
      const len = obj.stack.length;

      for (let i = 0; i < len; i++) {
        runState.stack.push(BigInt(obj.stack[i]));
      }
    }

    if (obj.mem) {
      const len = obj.mem.length;

      for (let i = 0; i < len; i++) {
        const memSlot = obj.mem[i];

        runState.memoryWordCount++;

        for (let x = 2; x < 66;) {
          const hexVal = memSlot.substring(x, x += 2);

          runState.memory.push(hexVal ? parseInt(hexVal, 16) : 0);
        }
      }
    }

    return runState;
  }

  async run (args) {
    const runState = await this.initRunState(args);
    this.stepCount = this.stepCount | 0;

    while (!runState.stopped && !runState.vmError && runState.programCounter < runState.code.length) {
      await this.runNextStep(runState);

      if (this.stepCount !== 0) {
        if (--this.stepCount === 0) {
          runState.errno = 0xff;
          break;
        }
      }
    }

    return runState;
  }

  async STOP (runState) {
    runState.stopped = true;
  }

  async ADD (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(toUint(a + b));
  }

  async MUL (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(toUint(a * b));
  }

  async SUB (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(toUint(a - b));
  }

  async DIV (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();
    let r;

    if (b === BIG_ZERO$3) {
      r = b;
    } else {
      r = a / b;
    }
    runState.stack.push(r);
  }

  async SDIV (runState) {
    let a = toInt(runState.stack.pop());
    let b = toInt(runState.stack.pop());
    let r;

    if (b === BIG_ZERO$3) {
      r = b;
    } else {
      r = toUint(a / b);
    }
    runState.stack.push(r);
  }

  async MOD (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();
    let r;

    if (b === BIG_ZERO$3) {
      r = b;
    } else {
      r = a % b;
    }
    runState.stack.push(r);
  }

  async SMOD (runState) {
    let a = runState.stack.pop();
    let b = runState.stack.pop();
    let r;

    if (b === BIG_ZERO$3) {
      r = b;
    } else {
      r = toUint(toInt(a) % toInt(b));
    }
    runState.stack.push(r);
  }

  async ADDMOD (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();
    const c = runState.stack.pop();
    let r;

    if (c === BIG_ZERO$3) {
      r = c;
    } else {
      r = (a + b) % c;
    }
    runState.stack.push(r);
  }

  async MULMOD (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();
    const c = runState.stack.pop();
    let r;

    if (c === BIG_ZERO$3) {
      r = c;
    } else {
      r = (a * b) % c;
    }
    runState.stack.push(r);
  }

  async EXP (runState) {
    const base = runState.stack.pop();
    const exponent = runState.stack.pop();

    if (exponent === BIG_ZERO$3) {
      runState.stack.push(BIG_ONE$2);
      return;
    }

    if (base === BIG_ZERO$3) {
      runState.stack.push(BIG_ZERO$3);
      return;
    }

    let r = BIG_ONE$2;
    let b = base;
    let e = exponent;

    while (true) {
      if (e % BIG_TWO === BIG_ONE$2) {
        r = toUint(r * b);
      }

      e /= BIG_TWO;

      if (e === BIG_ZERO$3) {
        break;
      }

      b = toUint(b * b);
    }

    runState.stack.push(r);
  }

  async SIGNEXTEND (runState) {
    const k = runState.stack.pop();
    let val = runState.stack.pop();

    if (k < BigInt(31)) {
      const signBit = (k * BigInt(8)) + BigInt(7);
      const mask = (BIG_ONE$2 << signBit);
      const fmask = mask - BIG_ONE$2;

      if (val & mask) {
        val = toUint(val | ~fmask);
      } else {
        val = val & fmask;
      }
    }

    runState.stack.push(val);
  }

  async LT (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a < b ? BIG_ONE$2 : BIG_ZERO$3);
  }

  async GT (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a > b ? BIG_ONE$2 : BIG_ZERO$3);
  }

  async SLT (runState) {
    const a = toInt(runState.stack.pop());
    const b = toInt(runState.stack.pop());

    runState.stack.push(a < b ? BIG_ONE$2 : BIG_ZERO$3);
  }

  async SGT (runState) {
    const a = toInt(runState.stack.pop());
    const b = toInt(runState.stack.pop());

    runState.stack.push(a > b ? BIG_ONE$2 : BIG_ZERO$3);
  }

  async EQ (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a === b ? BIG_ONE$2 : BIG_ZERO$3);
  }

  async ISZERO (runState) {
    const a = runState.stack.pop();

    runState.stack.push(a === BIG_ZERO$3 ? BIG_ONE$2 : BIG_ZERO$3);
  }

  async AND (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a & b);
  }

  async OR (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a | b);
  }

  async XOR (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a ^ b);
  }

  async NOT (runState) {
    const a = runState.stack.pop();

    runState.stack.push(toUint(~a));
  }

  async BYTE (runState) {
    const pos = runState.stack.pop();
    const word = runState.stack.pop();

    if (pos > BigInt(31)) {
      runState.stack.push(BIG_ZERO$3);
      return;
    }

    runState.stack.push((word >> (BigInt(248) - (pos * BigInt(8)))) & BigInt(0xff));
  }

  async SHL (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    if (a >= BigInt(256)) {
      runState.stack.push(BIG_ZERO$3);
      return;
    }

    runState.stack.push(toUint(b << a));
  }

  async SHR (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    if (a >= BigInt(256)) {
      runState.stack.push(BIG_ZERO$3);
      return;
    }

    runState.stack.push(b >> a);
  }

  async SAR (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();
    const isSigned = b & SIGN_MASK;
    let r;

    if (a >= BigInt(256)) {
      if (isSigned) {
        r = MAX_INTEGER;
      } else {
        r = BIG_ZERO$3;
      }
      runState.stack.push(r);
      return;
    }

    const c = b >> a;
    if (isSigned) {
      const shiftedOutWidth = BigInt(255) - a;
      const mask = MAX_INTEGER >> shiftedOutWidth << shiftedOutWidth;

      r = c | mask;
    } else {
      r = c;
    }
    runState.stack.push(r);
  }

  async SHA3 (runState) {
    const offset = runState.stack.pop();
    const length = runState.stack.pop();
    let data = [];

    if (offset + length > BigInt(MEM_LIMIT)) {
      throw new Error('MEM_LIMIT');
    }

    if (length !== BIG_ZERO$3) {
      data = this.memLoad(runState, offset, length);
    }

    runState.stack.push(BigInt(keccak256HexPrefix(data)));
  }

  async ADDRESS (runState) {
    runState.stack.push(BigInt('0x' + runState.address));
  }

  async BALANCE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async ORIGIN (runState) {
    runState.stack.push(BigInt('0x' + runState.origin));
  }

  async CALLER (runState) {
    runState.stack.push(BigInt('0x' + runState.caller));
  }

  async CALLVALUE (runState) {
    runState.stack.push(BIG_ZERO$3);
  }

  async CALLDATALOAD (runState) {
    const pos = Number(runState.stack.pop());

    if (pos >= runState.callData.length) {
      runState.stack.push(BIG_ZERO$3);
      return;
    }

    let ret = BIG_ZERO$3;
    for (let i = 0; i < 32; i++) {
      if (pos + i < runState.callData.length) {
        const v = runState.callData[pos + i] | 0;
        ret = ret | (BigInt(v) << BigInt(248 - (i * 8)));
      }
    }

    runState.stack.push(ret);
  }

  async CALLDATASIZE (runState) {
    runState.stack.push(BigInt(runState.callData.length));
  }

  async CALLDATACOPY (runState) {
    const memOffset = runState.stack.pop();
    const dataOffset = runState.stack.pop();
    const dataLength = runState.stack.pop();

    this.memStore(runState, memOffset, runState.callData, dataOffset, dataLength);
  }

  async CODESIZE (runState) {
    runState.stack.push(BigInt(runState.code.length));
  }

  async CODECOPY (runState) {
    const memOffset = runState.stack.pop();
    const codeOffset= runState.stack.pop();
    const length = runState.stack.pop();

    this.memStore(runState, memOffset, runState.code, codeOffset, length);
  }

  async EXTCODESIZE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async EXTCODECOPY (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async EXTCODEHASH (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async RETURNDATASIZE (runState) {
    runState.stack.push(BigInt(runState.returnValue.length));
  }

  async RETURNDATACOPY (runState) {
    const memOffset = runState.stack.pop();
    const returnDataOffset = runState.stack.pop();
    const length = runState.stack.pop();

    if (returnDataOffset + length > BigInt(runState.returnValue.length)) {
      throw new VmError(ERROR.OUT_OF_GAS);
    }

    this.memStore(runState, memOffset, runState.returnValue, returnDataOffset, length);
  }

  async GASPRICE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async BLOCKHASH (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async COINBASE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async TIMESTAMP (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async NUMBER (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async DIFFICULTY (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async GASLIMIT (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async CHAINID (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async SELFBALANCE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async POP (runState) {
    runState.stack.pop();
  }

  async MLOAD (runState) {
    const pos = runState.stack.pop();

    runState.stack.push(BigInt(toHexPrefix(this.memLoad(runState, pos, BigInt(32)))));
  }

  async MSTORE (runState) {
    const offset = runState.stack.pop();
    let word = runState.stack.pop();

    word = arrayify(word.toString(16).padStart(64, '0'));
    this.memStore(runState, offset, word, BIG_ZERO$3, BigInt(32));
  }

  async MSTORE8 (runState) {
    const offset = runState.stack.pop();
    let byte = runState.stack.pop();

    // NOTE: we're using a 'trick' here to get the least significant byte
    byte = [Number(byte & BigInt(0xff))];
    this.memStore(runState, offset, byte, BIG_ZERO$3, BIG_ONE$2);
  }

  async SLOAD (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async SSTORE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async JUMP (runState) {
    const dest = runState.stack.pop();

    if (dest >= BigInt(runState.code.length)) {
      throw new VmError(ERROR.INVALID_JUMP);
    }

    const destNum = Number(dest);

    if (!runState.validJumps[destNum]) {
      throw new VmError(ERROR.INVALID_JUMP);
    }

    runState.programCounter = destNum;
  }

  async JUMPI (runState) {
    const dest = runState.stack.pop();
    const cond = runState.stack.pop();

    if (cond !== BIG_ZERO$3) {
      if (dest >= BigInt(runState.code.length)) {
        throw new VmError(ERROR.INVALID_JUMP);
      }

      const destNum = Number(dest);

      if (!runState.validJumps[destNum]) {
        throw new VmError(ERROR.INVALID_JUMP);
      }

      runState.programCounter = destNum;
    }
  }

  async PC (runState) {
    runState.stack.push(BigInt(runState.programCounter - 1));
  }

  async MSIZE (runState) {
    runState.stack.push(BigInt(runState.memoryWordCount * 32));
  }

  async GAS (runState) {
    runState.stack.push(MAX_INTEGER);
  }

  async JUMPDEST (runState) {
  }

  async PUSH (runState, opCode) {
    // needs to be right-padded with zero
    const numToPush = opCode - 0x5f;
    const t = new Uint8Array(numToPush);
    for (let i = 0; i < numToPush; i++) {
      const val = runState.programCounter + i;

      if (val < runState.code.length) {
        t[i] = runState.code[val];
      }
    }
    const result = BigInt(toHexPrefix(t));

    runState.programCounter += numToPush;
    runState.stack.push(result);
  }

  async DUP (runState, opCode) {
    const stackPos = opCode - 0x7f;

    if (stackPos > runState.stack.length) {
      throw new VmError(ERROR.STACK_UNDERFLOW);
    }

    runState.stack.push(runState.stack[runState.stack.length - stackPos]);
  }

  async SWAP (runState, opCode) {
    const stackPos = opCode - 0x8f;
    const swapIndex = runState.stack.length - stackPos - 1;

    if (swapIndex < 0) {
      throw new VmError(ERROR.STACK_UNDERFLOW);
    }

    const topIndex = runState.stack.length - 1;
    const tmp = runState.stack[topIndex];

    runState.stack[topIndex] = runState.stack[swapIndex];
    runState.stack[swapIndex] = tmp;
  }

  async LOG (runState, opCode) {
    const val = (opCode - 0xa0) + 2;

    runState.stack.splice(runState.stack.length - val);
  }

  async CREATE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async CREATE2 (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async CALL (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async CALLCODE (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async DELEGATECALL (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async STATICCALL (runState) {
    const target = runState.stack[runState.stack.length - 2] || BigInt(0xff);

    if (target >= BIG_ZERO$3 && target <= MAX_PRECOMPILE$1) {
      // gasLimit
      runState.stack.pop();
      const toAddress = runState.stack.pop();
      const inOffset = runState.stack.pop();
      const inLength = runState.stack.pop();
      const outOffset = runState.stack.pop();
      const outLength = runState.stack.pop();
      const data = this.memLoad(runState, inOffset, inLength);

      let success = 0n;
      try {
        const returnValue = await runState.upstreamCall(
          {
            to: '0x' + toAddress.toString(16).padStart(40, '0'),
            data: toHexPrefix(data),
          }
        );
        this.memStore(runState, outOffset, arrayify(returnValue), BIG_ZERO$3, outLength);
        runState.returnValue = returnValue;
        success = 1n;
      } catch (e) {
        console.error('EVMRuntime:catched', e);
        runState.returnValue = [];
      }

      runState.stack.push(success);

      return;
    }

    runState.returnValue = [];
    runState.stack = runState.stack.slice(0, runState.stack.length - 6);
    runState.stack.push(BIG_ZERO$3);

    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async RETURN (runState) {
    const offset = runState.stack.pop();
    const length = runState.stack.pop();

    if (offset + length > MEM_LIMIT) {
      throw new Error('RETURN MEM_LIMIT');
    }

    runState.stopped = true;
    runState.returnValue = this.memLoad(runState, offset, length);
  }

  async REVERT (runState) {
    const offset = runState.stack.pop();
    const length = runState.stack.pop();

    runState.returnValue = this.memLoad(runState, offset, length);
    throw new VmError(ERROR.REVERT);
  }

  async SELFDESTRUCT (runState) {
    throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
  }

  async INVALID (runState) {
    throw new VmError(ERROR.INVALID_OPCODE);
  }

  memStore (runState, offset, val, valOffset, length) {
    if (length === BIG_ZERO$3) {
      return;
    }

    if (offset + length > MEM_LIMIT || valOffset + length > MEM_LIMIT) {
      throw new Error('memStore MEM_LIMIT');
    }

    offset = Number(offset);
    valOffset = Number(valOffset);
    length = Number(length);

    const words = ~~((offset + length + 31) / 32);

    if (words > runState.memoryWordCount) {
      runState.memoryWordCount = words;
    }

    let safeLen = 0;
    if (valOffset + length > val.length) {
      if (valOffset >= val.length) {
        safeLen = 0;
      } else {
        safeLen = val.length - valOffset;
      }
    } else {
      safeLen = val.length;
    }

    let i = 0;

    if (safeLen > 0) {
      safeLen = safeLen > length ? length : safeLen;
      for (; i < safeLen; i++) {
        runState.memory[offset + i] = val[valOffset + i];
      }
    }

    if (val.length > 0 && i < length) {
      for (; i < length; i++) {
        runState.memory[offset + i] = 0;
      }
    }
  }

  memLoad (runState, offset, length) {
    if (length === BIG_ZERO$3) {
      return [];
    }

    if (offset + length > MEM_LIMIT) {
      throw new Error('memLoad MEM_LIMIT');
    }

    offset = Number(offset);
    length = Number(length);

    const words = ~~((offset + length + 31) / 32);

    if (words > runState.memoryWordCount) {
      runState.memoryWordCount = words;
    }

    const loaded = runState.memory.slice(offset, offset + length);

    for (let i = loaded.length; i < length; i++) {
      loaded[i] = 0;
    }

    return loaded;
  }
}

const BIG_ZERO$2 = BigInt(0);
const BIG_ONE$1 = BigInt(1);
const MAX_PRECOMPILE = BigInt(0xffff);
// https://eips.ethereum.org/EIPS/eip-1352

function toAddress (val) {
  return '0x' + BigInt.asUintN(160, val).toString(16).padStart(40, '0');
}

class V1Runtime extends EVMRuntime {
  async initRunState (obj) {
    const runState = await super.initRunState(obj);

    runState.customEnvironment = obj.customEnvironment;
    runState.logs = [];
    runState.bridge = obj.bridge;
    runState.playgroundEnabled = !!(obj.bridge ? obj.bridge.featureFlags & 1 : 0);
    runState.isStatic = !!obj.isStatic;
    runState.upstreamCall = async function (tx) {
      // TODO: proper exception handling
      return await runState.bridge.rootBridge.fetchJson(
        'eth_call',
        [tx, 'latest']
      );
    };

    return runState;
  }

  async TIMESTAMP (runState) {
    runState.stack.push(this.timestamp);
  }

  async CHAINID (runState) {
    runState.stack.push(BigInt(runState.bridge.CHAIN_ID));
  }

  async EXTCODESIZE (runState) {
    const addr = toAddress(runState.stack.pop());
    const code = await runState.bridge.getCode(addr);

    runState.stack.push(BigInt((code.length - 2) / 2));
  }

  async EXTCODECOPY (runState) {
    const addr = toAddress(runState.stack.pop());
    const memOffset = runState.stack.pop();
    const codeOffset= runState.stack.pop();
    const length = runState.stack.pop();
    const code = arrayify(await runState.bridge.getCode(addr));

    this.memStore(runState, memOffset, code, codeOffset, length);
  }

  async EXTCODEHASH (runState) {
    const addr = toAddress(runState.stack.pop());
    const code = arrayify(await runState.bridge.getCode(addr));
    const hash = keccak256HexPrefix(code);

    runState.stack.push(BigInt(hash));
  }

  async LOG (runState, opCode) {
    if (runState.isStatic) {
      throw new VmError(ERROR.STATIC_STATE_CHANGE);
    }

    const offset = runState.stack.pop();
    const len = runState.stack.pop();
    const data = toHexPrefix(this.memLoad(runState, offset, len));
    const topics = [];
    let numTopics = opCode - 0xa0;

    while (numTopics--) {
      topics.push('0x' + runState.stack.pop().toString(16).padStart(64, '0'));
    }

    const obj = {
      address: `0x${runState.address}`,
      topics,
      data,
    };
    runState.logs.push(obj);
  }

  async interceptCall (runState, target, dataBytes, retOffset, retSize, keepAddress, keepCaller, isStatic) {
    const targetAddressStr = target.toString(16).padStart(40, '0');

    if (!keepAddress && !keepCaller && !isStatic) {
      // if this is a CALL, then only allow this opcode for call to self.
      if (targetAddressStr !== runState.address) {
        throw new VmError(ERROR.INSTRUCTION_NOT_SUPPORTED);
      }
    }

    const code = arrayify(await runState.bridge.getCode('0x' + targetAddressStr));
    const data = dataBytes;
    const address = keepAddress ? runState.address : targetAddressStr;
    const origin = runState.origin;
    const caller = keepCaller ? runState.caller : runState.address;
    const inventory = runState.customEnvironment;
    const customEnvironment = inventory.clone();
    const bridge = runState.bridge;
    const state = await this.run(
      {
        address,
        origin,
        caller,
        code,
        data,
        customEnvironment,
        bridge,
        isStatic,
      }
    );

    const success = state.errno === 0;
    if (success) {
      inventory.storage = customEnvironment.storage;
      inventory.reads = customEnvironment.reads;
      inventory.writes = customEnvironment.writes;

      runState.logs = runState.logs.concat(state.logs);
      runState.stack.push(BIG_ONE$1);
    } else {
      runState.stack.push(BIG_ZERO$2);
    }

    if (state.errno === 0 || state.errno === 7) {
      runState.returnValue = state.returnValue;
      this.memStore(runState, retOffset, runState.returnValue, BIG_ZERO$2, retSize);
    } else {
      throw new Error(`V1Runtime execution error ${state.errno}`);
    }
  }

  async CALL (runState) {
    // gasLimit
    runState.stack.pop();
    const starget = runState.stack.pop();
    runState.stack.pop();
    const inOffset = runState.stack.pop();
    const inSize = runState.stack.pop();
    const retOffset = runState.stack.pop();
    const retSize = runState.stack.pop();
    const data = this.memLoad(runState, inOffset, inSize);

    await this.interceptCall(runState, starget, data, retOffset, retSize);
  }

  async STATICCALL (runState) {
    // skip for precompiles
    // this should basically work in all calls*, but LEVM is special
    const _target = runState.stack[runState.stack.length - 2];
    if (_target >= BIG_ZERO$2 && _target <= MAX_PRECOMPILE) {
      // route these calls through eth_call
      return super.STATICCALL(runState);
    }

    // gasLimit
    runState.stack.pop();
    const target = runState.stack.pop();
    const inOffset = runState.stack.pop();
    const inSize = runState.stack.pop();
    const retOffset = runState.stack.pop();
    const retSize = runState.stack.pop();
    const data = this.memLoad(runState, inOffset, inSize);

    // TODO: state changes possible
    await this.interceptCall(runState, target, data, retOffset, retSize, false, false, true);
  }

   async CALLCODE (runState) {
     // identical to call but only use the code from `target` and stay in the context of the current contract otherwise
     // gasLimit
     runState.stack.pop();
     const starget = runState.stack.pop();
     runState.stack.pop();
     const inOffset = runState.stack.pop();
     const inSize = runState.stack.pop();
     const retOffset = runState.stack.pop();
     const retSize = runState.stack.pop();
     const data = this.memLoad(runState, inOffset, inSize);

     await this.interceptCall(runState, starget, data, retOffset, retSize, true, false);
  }

  async DELEGATECALL (runState) {
    // identical to callcode but also keep caller and callvalue
    // gasLimit
    runState.stack.pop();
    const starget = runState.stack.pop();
    const inOffset = runState.stack.pop();
    const inSize = runState.stack.pop();
    const retOffset = runState.stack.pop();
    const retSize = runState.stack.pop();
    const data = this.memLoad(runState, inOffset, inSize);

    await this.interceptCall(runState, starget, data, retOffset, retSize, true, true);
  }

  async SLOAD (runState) {
    const msgSender = `0x${runState.address}`;
    const key = `0x${runState.stack.pop().toString(16).padStart(64, '0')}`;

    // TODO/FIXME: clarify that we only can modify state of our own contract
    if (msgSender === runState.bridge.rootBridge.protocolAddress) {
      const value = runState.customEnvironment.storageLoad(msgSender, key);
      runState.stack.push(BigInt(value));
    } else {
      // fetch the latest value from L1
      const value = await runState.bridge.rootBridge.fetchJson(
        'eth_getStorageAt', [msgSender, key, 'latest']
      );
      runState.stack.push(BigInt(value));
    }
  }

  async SSTORE (runState) {
    if (runState.isStatic) {
      throw new VmError(ERROR.STATIC_STATE_CHANGE);
    }

    const key = `0x${runState.stack.pop().toString(16).padStart(64, '0')}`;
    const value = `0x${runState.stack.pop().toString(16).padStart(64, '0')}`;

    runState.customEnvironment.storageStore(key, value);
  }
}

const keccak = new Keccak256();
const BIG_ZERO$1 = BigInt(0);
const BIG_ONE = BigInt(1);
const HASH_ONE = '01'.padStart(64, '0');

function newEmptyLeaf () {
  return { isBranch: false, hash: BIG_ZERO$1, key: BIG_ZERO$1, value: BIG_ZERO$1 };
}

class BalancedBinaryTree {
  clone () {
    const clonedTree = new this.constructor();

    Object.assign(clonedTree.root, this.root);

    const todo = [clonedTree.root];
    while (todo.length) {
      const node = todo.pop();
      if (node.left) {
        node.left = Object.assign({}, node.left);
        todo.push(node.left);
      }
      if (node.right) {
        node.right = Object.assign({}, node.right);
        todo.push(node.right);
      }
    }

    return clonedTree;
  }

  hash (left, right, isBranch) {
    if (isBranch) {
      return BigInt(
        '0x' +
        keccak.reset()
        .update(left.toString(16).padStart(64, '0'))
        .update(right.toString(16).padStart(64, '0'))
        .digest()
      );
    }

    return BigInt(
      '0x' +
      keccak.reset()
      .update(left.toString(16).padStart(64, '0'))
      .update(right.toString(16).padStart(64, '0'))
      .update(HASH_ONE)
      .digest()
    );
  }

  constructor () {
    this.root = {
      isBranch: false,
      left: null,
      right: null,
      hash: BIG_ZERO$1,
      key: BIG_ZERO$1,
      value: BIG_ZERO$1,
    };
    this.leaves = {};
  }

  updateNode (node) {
    if (node.isBranch) {
      node.key = BIG_ZERO$1;
      node.value = BIG_ZERO$1;
      node.hash = this.hash(
        node.left ? node.left.hash : BIG_ZERO$1,
        node.right ? node.right.hash : BIG_ZERO$1,
        true
      );
    }
  }

  add (key, value) {
    const path = [];
    // start with the root
    let node = this.root;
    let bits = BigInt(key);
    let depth = BIG_ZERO$1;

    while (true) {
      const goLeft = bits & BIG_ONE;

      if (node.isBranch) {
        node = goLeft ? node.left : node.right;
        path.push(node);
        bits = bits >> BIG_ONE;
        depth++;
        continue;
      }

      // fast case
      // (update or free space)
      if (node.value === BIG_ZERO$1 || node.key === key) {
        node.isBranch = false;
        if (value === BIG_ZERO$1) {
          // delete
          node.value = BIG_ZERO$1;
          node.key = BIG_ZERO$1;
          node.hash = BIG_ZERO$1;
          delete this.leaves[key];
        } else {
          node.value = value;
          node.key = key;
          node.hash = this.hash(key, value);
          this.leaves[key] = node;
        }
        break;
      }

      // at this point, the node is not a branch,
      // neither is it the node for `key`
      // and also not empty

      {
        // move it
        const oldLeaf = { isBranch: false, hash: node.hash, key: node.key, value: node.value };
        if (node.value !== BIG_ZERO$1) {
          this.leaves[node.key] = oldLeaf;
        } else {
          throw new Error('unexpected');
        }

        const _goLeft = (oldLeaf.key >> depth) & BIG_ONE;

        if (_goLeft) {
          node.left = oldLeaf;
          node.right = newEmptyLeaf();
        } else {
          node.right = oldLeaf;
          node.left = newEmptyLeaf();
        }

        // node becomes a branch
        node.isBranch = true;
        node.value = BIG_ZERO$1;
        node.key = BIG_ZERO$1;

        // resume the journey
        node = goLeft ? node.left : node.right;
        path.push(node);
        bits = bits >> BIG_ONE;
        depth++;
        continue;
      }
    }

    // update all nodes
    for (const node of path.reverse()) {
      this.updateNode(node);
    }
    // update root node
    this.updateNode(this.root);

    return this;
  }

  hasLeaf (key) {
    return this.leaves[key] !== undefined;
  }

  proofUniform (key) {
    const path = [];

    //if (this.root.hash === BIG_ZERO) {
    //  return path;
    //}

    // start with the root
    let node = this.root;
    let bits = BigInt(key);

    while (true) {
      const goLeft = bits & BIG_ONE;

      if (node.isBranch) {
        path.push(goLeft ? node.right.hash : node.left.hash);
        node = goLeft ? node.left : node.right;
        bits = bits >> BIG_ONE;
        continue;
      }

      path.push(node.value);
      path.push(node.key);

      return path.reverse();
    }

    return path;
  }

  // 3 scenarios
  // - insert
  // - update
  // - delete
  calculateUpdate (key, newValue, proofs) {
    const len = proofs.length;
    let ret = BIG_ZERO$1;
    let _k = BIG_ZERO$1;
    let _v = BIG_ZERO$1;

    if (newValue !== BIG_ZERO$1) {
      // insert or update
      // hash leaf
      ret = this.hash(key, newValue, false);
    }

    if (len) {
      if (len < 2) {
        throw new Error('invalid proof');
      }

      _k = proofs[0];
      _v = proofs[1];

      if (_v !== BIG_ZERO$1 && _k !== key) {
        // Update and create a new branch.
        // Compare against the key of the other leaf and loop until diverge.
        // Then create a new branch(es).

        let depth = BigInt(len - 2);

        while (true) {
          const bitmask = 1n << depth;
          const goLeft = key & bitmask;
          const otherLeft = _k & bitmask;

          if (goLeft === otherLeft) {
            depth++;
            continue;
          }

          const other = this.hash(_k, _v, false);
          if (goLeft) {
            ret = this.hash(ret, other, true);
          } else {
            ret = this.hash(other, ret, true);
          }
          break
        }

        const odepth = BigInt(len - 2);
        while (depth !== odepth) {
          depth--;
          const bitmask = 1n << depth;
          const goLeft = key & bitmask;
          if (goLeft) {
            ret = this.hash(ret, 0, true);
          } else {
            ret = this.hash(0, ret, true);
          }
        }
      }
    }

    let depth = BigInt(len - 2);
    for (let i = 2; i < len;) {
      depth--;
      const bitmask = 1n << depth;
      let goLeft = key & bitmask;

      const next = proofs[i++];

      if (goLeft) {
        ret = this.hash(ret, next, true);
      } else {
        ret = this.hash(next, ret, true);
      }
    }

    return ret;
  }

  verifyUniform (key, proofs) {
    const len = proofs.length;
    let _k = BIG_ZERO$1;
    let _v = BIG_ZERO$1;
    let ret = BIG_ZERO$1;
    let inTree = false;

    if (len) {
      if (len < 2) {
        return { valid: false, inTree: false, value: BIG_ZERO$1 };
      }

      _k = proofs[0];
      _v = proofs[1];

      // leafhash
      if (_v !== BIG_ZERO$1) {
        ret = this.hash(_k, _v, false);
        inTree = key === _k;
      }
    }

    let depth = BigInt(len - 2);
    for (let i = 2; i < len;) {
      depth--;
      const bitmask = 1n << depth;
      let goLeft = key & bitmask;

      const next = proofs[i++];

      if (goLeft) {
        ret = this.hash(ret, next, true);
      } else {
        ret = this.hash(next, ret, true);
      }
    }

    const valid = ret === this.root.hash;
    return {
      valid,
      inTree: valid ? inTree : false,
      value: valid && inTree ? _v : BIG_ZERO$1
    };
  }
}

var SUPPORTED_TYPES = {
  address: 20,
  bytes: 0,
  string: 0,
  bytes32: 32,
  bytes31: 31,
  bytes30: 30,
  bytes29: 29,
  bytes28: 28,
  bytes27: 27,
  bytes26: 26,
  bytes25: 25,
  bytes24: 24,
  bytes23: 23,
  bytes22: 22,
  bytes21: 21,
  bytes20: 20,
  bytes19: 19,
  bytes18: 18,
  bytes17: 17,
  bytes16: 16,
  bytes15: 15,
  bytes14: 14,
  bytes13: 13,
  bytes12: 12,
  bytes11: 11,
  bytes10: 10,
  bytes9: 9,
  bytes8: 8,
  bytes7: 7,
  bytes6: 6,
  bytes5: 5,
  bytes4: 4,
  bytes3: 3,
  bytes2: 2,
  bytes1: 1,
  uint256: 32,
  int256: 32,
  uint248: 31,
  int248: 31,
  uint240: 30,
  int240: 30,
  uint232: 29,
  int232: 29,
  uint224: 28,
  int224: 28,
  uint216: 27,
  int216: 27,
  uint208: 26,
  int208: 26,
  uint200: 25,
  int200: 25,
  uint192: 24,
  int192: 24,
  uint184: 23,
  int184: 23,
  uint176: 22,
  int176: 22,
  uint168: 21,
  int168: 21,
  uint160: 20,
  int160: 20,
  uint152: 19,
  int152: 19,
  uint144: 18,
  int144: 18,
  uint136: 17,
  int136: 17,
  uint128: 16,
  int128: 16,
  uint120: 15,
  int120: 15,
  uint112: 14,
  int112: 14,
  uint104: 13,
  int104: 13,
  uint96: 12,
  int96: 12,
  uint88: 11,
  int88: 11,
  uint80: 10,
  int80: 10,
  uint72: 9,
  int72: 9,
  uint64: 8,
  int64: 8,
  uint56: 7,
  int56: 7,
  uint48: 6,
  int48: 6,
  uint40: 5,
  int40: 5,
  uint32: 4,
  int32: 4,
  uint24: 3,
  int24: 3,
  uint16: 2,
  int16: 2,
  uint8: 1,
  int8: 1,
};

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

class TransactionBuilder {
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

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const BIG_ZERO = BigInt(0);
// _InternalReflectStorage(uint256, uin256)
const INTERNAL_EVENT_SET_STORAGE = '0x0000000000000000000000000000000000000000000000000000000000000001';
// ..
const INTERNAL_EVENT_SET_STORAGE_DELTA = '0x0000000000000000000000000000000000000000000000000000000000000002';
const INTERNAL_EVENT_DEADLINE_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000003';

const INTERNAL_TYPED_DATA = {
  types: {
    EIP712Domain: [
      { name: 'version', type: 'string' },
    ],
    Deposit: [
      { name: 'owner', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'tokenType', type: 'uint256' },
    ],
    CustomBlockBeacon: [
      { name: 'data', type: 'bytes' },
    ],
  },
  domain: {
    version: '1',
  },
  primaryTypes: ['Deposit', 'CustomBlockBeacon'],
};

const INTERNAL_TX_BUILDER = new TransactionBuilder(INTERNAL_TYPED_DATA, true);

class Block extends Block$1 {
  decodeTransactionLength (buf, offset, bridge) {
    return bridge.transactionBuilder.decodeLength(buf, offset);
  }

  encodeTx (tx, bridge) {
    const encoded = bridge.transactionBuilder.encode(tx);

    return bufToHex(encoded, 0, encoded.length);
  }

  decodeTx (rawStringOrArray, bridge) {
    const bytes = arrayify(rawStringOrArray);
    const tx = bridge.transactionBuilder.decode(bytes);

    tx.to = bridge.rootBridge.protocolAddress;
    tx.nonce = this.nonces[tx.from] || BIG_ZERO;

    return tx;
  }

  async addDeposit (obj, bridge) {
    const tx = await super.addDeposit(obj);
    tx.primaryType = 'Deposit';
    tx.message = {
      owner: obj.owner,
      token: obj.token,
      value: obj.value,
      tokenType: obj.tokenType,
    };

    const { errno, returnValue, logs } = await this.executeTx(tx, bridge, false, true);
    tx.logs = logs || [];
    tx.status = errno === 0 ? '0x1' : '0x0';
    tx.errno = errno;
    tx.returnData = returnValue;

    if (errno !== 0) {
      this.log(`Deposit error ${errno}`);
    }

    return tx;
  }

  async addCustomMessage (data, bridge) {
    const tx = await super.addCustomMessage(data, bridge);
    tx.primaryType = 'CustomBlockBeacon';
    tx.message = {
      data,
    };

    const { errno, returnValue, logs } = await this.executeTx(tx, bridge, false, true);
    tx.logs = logs || [];
    tx.status = errno === 0 ? '0x1' : '0x0';
    tx.errno = errno;
    tx.returnData = returnValue;

    if (errno !== 0) {
      this.log(`CustomMessage error ${errno}`);
    }

    return tx;
  }

  constructor (prevBlock) {
    super(prevBlock);

    // the token inventory
    // TODO move Inventory to a proper commit-log state manager
    this.inventory = prevBlock && prevBlock.inventory ? prevBlock.inventory.clone() : new Inventory();
    this.reflectedStorage = {};
    this.reflectedStorageDelta = {};

    if (this.inventory) {
      // clear any temp values
      this.inventory.clearCache();
    }
  }

  freeze () {
    super.freeze();

    // TODO
    // freeze other stuff too
    if (this.inventory) {
      this.inventory.freeze();
    }
  }

  prune () {
    super.prune();

    this.inventory = null;
    this.reflectedStorage = {};
    this.reflectedStorageDelta = {};
    // todo - uncomment once stateRoots are saved separately
    //for (const tx of this.transactions) {
    //  tx.witness = undefined;
    //}
    // clear this.raw?
  }

  async executeTx (tx, bridge, dry, internal) {
    // copy the environment
    const customEnvironment = this.inventory.clone();
    let data;

    if (internal) {
      data = INTERNAL_TX_BUILDER.encodeCall(tx);
    } else if (!dry || (tx.message && tx.primaryType)) {
      data = bridge.transactionBuilder.encodeCall(tx);
    } else {
      // assume eth_call
      data = arrayify(tx.data || '0x');
    }

    const address = bridge.rootBridge.protocolAddress.replace('0x', '');
    const caller = address;
    const code = arrayify(await bridge.getCode(bridge.implementationAddress));
    const runtime = new V1Runtime();
    const isPending = this.hash === ZERO_HASH;

    if (isPending) {
      // use Date.now if this is a pending block
      runtime.timestamp = BigInt(~~(Date.now() / 1000));
    } else {
      // else we use the timestamp of the submitted block
      runtime.timestamp = BigInt(this.timestamp);
    }

    customEnvironment.clearCache();

    // the maximum allowed steps the call can make; this is merely to avoid infinite execution
    // TODO: estimate gas for the call on the root-chain
    runtime.stepCount = 0x1fffff;
    const state = await runtime.run({ address, caller, code, data, customEnvironment, bridge });

    {
      const MAX_STORAGE_SLOTS = 0xff;
      const totalStorageSlots = Object.keys(customEnvironment.reads).length +
        Object.keys(customEnvironment.writes).length;

      if (totalStorageSlots > MAX_STORAGE_SLOTS) {
        throw new Error(`transaction consumes too much storage slots: ${totalStorageSlots}/${MAX_STORAGE_SLOTS}`);
      }
    }

    if (!dry) {
      // always store witnesses
      const { reads, writes } = customEnvironment;
      tx.witness = { reads, writes };
    }

    const logs = [];

    // no errors and not in dry-mode = use new state
    if (state.errno === 0 && !dry) {
      this.inventory = customEnvironment;

      // check if the contract emitted internal events
      for (const log of state.logs) {
        // skip events with zero topics
        if (log.topics.length === 0) {
          logs.push(log);
          continue;
        }

        const topic = log.topics[0];

        if (topic === INTERNAL_EVENT_SET_STORAGE) {
          const k = log.topics[1];
          const v = log.topics[2];

          this.reflectedStorage[k] = v;
          continue;
        }

        if (topic === INTERNAL_EVENT_SET_STORAGE_DELTA) {
          const k = log.topics[1];
          const newValue = BigInt(log.topics[2]);
          const oldValue = BigInt(this.reflectedStorageDelta[k] || '');

          this.reflectedStorageDelta[k] = '0x' + BigInt.asUintN(256, oldValue + newValue).toString(16).padStart(64, '0');
          continue;
        }

        if (topic === INTERNAL_EVENT_DEADLINE_TOPIC) {
          // this event doesn't matter if this block is already submitted
          if (isPending) {
            const time = Number(log.topics[1]);

            if (this.submissionDeadline === 0 || time < this.submissionDeadline) {
              this.submissionDeadline = time;

              this.log(`found deadline event: ${time}`);
            }
          }

          continue;
        }

        // no match
        logs.push(log);
      }
    }

    let returnValue = '0x';
    for (const v of state.returnValue) {
      returnValue += (v | 0).toString(16).padStart(2, '0');
    }

    return {
      errno: state.errno,
      returnValue,
      logs,
    };
  }

  get bbt () {
    const bbt = this.prevBlock ? this.prevBlock.bbt.clone() : new BalancedBinaryTree();
    for (const tx of this.transactions) {
      const writes = tx.witness.writes;
      for (const k in writes) {
        const storageValue = writes[k];
        bbt.add(BigInt(k), BigInt(storageValue));
      }
    }

    return bbt;
  }

  /// @dev Computes the solution for this Block.
  async computeSolution (bridge) {
    const STATE_ROOT_STORAGE_KEY = 'd27f023774f5a743d69cfc4b80b1efe4be7912753677c20f45ee5464160b7d24';
    const stateRoot = this.bbt.root.hash.toString(16).padStart(64, '0');
    let payload = '00' + STATE_ROOT_STORAGE_KEY + stateRoot;

    for (const k in this.reflectedStorage) {
      const val = this.reflectedStorage[k];
      // first byte = 0x00
      payload += `${k.replace('0x', '00')}${val.replace('0x', '')}`;
    }

    for (const k in this.reflectedStorageDelta) {
      const val = this.reflectedStorageDelta[k];
      // first byte = 0x01
      payload += `${k.replace('0x', '01')}${val.replace('0x', '')}`;
    }

    if ((payload.length / 2) > bridge.MAX_SOLUTION_SIZE) {
      throw new Error('Reached MAX_SOLUTION_SIZE');
    }

    const solution = {
      stateRoot,
      payload,
      hash: keccak256HexPrefix(payload),
    };

    this.log(`Solution: ${solution.hash}`);

    return solution;
  }

  async computeChallenge (challengeOffset, bridge) {
    const blockData = this.toRaw(bridge);
    const witnesses = [];

    let offset = challengeOffset || 96;
    let nextTx = this.txOffsets[offset];

    if (nextTx) {
      const bbt = this.prevBlock ? this.prevBlock.bbt.clone() : new BalancedBinaryTree();
      const txIndex = this.transactions.indexOf(nextTx);

      // construct the tree up to txIndex
      for (let i = 0; i < txIndex; i++) {
        const witness = this.transactions[i].witness;

        for (const k in witness.writes) {
          const storageValue = witness.writes[k];
          bbt.add(BigInt(k), BigInt(storageValue));
        }
      }

      // compute witnesses starting from txIndex
      for (let i = txIndex, len = this.transactions.length; i < len; i++) {
        const tx = this.transactions[i];
        let readWitnessN = 0;
        let readWitness = '';
        let writeWitnessN = 0;
        let writeWitness = '';

        // storage reads
        for (const k in tx.witness.reads) {
          const proof = bbt.proofUniform(BigInt(k));
          tx.witness.reads[k];

          // < key 32 bytes > < # of proof elements 32 bytes >
          readWitness += k.replace('0x', '') + proof.length.toString(16).padStart(64, '0');

          for (const element of proof) {
            readWitness += element.toString(16).padStart(64, '0');
          }

          readWitnessN++;

        }

        // storage writes
        // first step - gather proofs for all writes
        for (const k in tx.witness.writes) {
          const key = BigInt(k);
          const proof = bbt.proofUniform(key);

          writeWitness += k.replace('0x', '') + proof.length.toString(16).padStart(64, '0');
          for (const element of proof) {
            writeWitness += element.toString(16).padStart(64, '0');
          }
          writeWitnessN++;

          // add it to the tree
          bbt.add(key, BigInt(tx.witness.writes[k]));
        }

        witnesses.push({ readWitnessN, readWitness, writeWitnessN, writeWitness });
      }
    } else {
      this.log(`Warning: No transaction at offset:${offset} found`);
    }

    return {
      blockType: this.blockType,
      timestamp: this.timestamp,
      blockData,
      witnesses,
    };
  }
}

/// @dev Glue for everything.
class Bridge extends Bridge$1 {
  constructor (options) {
    super(options, Block);

    this.transactionBuilder = new TransactionBuilder(options.typedData);
  }
}

async function startServer (bridge, { host, rpcPort }) {
  const OPTIONS_HEADERS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'post, get, options',
    'access-control-allow-headers': 'origin, content-type, accept, x-requested-with',
    'access-control-max-age': '300'
  };
  const DEFAULT_HEADERS = {
    'access-control-allow-origin': '*',
    'content-type': 'application/json'
  };
  const DEFLATE_HEADERS = {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
    'content-encoding': 'deflate'
  };
  const { deflateRawSync } = await import('zlib');

  function log (...args) {
    console.log('Server:', ...args);
  }

  function onRequest (req, resp) {
    resp.sendDate = false;

    if (req.method === 'POST') {
      const maxLen = 8 << 20;
      const len = parseInt(req.headers['content-length'] || maxLen);

      if (len > maxLen) {
        resp.writeHead(413);
        resp.end();
        return;
      }

      let body = '';

      req.on('data', function (buf) {
        body += buf.toString();

        // this is actually not correct but we also do not expect unicode
        if (body.length > len) {
          resp.abort();
        }
      });

      req.on('end', async function () {
        try {
          const obj = JSON.parse(body);
          log(obj.method);

          const compress = (req.headers['accept-encoding'] || '').indexOf('deflate') !== -1;
          resp.writeHead(200, compress ? DEFLATE_HEADERS : DEFAULT_HEADERS);

          const ret = JSON.stringify(await bridge.rpcCall(obj));
          resp.end(compress ? deflateRawSync(ret) : ret);
        } catch (e) {
          resp.writeHead(400, DEFAULT_HEADERS);
          resp.end();
        }
      });

      return;
    }

    resp.writeHead(204, OPTIONS_HEADERS);
    resp.end();
  }
  // TODO:
  // - start the server after the bridge is properly initialized
  // - allow for a https option (path to cert/key)
  // - use HTTP/2

  // lazy import
  const esm = await import('http');
  const server = new esm.default.Server(onRequest);
  // timeout after 120 seconds
  server.timeout = 120000;
  server.listen(rpcPort, host);

  log(`listening on ${host}:${rpcPort}`);
}

export { Block, Bridge, Inventory, TransactionBuilder, V1Runtime, startServer };
