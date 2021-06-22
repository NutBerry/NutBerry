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

function ecrecover (msgHash, v, r, s, chainId) {
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

const keccak = new Keccak256();

function recoverAddress (msg, v, r, s, chainId) {
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

function keccak256HexPrefix (array) {
  return `0x${keccak.reset().update(array).digest()}`;
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

export default TransactionBuilder;
