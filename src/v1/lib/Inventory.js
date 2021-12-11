const UINT_ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';

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

export default class Inventory {
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

  alloc () {
    const ret = new this.constructor();
    ret.storage = this.storage;
    return ret;
  }

  commit (obj) {
    for (const key in obj.writes) {
      this.storage[key] = obj.writes[key];
    }
  }

  _getValue (key) {
    return this.writes[key] || this.storage[key];
  }

  _setValue (key, value) {
    const v = toStr(value, 64);

    this.writes[key] = v;
  }

  storageLoad (target, key) {
    const v = this._getValue(key) || UINT_ZERO;

    if (!this.reads[key] || !this.writes[key]) {
      this.reads[key] = v;
    }

    return v;
  }

  storageStore (key, value) {
    this._setValue(key, value);
  }
}
