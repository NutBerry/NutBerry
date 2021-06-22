import ethers from 'ethers';

const { ProtoMock } = Artifacts;

describe('Protocol - disputes', async function () {
  const { alice } = getDefaultWallets();
  const FUNC_SIG_SUBMIT_BLOCK = '0x25ceb4b2';
  const FUNC_SIG_SUBMIT_SOLUTION = '0x84634f44';
  const NUMBER_BLOCKS = 26;
  let bridge;
  let myNode;

  before('Prepare contracts', async () => {
    bridge = await deploy(ProtoMock, alice);
    myNode = await startNode(
      '../../tsm/lib/index.js',
      9999,
      0,
      bridge.address
    );
  });

  describe('dispute #1', async () => {
    const rawBlock = ''.padEnd(1422, 'a');
    const solutionHash = ethers.utils.keccak256('0x').replace('0x', '');
    let blockNumber;

    before(async () => {
      blockNumber = (await bridge.finalizedHeight()).add(1);
    });

    it(`submitBlock x ${NUMBER_BLOCKS} - should not throw`, async () => {
      for (let i = 0; i < NUMBER_BLOCKS; i++) {
        const tx = await (
          await alice.sendTransaction(
            {
              to: bridge.address,
              data: FUNC_SIG_SUBMIT_BLOCK + rawBlock,
            }
          )
        ).wait();
      }
    });

    it(`submitSolution x ${NUMBER_BLOCKS}`, async () => {
      let raw = blockNumber.toHexString().replace('0x', '').padStart(64, '0');
      for (let i = 0; i < NUMBER_BLOCKS; i++) {
        raw += (i % 3) ? solutionHash : ''.padEnd(64, 'a');
      }

      await (await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + raw,
        }
      )).wait();
    });

    it('node should submit disputes and challenges', async () => {
      await doForward(bridge, alice.provider, myNode);

      assert.equal(
        (await bridge.finalizedHeight()).toString(),
        blockNumber.sub(1).add(NUMBER_BLOCKS).toString(),
        'chain should be finalized'
      );
    });

    it(`submitBlock x ${NUMBER_BLOCKS} - should not throw`, async () => {
      for (let i = 0; i < NUMBER_BLOCKS; i++) {
        const tx = await (
          await alice.sendTransaction(
            {
              to: bridge.address,
              data: FUNC_SIG_SUBMIT_BLOCK + rawBlock,
            }
          )
        ).wait();
      }
    });

    it(`submitSolution x ${NUMBER_BLOCKS}`, async () => {
      const blockN = await bridge.finalizedHeight();
      let raw = blockN.toHexString().replace('0x', '').padStart(64, '0');
      for (let i = 0; i < NUMBER_BLOCKS; i++) {
        raw += solutionHash;
      }

      await (await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + raw,
        }
      )).wait();
    });

    const blockMeta = [];

    it('check blockMeta', async () => {
      const blockN = (await bridge.finalizedHeight()).add(1);
      for (let i = 0; i < NUMBER_BLOCKS; i++) {
        const meta = await bridge.blockMeta(blockN.add(i));
        blockMeta[i] = meta.toString();
      }
    });

    it('dispute all blocks', async () => {
      const blockN = (await bridge.finalizedHeight()).add(1);
      const tx = await bridge.dispute(blockN, '0x' + ''.padStart(64, 'f'));
      const receipt = await tx.wait();
    });

    it('check blockMeta - should have changed', async () => {
      const blockN = (await bridge.finalizedHeight()).add(1);
      for (let i = 0; i < NUMBER_BLOCKS; i++) {
        const meta = await bridge.blockMeta(blockN.add(i));
        if (blockMeta[i] === '0') {
          assert.ok(meta.toString() === blockMeta[i], 'blockMeta no change');
        } else {
          assert.ok(meta.toString() !== blockMeta[i], 'blockMeta');
        }
      }
    });

    it('node should forward chain', async () => {
      await doForward(bridge, alice.provider, myNode);

      assert.equal(
        (await bridge.finalizedHeight()).toString(),
        blockNumber.sub(1).add(NUMBER_BLOCKS * 2).toString(),
        'chain should be finalized'
      );
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

  describe('dispute #2', async () => {
    const solution = '';
    const timestamps = [];
    let raw;
    let solutionHash;
    let blockNumber;

    before(async () => {
      raw = `0123456789abcdef`;
      solutionHash = ethers.utils.keccak256('0x' + solution);
      blockNumber = Number((await bridge.finalizedHeight()).add(1));
    });

    it('submitBlock x 512 - should not throw', async () => {
      for (let i = 0; i < 512; i++) {
        const tx = await (
          await alice.sendTransaction(
            {
              to: bridge.address,
              data: FUNC_SIG_SUBMIT_BLOCK + raw,
            }
          )
        ).wait();
        const block = await bridge.provider.getBlock(tx.blockHash);
        timestamps[blockNumber + i] = block.timestamp;
      }
    });

    it('submitSolution x 256', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + blockNumber.toString(16).padStart(64, '0') + solutionHash.replace('0x', '').repeat(256),
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.status, '0x1');
      assert.equal(receipt.logs.length, 1);
    });

    it('submitSolution - should skip solutions', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + (blockNumber + 256).toString(16).padStart(64, '0') + solutionHash.replace('0x', '').repeat(256),
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.status, '0x1');
    });

    it('produceBlocks', async () => {
      await produceBlocks(parseInt(await bridge.INSPECTION_PERIOD()), alice);
    });

    it('finalizeSolution up to 210', async () => {
      for (let i = 0; i < 211; i++) {
        let canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.equal(canFinalize, true, 'canFinalizeBlock');

        await (await alice.sendTransaction(
          {
            to: bridge.address,
            data: '0x9af5db2e' +
            (blockNumber + i).toString(16).padStart(64, '0') +
            (solution.length / 2).toString(16).padStart(64, '0') +
            solution,
          }
        )).wait();

        canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.equal(canFinalize, false, 'canFinalizeBlock');
      }
    });

    it('dispute', async () => {
      await (await bridge.dispute(blockNumber + 211, 1 << 0)).wait();
    });

    it('finalizeSolution - should throw', async () => {
      let canFinalize = await bridge.canFinalizeBlock(blockNumber + 211);
      assert.equal(canFinalize, false, 'canFinalizeBlock');

      await assertRevert(alice.sendTransaction(
        {
          to: bridge.address,
          data: '0x9af5db2e' +
          (blockNumber + 211).toString(16).padStart(64, '0') +
          (solution.length / 2).toString(16).padStart(64, '0') +
          solution,
          gasLimit: GAS_LIMIT,
        }
      ));

      canFinalize = await bridge.canFinalizeBlock(blockNumber + 211);
      assert.equal(canFinalize, false, 'canFinalizeBlock');
    });

    it('challenge', async () => {
      const canFinalize = await bridge.canFinalizeBlock(blockNumber + 211);
      assert.equal(Number(await bridge.finalizedHeight()), blockNumber + 210);
      assert.equal(canFinalize, false, 'canFinalizeBlock');
      const nonce = blockNumber + 211;
      const blockTimestamp = timestamps[nonce];
      const blockType = 2;

      const _raw = nonce.toString(16).padStart(64, '0')
        + blockType.toString(16).padStart(64, '0')
        + blockTimestamp.toString(16).padStart(64, '0')
        + raw;

      await (await alice.sendTransaction(
        {
          to: bridge.address,
          data: '0xd2ef7398'
            + ((_raw.length / 2).toString(16).padStart(64, '0'))
            // # rounds
            + (0xfffff).toString(16).padStart(64, '0')
            + _raw,
        }
      )).wait();

      assert.equal(canFinalize, false, 'canFinalizeBlock');
    });

    it('finalizeSolution', async () => {
      for (let i = 212; i < 256; i++) {
        const canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.equal(canFinalize, true, `canFinalizeBlock: ${blockNumber + i}`);

        await (await alice.sendTransaction(
          {
            to: bridge.address,
            data: '0x9af5db2e' +
            (blockNumber + i).toString(16).padStart(64, '0') +
            (solution.length / 2).toString(16).padStart(64, '0') +
            solution,
          }
        )).wait();
      }
    });

    it('submitSolution x 256', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + (blockNumber + 256).toString(16).padStart(64, '0') + solutionHash.replace('0x', '').repeat(256),
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.status, '0x1');
      assert.equal(receipt.logs.length, 1);
    });

    it('produceBlocks', async () => {
      await produceBlocks(parseInt(await bridge.INSPECTION_PERIOD()), alice);
    });

    it('finalizeSolution', async () => {
      for (let i = 256; i < 512; i++) {
        const canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.ok(canFinalize, 'canFinalizeBlock');

        await (await alice.sendTransaction(
          {
            to: bridge.address,
            data: '0x9af5db2e' +
            (blockNumber + i).toString(16).padStart(64, '0') +
            (solution.length / 2).toString(16).padStart(64, '0') +
            solution,
          }
        )).wait();
      }
    });

    it('canFinalizeBlock', async () => {
      for (let i = 0; i < 512; i++) {
        const canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.equal(canFinalize, false, 'canFinalizeBlock');
      }
    });
  });

  describe('dispute - no challenges, just wait', async () => {
    const solution = '';
    let raw;
    let solutionHash;
    let blockNumber;

    before(async () => {
      raw = `0123456789abcdef`;
      solutionHash = ethers.utils.keccak256('0x' + solution);
      blockNumber = Number((await bridge.finalizedHeight()).add(1));
    });

    it('submitBlock x 256 - should not throw', async () => {
      for (let i = 0; i < 256; i++) {
        const tx = await (
          await alice.sendTransaction(
            {
              to: bridge.address,
              data: FUNC_SIG_SUBMIT_BLOCK + raw,
            }
          )
        ).wait();
      }
    });

    it('submitSolution x 256', async () => {
      const tx = await alice.sendTransaction(
        {
          to: bridge.address,
          data: FUNC_SIG_SUBMIT_SOLUTION + blockNumber.toString(16).padStart(64, '0') + solutionHash.replace('0x', '').repeat(256),
        }
      );
      const receipt = await tx.wait();

      assert.equal(receipt.status, '0x1');
      assert.equal(receipt.logs.length, 1);
    });

    it('dispute all blocks', async () => {
      await (await bridge.dispute(blockNumber, '0x' + ''.padStart(64, 'f'))).wait();
    });

    it('produceBlocks', async () => {
      await produceBlocks(parseInt(await bridge.INSPECTION_PERIOD()), alice);
    });

    it('canFinalizeBlock should return false (elevated inspection period)', async () => {
      for (let i = 0; i < 256; i++) {
        const canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.equal(canFinalize, false, 'canFinalizeBlock');
      }
    });

    it('produceBlocks - INSPECTION_PERIOD_MULTIPLIER', async () => {
      await produceBlocks(parseInt(await bridge.INSPECTION_PERIOD()) * parseInt(await bridge.INSPECTION_PERIOD_MULTIPLIER()), alice);
    });

    it('finalizeSolution', async () => {
      for (let i = 0; i < 256; i++) {
        const canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.equal(canFinalize, true, 'canFinalizeBlock');

        await (await alice.sendTransaction(
          {
            to: bridge.address,
            data: '0x9af5db2e' +
            (blockNumber + i).toString(16).padStart(64, '0') +
            (solution.length / 2).toString(16).padStart(64, '0') +
            solution,
          }
        )).wait();
      }
    });

    it('canFinalizeBlock', async () => {
      for (let i = 0; i < 512; i++) {
        const canFinalize = await bridge.canFinalizeBlock(blockNumber + i);
        assert.equal(canFinalize, false, 'canFinalizeBlock');
      }
    });
  });
});
