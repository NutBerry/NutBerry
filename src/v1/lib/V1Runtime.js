import { EVMRuntime, VmError, ERROR } from './../../evm/js/index.js';
import { arrayify, toHexPrefix } from '../../common/conversion.js';
import { keccak256HexPrefix } from '../../common/utils.js';

const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const MAX_PRECOMPILE = BigInt(0xffff);
// https://eips.ethereum.org/EIPS/eip-1352

function toAddress (val) {
  return '0x' + BigInt.asUintN(160, val).toString(16).padStart(40, '0');
}

export default class V1Runtime extends EVMRuntime {
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
    }

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
      runState.stack.push(BIG_ONE);
    } else {
      runState.stack.push(BIG_ZERO);
    }

    if (state.errno === 0 || state.errno === 7) {
      runState.returnValue = state.returnValue;
      this.memStore(runState, retOffset, runState.returnValue, BIG_ZERO, retSize);
    } else {
      throw new Error(`V1Runtime execution error ${state.errno}`);
    }
  }

  async CALL (runState) {
    // gasLimit
    runState.stack.pop();
    const starget = runState.stack.pop();
    const value = runState.stack.pop();
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
    if (_target >= BIG_ZERO && _target <= MAX_PRECOMPILE) {
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
     const value = runState.stack.pop();
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
