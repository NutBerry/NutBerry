import ethers from 'ethers';
import TransactionBuilder from '../lib/TransactionBuilder.js';
import TYPED_DATA from './typedData2.js';

describe('Signaling tests', () => {
  const builder = new TransactionBuilder(TYPED_DATA);
  const { V1TestOne } = Artifacts;
  const { rootProvider, alice } = getDefaultWallets();
  let l1;
  let l2;
  let node;

  before('Prepare contracts', async () => {
    l1 = await deploy(V1TestOne, alice);
    node = await startNode('../../v1/lib/index.js', 9999, 0, l1.address, TYPED_DATA);
    l2 = l1.connect(node);

  });

  describe('test calls', () => {
    let txHash;

    it(`sendTransaction / check logs`, async () => {
      const args = {
        foo: '0xf', bar: '0xaa', nonce: '0x0',
      };
      const type = 'One';
      const rawTx = '0x' + createTransaction(builder, type, args, alice);
      txHash = await l2.provider.send('eth_sendRawTransaction', [rawTx]);
      const receipt = await l2.provider.send('eth_getTransactionReceipt', [txHash]);

      assert.equal(receipt.status, '0x1', 'receipt.status');
      assert.ok(receipt.logs.length > 0);
    });

    it('nonce', async () => {
      const nonce = await l2.callStatic.nonces(alice.address);
      assert.equal(nonce.toString(), '1');
    });

    it('signal implementation upgrade', async () => {
      const tx = await l1.signalUpgradeTo(alice.address);
      const receipt = await tx.wait();

      assert.equal(receipt.status, 1);
      await waitForSync(l1, l2);
    });

    it('nonce - call should fail now', async () => {
      assert.rejects(l2.callStatic.nonces(alice.address));
    });

    it('transaction receipt should be different', async () => {
      const receipt = await l2.provider.send('eth_getTransactionReceipt', [txHash]);
      assert.ok(receipt.logs.length === 0);
    });

    it('signal implementation upgrade to original', async () => {
      const tx = await l1.signalUpgradeTo(l1.address);
      const receipt = await tx.wait();

      assert.equal(receipt.status, 1);
      await waitForSync(l1, l2);
    });

    it('nonce - should work again', async () => {
      const nonce = await l2.callStatic.nonces(alice.address);
      assert.equal(nonce.toString(), '1');
    });

    it('transaction should have be recalculated', async () => {
      const receipt = await l2.provider.send('eth_getTransactionReceipt', [txHash]);
      assert.ok(receipt.logs.length > 0);
    });
  });

  describe('kill node', () => {
    it('debug_kill', async () => {
      try {
        await node.send('debug_kill', []);
      } catch (e) {
      }
    });
  });
});
