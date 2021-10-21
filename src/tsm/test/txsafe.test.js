import ethers from 'ethers';

const { ProtoMock } = Artifacts;

describe('Node - pending transaction pool', async function () {
  const { alice } = getDefaultWallets();
  let bridge;
  let myNode;
  let rawTx = '0xff';
  let txHash;
  let port = 9999;

  async function start () {
    myNode = await startNode(
      '../../tsm/lib/index.js',
      port++,
      0,
      bridge.address,
      { types: { EIP712Domain: [] }, primaryTypes: [], domain: {} },
      // overrides
      { blockSizeThreshold: 9999999, disableStoreAndRestore: false }
    );
  }

  before('Prepare contracts', async () => {
    bridge = await deploy(ProtoMock, alice);
  });

  describe('start node, add transaction', async () => {
    it('start node', async () => {
      await start();
    });

    it('send transaction', async () => {
      txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);

      assert.ok(txHash.length === 66);
    });

    it('doForward', () => doForward(bridge, bridge.provider, myNode));
  });

  describe('kill node', () => {
    it('sleep', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('debug_kill', async () => {
      try {
        await myNode.send('debug_kill', []);
      } catch (e) {
      }
    });
  });

  describe('start node again, look for transaction, submit block', async () => {
    it('start node', async () => {
      await start();
    });

    it('get pending transaction', async () => {
      const tx = await myNode.send('eth_getTransactionByHash', [txHash]);

      assert.equal(tx.hash, txHash);
    });

    it('check transaction count', async () => {
      const block = await myNode.send('eth_getBlockByNumber', ['latest']);

      assert.equal(block.transactions.length, 1);
    });

    it('submitBlock', () => submitBlockUntilEmpty(bridge, bridge.provider, myNode));
  });

  describe('kill node', () => {
    it('sleep', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('debug_kill', async () => {
      try {
        await myNode.send('debug_kill', []);
      } catch (e) {
      }
    });
  });

  describe('start node again, look for transaction', async () => {
    it('start node', async () => {
      await start();
    });

    it('get transaction - should be submitted by now', async () => {
      const tx = await myNode.send('eth_getTransactionByHash', [txHash]);

      assert.equal(tx.hash, txHash);
      assert.ok(tx.blockHash !== '0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('check transaction count - pending block should hold zero transactions', async () => {
      const block = await myNode.send('eth_getBlockByNumber', ['latest']);

      assert.equal(block.transactions.length, 0);
    });
  });

  describe('kill node', () => {
    it('debug_kill', async () => {
      try {
        await myNode.send('debug_kill', []);
      } catch (e) {
      }
    });
  });
});
