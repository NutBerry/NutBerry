import ethers from 'ethers';
import { Constants, EVMRuntime } from './../js/index.js';
import Opcodes from './../js/Opcodes.js';
import Fixtures from './fixtures/runtime.js';

async function upstreamCall (tx) {
  const resp = await ethers.utils.fetchJson(
    process.env.ROOT_RPC_URL,
    JSON.stringify({
      id: 1,
      method: 'eth_call',
      params: [tx, 'latest']
    })
  );

  if (resp.result) {
    return resp.result;
  }

  throw new Error(resp.error ? resp.error.message : 'unknown eth_call error');
}

function getCode (fixture) {
  let code;
  if (!fixture.join) {
    code = fixture.code || [];
    if (!code.join) { // wrap single opcode
      code = [code];
    }
  } else {
    code = fixture;
  }

  const codeSize = code.length;
  const pc = fixture.pc !== undefined ? fixture.pc : codeSize - 1;
  const opcodeUnderTest = Opcodes[parseInt(code[pc], 16)][0];

  return { code, codeSize, pc: ~~pc, opcodeUnderTest };
}

function arrayify (str) {
  str = str.replace('0x', '');

  const res = [];
  for (let i = 0; i < str.length; i += 2) {
    res.push(parseInt(str.substring(i, i + 2), 16));
  }

  return res;
}

describe('EVMRuntime', function () {
  describe('fixtures', function () {
    Fixtures.forEach(fixture => {
      const { pc, opcodeUnderTest } = getCode(fixture);

      it(fixture.description || opcodeUnderTest, async () => {
        const runtime = new EVMRuntime();
        const code = arrayify('0x' + (typeof fixture.code === 'object' ? fixture.code.join('') : fixture.code));
        const stack = fixture.stack || [];
        const mem = fixture.memory || '';
        const data = arrayify(fixture.data || '0x');
        const args = {
          code,
          data,
          stack,
          mem,
          pc,
          upstreamCall,
        };
        const state = await runtime.run(args);

        if (fixture.result.stack) {
          assert.deepEqual(
            state.stack.map(e => '0x' + e.toString(16).padStart(64, '0')),
            fixture.result.stack,
            'stack'
          );
        }
        if (fixture.result.memory) {
          for (let f = 0; f < state.memory.length; f++) {
            state.memory[f] |= 0;
          }
          assert.deepEqual(
            state.memory.concat((new Array((state.memoryWordCount * 32) - state.memory.length)).fill(0)),
            arrayify(fixture.result.memory.map(e => e.replace('0x', '')).join('')),
            'memory'
          );
        }
        if (fixture.result.pc !== undefined) {
          assert.equal(state.programCounter, fixture.result.pc, 'pc');
        }
        if (fixture.result.errno !== undefined) {
          assert.equal(state.errno, fixture.result.errno, 'errno');
        }
      });
    });
  });
});
