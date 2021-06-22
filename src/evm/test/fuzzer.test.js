import ethers from 'ethers';
import assert from 'assert';
import { randomFillSync } from 'crypto';

import { arrayify, toHex } from '../../common/conversion.js';
import { EVMRuntime } from '../js/EVMRuntime.js';
import OPCODES from '../js/Opcodes.js';

const GAS_LIMIT = 12_000_000;
const ignore = [
  'BALANCE',
  'BLOCKHASH',
  'CHAINID',
  'CALL',
  'CALLCODE',
  'DELEGATECALL',
  'STATICCALL',
  'CREATE',
  'CREATE2',
  'COINBASE',
  'DIFFICULTY',
  'EXTCODESIZE',
  'EXTCODEHASH',
  'GAS',
  'GASLIMIT',
  'GASPRICE',
  'JUMP',
  'JUMPDEST',
  'JUMPI',
  'SELFBALANCE',
  'SLOAD',
  'SSTORE',
  'TIMESTAMP',
  'NUMBER',
];

describe('EVMRuntime fuzzer', () => {
  const runtime = new EVMRuntime();
  const data = [];

  for (let i = 1; i < 33; i++) {
    const buf = new Uint8Array(i);

    for (const k in OPCODES) {
      const obj = OPCODES[k];
      const opName = obj[0];

      if (ignore.indexOf(opName) !== -1) {
        continue;
      }

      it(`${opName} inputSize:${buf.length}`, async () => {
        const stackIn = obj[1];
        const stackOut = obj[2];
        const opcode = Number(k).toString(16).padStart(2, '0');

        let bytecode = '';

        for (let i = 0; i < 32; i++) {
          randomFillSync(buf);
          const word = toHex(buf).padStart(64, '0');

          bytecode += '7f' + word;
        }

        const inputs = [];
        for (let i = 0; i < stackIn; i++) {
          randomFillSync(buf);

          const word = toHex(buf).padStart(64, '0');
          inputs.push(word);

          bytecode += '7f' + word;
        }

        bytecode += opcode;

        if (opName === 'PUSH') {
          const bytes = Number(k) - 95;
          bytecode += ''.padEnd(bytes * 2, '2');
        }

        for (let i = 0; i < stackOut; i++) {
          const pos = (i * 32).toString(16).padStart(64, '0');
          bytecode += `7f${pos}52`;
        }

        const m = (stackOut * 32).toString(16).padStart(64, '0');
        bytecode += `7f${m}6000f3`;

        const to = '0x' + toHex(buf).slice(40).padStart(40, '1');
        const tx = {
          from: to,
          to,
          data: '0x',
          gas: '0x' + GAS_LIMIT.toString(16),
        };
        const stateOverride = {
          [to]: {
            code: '0x' + bytecode,
          }
        };

        let skipMemLimit = false;
        let returnValue = [];
        try {
          const state = await runtime.run(
            {
              code: arrayify(bytecode),
              data,
              origin: to.slice(2),
              address: to.slice(2),
            }
          );
          returnValue = state.returnValue;
        } catch (e) {
          console.log(e);

          if (e.toString().indexOf('MEM_LIMIT') !== -1) {
            skipMemLimit = true;
          }
        }

        if (skipMemLimit) {
          return;
        }

        const ret = await ethers.utils.fetchJson(
          process.env.ROOT_RPC_URL,
          JSON.stringify({
            id: 42,
            method: 'eth_call',
            params: [tx, 'latest', stateOverride]
          })
        );
        let gethResult = ret.result || ret.error.data;
        if (!gethResult) {
          // console.log(ret);
          assert.equal(ret.error.code, -32000);
          gethResult = '0x';
        }

        assert.equal(
          '0x' + returnValue.map(v => v.toString(16).padStart(2, '0')).join(''),
          gethResult,
          JSON.stringify({ inputs })
        );
      });
    }
  }
});
