import { keccak256HexPrefix } from '../../common/utils.js';
import { arrayify, toHexPrefix } from '../../common/conversion.js';

import OPCODES from './Opcodes.js';

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

export const ERROR = {
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

export function VmError (error) {
  this.error = error;
  this.errorType = 'VmError';
};

const ADDRESS_ZERO = ''.padStart(40, '0');
const MAX_INTEGER = BigInt.asUintN(256, '-1');
const SIGN_MASK = BigInt(2) ** BigInt(255);
const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const BIG_TWO = BigInt(2);
const MEM_LIMIT = BigInt(2 << 20);
// https://eips.ethereum.org/EIPS/eip-1352
const MAX_PRECOMPILE = BigInt(0xffff);

function toUint (v) {
  return BigInt.asUintN(256, v);
}

function toInt (v) {
  return BigInt.asIntN(256, v);
}

export class EVMRuntime {
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

    if (b === BIG_ZERO) {
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

    if (b === BIG_ZERO) {
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

    if (b === BIG_ZERO) {
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

    if (b === BIG_ZERO) {
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

    if (c === BIG_ZERO) {
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

    if (c === BIG_ZERO) {
      r = c;
    } else {
      r = (a * b) % c;
    }
    runState.stack.push(r);
  }

  async EXP (runState) {
    const base = runState.stack.pop();
    const exponent = runState.stack.pop();

    if (exponent === BIG_ZERO) {
      runState.stack.push(BIG_ONE);
      return;
    }

    if (base === BIG_ZERO) {
      runState.stack.push(BIG_ZERO);
      return;
    }

    let r = BIG_ONE;
    let b = base;
    let e = exponent;

    while (true) {
      if (e % BIG_TWO === BIG_ONE) {
        r = toUint(r * b);
      }

      e /= BIG_TWO;

      if (e === BIG_ZERO) {
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
      const mask = (BIG_ONE << signBit);
      const fmask = mask - BIG_ONE;

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

    runState.stack.push(a < b ? BIG_ONE : BIG_ZERO);
  }

  async GT (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a > b ? BIG_ONE : BIG_ZERO);
  }

  async SLT (runState) {
    const a = toInt(runState.stack.pop());
    const b = toInt(runState.stack.pop());

    runState.stack.push(a < b ? BIG_ONE : BIG_ZERO);
  }

  async SGT (runState) {
    const a = toInt(runState.stack.pop());
    const b = toInt(runState.stack.pop());

    runState.stack.push(a > b ? BIG_ONE : BIG_ZERO);
  }

  async EQ (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    runState.stack.push(a === b ? BIG_ONE : BIG_ZERO);
  }

  async ISZERO (runState) {
    const a = runState.stack.pop();

    runState.stack.push(a === BIG_ZERO ? BIG_ONE : BIG_ZERO);
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
      runState.stack.push(BIG_ZERO);
      return;
    }

    runState.stack.push((word >> (BigInt(248) - (pos * BigInt(8)))) & BigInt(0xff));
  }

  async SHL (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    if (a >= BigInt(256)) {
      runState.stack.push(BIG_ZERO);
      return;
    }

    runState.stack.push(toUint(b << a));
  }

  async SHR (runState) {
    const a = runState.stack.pop();
    const b = runState.stack.pop();

    if (a >= BigInt(256)) {
      runState.stack.push(BIG_ZERO);
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
        r = BIG_ZERO;
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

    if (length !== BIG_ZERO) {
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
    runState.stack.push(BIG_ZERO);
  }

  async CALLDATALOAD (runState) {
    const pos = Number(runState.stack.pop());

    if (pos >= runState.callData.length) {
      runState.stack.push(BIG_ZERO);
      return;
    }

    let ret = BIG_ZERO;
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
    this.memStore(runState, offset, word, BIG_ZERO, BigInt(32));
  }

  async MSTORE8 (runState) {
    const offset = runState.stack.pop();
    let byte = runState.stack.pop();

    // NOTE: we're using a 'trick' here to get the least significant byte
    byte = [Number(byte & BigInt(0xff))];
    this.memStore(runState, offset, byte, BIG_ZERO, BIG_ONE);
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

    if (cond !== BIG_ZERO) {
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

    if (target >= BIG_ZERO && target <= MAX_PRECOMPILE) {
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
        this.memStore(runState, outOffset, arrayify(returnValue), BIG_ZERO, outLength);
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
    runState.stack.push(BIG_ZERO);

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
    if (length === BIG_ZERO) {
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
    if (length === BIG_ZERO) {
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
