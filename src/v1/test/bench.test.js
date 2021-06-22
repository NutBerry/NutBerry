import ethers from 'ethers';

import TransactionBuilder from '../lib/TransactionBuilder.js';
import TYPED_DATA from './typedData2.js';
import setupWorkflow from './lib.js';

describe('V1TestOne - gas consumption', () => {
  const builder = new TransactionBuilder(TYPED_DATA);
  const { eva } = getDefaultWallets();

  function workflow (context) {
    describe('dummy static transactions to measure gas consumption', () => {
      it(`One - sendTransaction`, async () => {
        const args = {
          foo: '0xf', bar: '0xaa', nonce: '0x0',
        };
        const type = 'One';
        const rawTx = '0x' + createTransaction(builder, type, args, eva);
        const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);

        assert.equal(txHash, ethers.utils.keccak256(rawTx));
        const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.from.toLowerCase(), eva.address.toLowerCase(), 'signer must match');
      });

      it(`Three - sendTransaction`, async () => {
        const args = {
          foo: '0xf',
        };
        const type = 'Three';
        const rawTx = '0x' + createTransaction(builder, type, args, eva);
        const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);

        assert.equal(txHash, ethers.utils.keccak256(rawTx));
        const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.from.toLowerCase(), eva.address.toLowerCase(), 'signer must match');
      });
    });
  }

  setupWorkflow({ wallet: eva, workflow });
});
