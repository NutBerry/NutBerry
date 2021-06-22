import ethers from 'ethers';

const { ProtoMock, TestContract } = Artifacts;

describe('Protocol', async function () {
  const { alice } = getDefaultWallets();
  const FUNC_SIG_SUBMIT_BLOCK = '0x25ceb4b2';
  const FUNC_SIG_CHALLENGE = '0xd2ef7398';
  const FUNC_SIG_SUBMIT_SOLUTION = '0x84634f44';
  const FUNC_SIG_FINALIZE = '0x9af5db2e';
  let bridge;
  let testContract;
  let myNode;

  before('Prepare contracts', async () => {
    bridge = await deploy(ProtoMock, alice);
    testContract = await deploy(TestContract, alice);

    myNode = await startNode('../../tsm/lib/index.js', 9999, 0, bridge.address);
  });

  describe('Misc', async () => {
    it('Submitting block from a contract should fail', async () => {
      await assertRevert(
        alice.sendTransaction(
          {
            to: testContract.address,
            data: '0xf2357055' + bridge.address.replace('0x', '').padStart(64, '0') + '25ceb4b2'.padEnd(512, 'f'),
            gasLimit: GAS_LIMIT,
          }
        )
      );
    });
  });

  describe('Block w/ invalid transactions, submit solution & challenge', async () => {
    let solution;
    let solutionHash;
    let blockNonce;
    let blockTimestamp;
    let raw;

    before(async () => {
      raw = `0123456789abcdef`;
      blockNonce = (await bridge.finalizedHeight()).add(1).toHexString().replace('0x', '').padStart(64, '0');
      solution = Array(32 << 10).fill('ff').join('');
      solutionHash = ethers.utils.keccak256('0x' + solution);
    });

    it('submitBlock should throw - block too large', async () => {
      const blockSize = await bridge.MAX_BLOCK_SIZE();
      await assertRevert(
        alice.sendTransaction(
          {
            to: bridge.address,
            data:
            FUNC_SIG_SUBMIT_BLOCK +
            ''.padStart((blockSize * 2) + 2, 'ac'),
            gasLimit: GAS_LIMIT,
          }
        )
      );
    });

    it('submitBlock should not throw', async () => {
      const tx = await (
        await alice.sendTransaction(
          {
            to: bridge.address,
            data: FUNC_SIG_SUBMIT_BLOCK + raw,
          }
        )
      ).wait();
      const block = await alice.provider.getBlock(tx.blockHash);
      blockTimestamp = block.timestamp;
    });

    it('submitSolution for already finalized block - no-op', async () => {
      const blockNonce = (await bridge.finalizedHeight()).toHexString().replace('0x', '').padStart(64, '0');
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + blockNonce + solutionHash.replace('0x', ''),
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.logs.length, 1);
    });

    it('submitSolution', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + blockNonce + solutionHash.replace('0x', ''),
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.logs.length, 1);
    });

    it('finalizeSolution throw - inspection period', async () => {
      await assertRevert(
        alice.sendTransaction(
          {
            to: bridge.address,
            data: FUNC_SIG_FINALIZE + blockNonce + solution,
            gasLimit: GAS_LIMIT,
          }
        )
      );
    });

    it('challenge', async () => {
      const blockType = 2;
      const oldHeight = await bridge.finalizedHeight();
      const _raw =
        oldHeight.add(1).toNumber().toString(16).padStart(64, '0')
        + blockType.toString(16).padStart(64, '0')
        + blockTimestamp.toString(16).padStart(64, '0')
        + raw;
      const tx = await (
        await alice.sendTransaction(
          {
            to: bridge.address,
            data: FUNC_SIG_CHALLENGE + ((_raw.length / 2).toString(16).padStart(64, '0')) + _raw,
            gasLimit: GAS_LIMIT,
          }
        )
      ).wait();

      assert.ok((await bridge.finalizedHeight()).gt(oldHeight), 'chain progression');
    });
  });

  let blocksSubmitted = 0;

  describe('submit block > challenge', () => {
    const raw = ''.padEnd(400, 'f');

    it('Submit a block', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_BLOCK + raw,
          gasLimit: GAS_LIMIT,
        }
      );
      const receipt = await tx.wait();
      blocksSubmitted++;
    });

    it('challenge should fail because mock reverts', async () => {
      await assertRevert(
        alice.sendTransaction(
          {
            to: bridge.address,
            data: FUNC_SIG_CHALLENGE + ((raw.length / 2).toString(16).padStart(64, '0')) + raw,
            gasLimit: GAS_LIMIT,
          }
        )
      );
    });

    // TODO: add global challenge timeout functionality...
  });

  describe('submit block x 256 > forward chain', () => {
    it('Submit a block x 256', async () => {
      for (let i = 0; i < 256; i++) {
        const tx = await alice.sendTransaction(
          {
            to: bridge.address,
            data: FUNC_SIG_SUBMIT_BLOCK + ''.padEnd(400, 'a'),
            gasLimit: GAS_LIMIT,
          }
        );
        const receipt = await tx.wait();
        blocksSubmitted++;
      }
    });

    it('doForward', () => doForward(bridge, bridge.provider, myNode));
  });

  describe('2nd submit block x 256 > forward chain', () => {
    it('Submit a block x 256', async () => {
      for (let i = 0; i < 256; i++) {
        const tx = await alice.sendTransaction(
          {
            to: bridge.address,
            data: FUNC_SIG_SUBMIT_BLOCK + ''.padEnd(400, 'a'),
            gasLimit: GAS_LIMIT,
          }
        );
        const receipt = await tx.wait();
        blocksSubmitted++;
      }
    });

    it('no-op; submit a solution for non-existent blocks', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + (blocksSubmitted + 1000).toString(16).padStart(64, '0') + ''.padEnd(64, '0'),
          gasLimit: GAS_LIMIT,
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.status, '0x1');
      assert.equal(receipt.logs.length, 1);
    });

    it('no-op; submit a solution with hash = 0xffffff..', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + (blocksSubmitted - 1 ).toString(16).padStart(64, '0') + ''.padEnd(64, 'f'),
          gasLimit: GAS_LIMIT,
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.status, '0x1');
      assert.equal(receipt.logs.length, 1);
    });

    it('Submit solutions for some blocks', async () => {
      const target = blocksSubmitted - 240;

      for (let blockN = blocksSubmitted - 10; blockN > target; blockN -= 3) {
        const tx = await alice.sendTransaction(
          {
            to: bridge.address,
            data: FUNC_SIG_SUBMIT_SOLUTION + blockN.toString(16).padStart(64, '0') + ''.padEnd(64, 'a'),
            gasLimit: GAS_LIMIT,
          }
        );
        const receipt = await tx.wait();

        assert.equal(receipt.logs.length, 1);
      }
    });

    it('doForward', () => doForward(bridge, bridge.provider, myNode));
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
