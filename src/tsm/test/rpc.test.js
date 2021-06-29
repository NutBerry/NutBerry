import http from 'http';
import { Socket } from 'net';
import ethers from 'ethers';

describe('RPC', () => {
  const { NutBerryTokenBridge } = Artifacts;
  const RPC_PORT = 9999;
  const { alice } = getDefaultWallets();
  let node;
  let bridgeL1;

  before('Prepare contracts', async () => {
    bridgeL1 = await deploy(NutBerryTokenBridge, alice);

    node = await startNode(
      '../../tsm/lib/index.js',
      RPC_PORT,
      0,
      bridgeL1.address,
      null,
      0,
      {
        maxTransactionSize: 20000,
        rpcApiKey: 'hello',
        disabledRpcMethods: 'eth_call',
        debugMode: false
      }
    );
  });

  after(async () => {
    node.send('debug_kill', []);
  });

  it('unknown method', async () => {
    let err;

    try {
      await node.send('foobar', []);
    } catch (e) {
      err = e;
    }

    assert.equal(err.error.message, 'The method foobar does not exist/is not available');
  });

  it('net_version', async () => {
    const rootId = await bridgeL1.provider.getNetwork();
    const r = await node.getNetwork();
    assert.equal(r.chainId, rootId.chainId);
  });

  it('eth_gasPrice', async () => {
    const r = await node.getGasPrice();
    assert.equal(r.toString(), '0');
  });

  it('eth_blockNumber', async () => {
    const r = await node.getBlockNumber();
    assert.ok(r >= 0);
  });

  it('eth_getBlockByNumber', async () => {
    const blockNumber = await node.getBlockNumber();
    const block = await node.getBlock(blockNumber);

    assert.ok(blockNumber >= 0);
    assert.equal(block.number, blockNumber);
  });

  it('eth_getBalance', async () => {
    const r = await node.getBalance(alice.address);
    assert.equal(r.toString(), '0');
  });

  it('maxTransactionSize', async () => {
    let errorStr = '';

    try {
      await node.send('eth_sendRawTransaction', ['0x' + ''.padEnd(40_000 + 2, 'a')]);
    } catch (e) {
      errorStr = JSON.parse(e.body).error.message;
    }

    assert.equal(errorStr, 'Transaction size (20000) exceeded');
  });

  it('disabled method without api key - should fail', async () => {
    await assert.rejects(node.send('eth_call', [{ data: '0x' }]), /DebugMode is not enabled or request is not authenticated/);
  });

  it('disabled method with api key', async () => {
    assert.deepEqual(
      await ethers.utils.fetchJson(node.connection.url, JSON.stringify({ auth: 'hello', method: 'eth_call', params: ['0x'] })),
      { result: '0x' }
    );
  });

  it('disabled method with wrong api key', async () => {
    assert.deepEqual(
      await ethers.utils.fetchJson(node.connection.url, JSON.stringify({ auth: 'shello', method: 'eth_call', params: ['0x'] })),
      { error: { 'code': -32601, message: 'DebugMode is not enabled or request is not authenticated' } }
    );
  });

  it('debug method with api key', async () => {
    assert.deepEqual(
      await ethers.utils.fetchJson(node.connection.url, JSON.stringify({ auth: 'hello', method: 'debug_forwardChain', params: [] })),
      {}
    );
  });

  it('debug method without api key', async () => {
    assert.deepEqual(
      await ethers.utils.fetchJson(node.connection.url, JSON.stringify({ method: 'debug_forwardChain', params: [] })),
      { error: { 'code': -32601, message: 'DebugMode is not enabled or request is not authenticated' } }
    );
  });

  it('debug method with wrong api key', async () => {
    assert.deepEqual(
      await ethers.utils.fetchJson(node.connection.url, JSON.stringify({ auth: 's', method: 'debug_forwardChain', params: [] })),
      { error: { 'code': -32601, message: 'DebugMode is not enabled or request is not authenticated' } }
    );
  });

  it('bad request', async () => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: RPC_PORT,
          method: 'POST',
          path: '/',
          headers: {
            'content-length': 1,
          },
        }
      );
      req.on('error', reject);
      req.on('response', function (resp) {
        let body = '';
        resp.on('data', function (buf) {
          body += buf.toString();
        });
        resp.on('end', function () {
          assert.equal(body, `{"error":{"code":-32601,"message":"DebugMode is not enabled or request is not authenticated"}}`);
          resolve();
        });
      });

      req.end('1');
    });
  });

  it('request too large', async () => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: RPC_PORT,
          method: 'POST',
          path: '/',
          headers: {
            'content-length': (8 << 20) + 1,
          },
        }
      );
      // may also abort first if the connection
      // closed before we had the chance to upload everything
      req.on('error', resolve);
      req.on('response', function (resp) {
        assert.equal(resp.statusCode, 413, 'should return 413');
        resolve();
      });
      req.end(Array((8 << 20) + 1).fill('0').join(''));
    });
  });

  it('request too large - wrong content-length header', async () => {
    return new Promise((resolve, reject) => {
      const sock = new Socket();
      const req = sock.connect(RPC_PORT, 'localhost');
      req.on('error', function (e) {
        assert.ok(e, 'should abort connection');
        resolve();
      });
      req.on('response', function (resp) {
        reject();
      });
      req.write('POST / HTTP/1.0\r\ncontent-length: 1\r\n\r\n');
      req.end(Array((8 << 20) + 1).fill('0').join(''));
    });
  });
});
