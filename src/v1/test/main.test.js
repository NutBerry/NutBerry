import ethers from 'ethers';
import crypto from 'crypto';

import TransactionBuilder from '../lib/TransactionBuilder.js';
import SUPPORTED_TYPES from '../lib/valueTypes.js';
import TYPED_DATA from './typedData2.js';
import setupWorkflow from './lib.js';

describe('V1TestOne - main', () => {
  const builder = new TransactionBuilder(TYPED_DATA);
  const { alice } = getDefaultWallets();

  function randomValue (len) {
    const buf = Buffer.alloc(len);
    crypto.randomFillSync(buf);

    return BigInt('0x' + buf.toString('hex'));
  }

  function workflow (context) {
    const numTransactions = 10;

    for (let i = 0; i < numTransactions; i++) {
      for (const type of TYPED_DATA.primaryTypes) {
        if (type === 'ShouldRevert') {
          continue;
        }

        const txType = TYPED_DATA.types[type];
        const args = {};
        const txInputs = [];

        for (const field of txType) {
          const valLen = SUPPORTED_TYPES[field.type] || (Number(randomValue(2)) & 0x2fff);
          const val = randomValue(valLen);

          if (field.type === 'bytes' || field.type === 'string') {
            const tmp = val.toString(16);
            txInputs.push('0x' + tmp.padStart(tmp.length + (tmp.length % 2), '0'));
          } else if (field.type.startsWith('bytes')) {
            const tmp = BigInt(val).toString(16);
            txInputs.push('0x' + tmp.padStart(valLen * 2, '0').padEnd(64, '0'));
          } else if (field.type.startsWith('int')) {
            const tmp = BigInt.asUintN(256, val).toString(16);
            txInputs.push('0x' + tmp.padStart(tmp.length + (tmp.length % 2), '0').padStart(64, 'f'));
          } else {
            txInputs.push('0x' + BigInt(val).toString(16).padStart(64, '0'));
          }

          args[field.name] = val;
        }

        describe(`Test ${type} ${i + 1} of ${numTransactions}`, () => {
          it(`sendTransaction / check logs`, async () => {
            const rawTx = '0x' + createTransaction(builder, type, args, alice);
            const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);

            assert.equal(txHash, ethers.utils.keccak256(rawTx));
            const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);

            assert.equal(receipt.status, '0x1', 'receipt.status');
            assert.equal(receipt.from.toLowerCase(), alice.address.toLowerCase(), 'alice must match');

            const callData = ethers.utils.hexlify(
              builder.encodeCall(
                { from: alice.address.toLowerCase(), primaryType: type, message: args }
              )
            );
            const callDataHash = ethers.utils.keccak256(callData);
            assert.equal(receipt.logs[0].topics[0], callDataHash, 'callData hash should match');

            const callDataContract =
              (await context.debugContract.provider.send('eth_call', [{ to: context.debugContract.address, data: rawTx }, 'latest'])).slice(0, -64);
            assert.equal(callDataContract, callData, 'callData should match between node and contract');

            const filterLogs = receipt.logs.filter((e) => e.topics.length === 0);
            assert.equal(filterLogs.length, txInputs.length, 'should emit the same amount of log events');

            for (let i = 0; i < txInputs.length; i++) {
              const log = filterLogs[i];
              assert.equal(log.data, txInputs[i], `data should match i=${i}`);
            }

            receipt.logs.forEach(
              function (log) {
                assert.equal(log.address, context.bridgeL1.address.toLowerCase(), 'origin of log event');
              }
            );
          });
        });
      }
    }
  }

  setupWorkflow({ wallet: alice, workflow });
});
