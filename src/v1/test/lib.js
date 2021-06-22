import ethers from 'ethers';

import RootBridge from '../../tsm/lib/RootBridge.js';
import TransactionBuilder from '../lib/TransactionBuilder.js';
import SUPPORTED_TYPES from '../lib/valueTypes.js';
import TYPED_DATA from './typedData2.js';

const { V1TestOne, V1TestOneDebug, ERC721, ERC20 } = Artifacts;

class MyRootBridge extends RootBridge {
  constructor (options) {
    super(options);

    this.latestBlock = { number: BigInt(0) };
  }

  async onDeposit (data, rootBlock) {
  }

  async onBlockBeacon (tx, data, rootBlock) {
    this.latestBlock.number++;
  }

  async onSolution (blockNumber, solutionHash, evt) {
    this.latestSolution = { blockNumber, solutionHash };
  }

  async fetchEvents () {
    return super.fetchEvents(this);
  }
}

export default function setupWorkflow ({ wallet, workflow }) {
  describe('V1TestOne - setupWorkflow', () => {
    const depositAmount = '0xfffffffe';
    const exitAmount = '0x7fffffff';
    const builder = new TransactionBuilder(TYPED_DATA);
    const { rootProvider, alice, bob, daniel } = getDefaultWallets();
    const operatorWallet = daniel;
    const context = {};
    let bridge;
    let rootBridge;
    let erc20;
    let erc721;
    let minted = 0;
    let cumulativeDeposits = BigInt(0);
    let operatorBalanceBefore;
    let walletBalanceBefore;

    async function checkExits () {
      it('check exits', async () => {
        for (let i = 0; i < minted; i++) {
          const owner = await context.bridgeL1.getERC721Exit(erc721.address, i);
          assert.equal(owner, bob.address, `owner of ${i}`);
        }

        const v = await context.bridgeL1.getERC20Exit(erc20.address, bob.address);
        assert.equal(BigInt(v).toString(16), cumulativeDeposits.toString(16));
      });
    }

    before('Prepare contracts', async () => {
      context.debugContract = await deploy(V1TestOneDebug, alice);
      context.bridgeL1 = await deploy(V1TestOne, alice);
      erc20 = await deploy(ERC20, alice);
      erc721 = await deploy(ERC721, alice, 'NFT', 'NFT');

      context.myNode = await startNode('../../v1/lib/index.js', 9999, 3, context.bridgeL1.address, TYPED_DATA);
      rootBridge = new MyRootBridge({ contract: context.bridgeL1.address, rootRpcUrl: process.env.ROOT_RPC_URL });

      await rootBridge.init();
      await rootBridge.initialSync();

      bridge = context.bridgeL1.connect(context.myNode);

      operatorBalanceBefore = await operatorWallet.getBalance();
      walletBalanceBefore = await wallet.getBalance();
    });

    function withdrawERC20 () {
      it('lock', async () => {
        let tx = await erc20.lock(true);
        tx = await tx.wait();
      });

      it('withdraw ERC-20 - should throw', async () => {
        const val = await context.bridgeL1.getERC20Exit(erc20.address, bob.address);
        await assertRevert(context.bridgeL1.connect(bob).withdraw(bob.address, erc20.address, 0, { gasLimit: GAS_LIMIT }));
      });

      it('unlock', async () => {
        let tx = await erc20.lock(false);
        tx = await tx.wait();
      });

      it('withdraw ERC-20', async () => {
        const val = await context.bridgeL1.getERC20Exit(erc20.address, bob.address);

        assert.equal(BigInt(val.toHexString()).toString(16), cumulativeDeposits.toString(16), 'erc20 exit amount');

        const tx = await context.bridgeL1.connect(bob).withdraw(bob.address, erc20.address, 0);
        const receipt = await tx.wait();

        cumulativeDeposits -= BigInt(val.toString());
      });
    }

    function withdrawERC721 () {
      it('withdraw non-existent ERC-721 - should throw', async () => {
        const nft = 0xffffffff;
        assert.equal(await context.bridgeL1.getERC721Exit(erc721.address, nft), '0x0000000000000000000000000000000000000000');
        await assertRevert(context.bridgeL1.connect(bob).withdraw(bob.address, erc721.address, nft, { gasLimit: GAS_LIMIT }));
      });

      it('lock ERC-721', async () => {
        await (await erc721.lock(true)).wait();
      });

      it('withdraw ERC-721 - should throw', async () => {
        const nft = minted - 1;
        const owner = await context.bridgeL1.getERC721Exit(erc721.address, nft);

        assert.equal(owner, bob.address, 'owner - exit');

        await assertRevert(context.bridgeL1.connect(bob).withdraw(bob.address, erc721.address, nft, { gasLimit: GAS_LIMIT }));
      });

      it('unlock ERC-721', async () => {
        await (await erc721.lock(false)).wait();
      });

      it('withdraw ERC-721 wrong msgSender - should throw', async () => {
        const nft = minted - 1;
        const owner = await context.bridgeL1.getERC721Exit(erc721.address, nft);

        assert.equal(owner, bob.address, 'owner - exit');

        await assertRevert(context.bridgeL1.connect(alice).withdraw(alice.address, erc721.address, nft, { gasLimit: GAS_LIMIT }));
      });

      it('withdraw ERC-721', async () => {
        const nft = --minted;
        const owner = await context.bridgeL1.getERC721Exit(erc721.address, nft);

        assert.equal(owner, bob.address, 'owner - exit');

        const tx = await context.bridgeL1.connect(bob).withdraw(bob.address, erc721.address, nft);
        const receipt = await tx.wait();

        assert.equal(await context.bridgeL1.getERC721Exit(erc721.address, nft), '0x0000000000000000000000000000000000000000');
      });
    }

    describe('rubbish > submitBlock > submitSolution > finalizeSolution > challenge', async () => {
      const blockData = '0xf000';
      const solutionHash = '0xfafafafafafafafafafafafafafafafafafafafafafafafafafa000000000000';
      let timestamp;
      let latestBlockNumber;
      let rawBlock;

      before(async () => {
        await rootBridge.fetchEvents();
        latestBlockNumber = rootBridge.latestBlock.number;
      });

      it('submitBlock', async () => {
        const tx = await wallet.sendTransaction(rootBridge.encodeSubmit(blockData));
        const receipt = await tx.wait();
        const blockType = (2).toString(16).padStart(64, '0');
        timestamp = Number((await wallet.provider.getBlock(receipt.blockNumber)).timestamp);
        rawBlock = '0x' + (latestBlockNumber + 1n).toString(16).padStart(64, '0')
          + blockType + timestamp.toString(16).padStart(64, '0') + blockData.replace('0x', '');

        await rootBridge.fetchEvents();

        assert.equal(rootBridge.latestBlock.number.toString(), (latestBlockNumber + 1n).toString());
      });

      it('submitSolution', async () => {
        const tx = await wallet.sendTransaction(rootBridge.encodeSolution(rootBridge.latestBlock.number, solutionHash));
        await tx.wait();

        await rootBridge.fetchEvents();
        assert.equal(rootBridge.latestSolution.blockNumber.toString(), (latestBlockNumber + 1n).toString());
      });

      it('canFinalize', async () => {
        let canFinalize = await context.bridgeL1.canFinalizeBlock(rootBridge.latestBlock.number.toString());
        assert.ok(!canFinalize, '!canFinalizeBlock');

        await produceBlocks(parseInt(await context.bridgeL1.INSPECTION_PERIOD()), wallet);

        canFinalize = await context.bridgeL1.canFinalizeBlock(rootBridge.latestBlock.number.toString());
        assert.ok(canFinalize, 'canFinalizeBlock');
      });

      it('finalizeSolution should fail - wrong solution data', async () => {
        const solution = ['ff'];
        await assertRevert(
          wallet.sendTransaction(
            Object.assign(rootBridge.encodeFinalize(rootBridge.latestBlock.number, solution), { gasLimit: GAS_LIMIT })
          )
        );
      });

      it('challenge', async () => {
        const oldHeight = await context.bridgeL1.finalizedHeight();

        while (true) {
          if ((await context.bridgeL1.finalizedHeight()).gt(oldHeight)) {
            break;
          }
          console.log({oldHeight});

          const tx = await wallet.sendTransaction(
            rootBridge.encodeChallenge({ blockData: rawBlock, witnesses: [], rounds: 10000 })
          );
          const receipt = await tx.wait();
        }

        assert.ok((await context.bridgeL1.finalizedHeight()).gt(oldHeight), 'chain progression');
      });
    });

    describe('rubbish > submitBlock > challenge', async () => {
      // only signature plus 0x7f invalid transaction type
      const blockData =
        '0xff' + createTransaction(builder, 'One', { foo: '0xf', bar: '0xaa', nonce: '0x0' }, alice).slice(2, 130);
      let timestamp;
      let latestBlockNumber;
      let rawBlock;

      before(async () => {
        await rootBridge.fetchEvents();
        latestBlockNumber = rootBridge.latestBlock.number;
      });

      it('submitBlock', async () => {
        const tx = await wallet.sendTransaction(rootBridge.encodeSubmit(blockData));
        const receipt = await tx.wait();
        const blockType = (2).toString(16).padStart(64, '0');
        timestamp = Number((await wallet.provider.getBlock(receipt.blockNumber)).timestamp);
        rawBlock = '0x' + (latestBlockNumber + 1n).toString(16).padStart(64, '0')
          + blockType + timestamp.toString(16).padStart(64, '0') + blockData.replace('0x', '');

        await rootBridge.fetchEvents();

        assert.equal(rootBridge.latestBlock.number.toString(), (latestBlockNumber + 1n).toString());
      });

      it('challenge', async () => {
        const oldHeight = await context.bridgeL1.finalizedHeight();

        while (true) {
          if ((await context.bridgeL1.finalizedHeight()).gt(oldHeight)) {
            break;
          }

          const tx = await wallet.sendTransaction(
            rootBridge.encodeChallenge({ blockData: rawBlock, witnesses: [], rounds: 10000 })
          );
          const receipt = await tx.wait();
        }

        assert.ok((await context.bridgeL1.finalizedHeight()).gt(oldHeight), 'chain progression');
      });
    });

    describe('rubbish > submitBlock > submitSolution > finalizeSolution', async () => {
      const blockData = '0xf000';
      const solution = [''];
      const solutionHash = ethers.utils.keccak256('0x');
      let latestBlockNumber;

      before(async () => {
        await rootBridge.fetchEvents();
        latestBlockNumber = rootBridge.latestBlock.number;
      });

      it('submitBlock', async () => {
        const tx = await wallet.sendTransaction(rootBridge.encodeSubmit(blockData));
        const receipt = await tx.wait();

        await rootBridge.fetchEvents();

        assert.equal(rootBridge.latestBlock.number.toString(), (latestBlockNumber + 1n).toString());
      });

      it('submitSolution', async () => {
        const tx = await wallet.sendTransaction(rootBridge.encodeSolution(rootBridge.latestBlock.number, solutionHash));
        await tx.wait();

        await rootBridge.fetchEvents();
        assert.equal(rootBridge.latestSolution.blockNumber.toString(), (latestBlockNumber + 1n).toString());
      });

      it('canFinalize', async () => {
        let canFinalize = await context.bridgeL1.canFinalizeBlock(rootBridge.latestBlock.number.toString());
        assert.ok(!canFinalize, '!canFinalizeBlock');

        await produceBlocks(parseInt(await context.bridgeL1.INSPECTION_PERIOD()), wallet);

        canFinalize = await context.bridgeL1.canFinalizeBlock(rootBridge.latestBlock.number.toString());
        assert.ok(canFinalize, 'canFinalizeBlock');
      });

      it('finalizeSolution', async () => {
        const tx = await wallet.sendTransaction(rootBridge.encodeFinalize(rootBridge.latestBlock.number, solution));
        const receipt = await tx.wait();
      });
    });

    function doRound () {
      describe('workflow', async () => {
        await workflow(context);
      });

      describe('ERC-20 deposit', async () => {
        it('allowance', async () => {
          const tx = await erc20.approve(context.bridgeL1.address, depositAmount);
          const receipt = await tx.wait();
        });

        it('lock', async () => {
          let tx = await erc20.lock(true);
          tx = await tx.wait();
        });

        it('deposit - should throw', async () => {
          await assertRevert(context.bridgeL1.deposit(erc20.address, 1, await context.bridgeL1.signer.getAddress(), { gasLimit: GAS_LIMIT }));
        });

        it('unlock', async () => {
          let tx = await erc20.lock(false);
          tx = await tx.wait();
        });

        it('ret = false', async () => {
          let tx = await erc20.ret(false);
          tx = await tx.wait();
        });

        it('deposit - should throw', async () => {
          await assertRevert(context.bridgeL1.deposit(erc20.address, 1, await context.bridgeL1.signer.getAddress(), { gasLimit: GAS_LIMIT }));
        });

        it('ret = true', async () => {
          let tx = await erc20.ret(true);
          tx = await tx.wait();
        });

        it('deposit', async () => {
          const user = await alice.getAddress();
          const oldBlock = await context.myNode.getBlockNumber();
          const oldBalance = await bridge.callStatic.balances(erc20.address, user);

          const tx = await context.bridgeL1.deposit(erc20.address, depositAmount, await context.bridgeL1.signer.getAddress());
          const receipt = await tx.wait();

          await waitForValueChange(oldBlock, () => context.myNode.getBlockNumber());

          const newBalance = await bridge.callStatic.balances(erc20.address, user);
          assert.equal(newBalance.toString(), oldBalance.add(depositAmount).toString(), 'token balance should match');
          cumulativeDeposits += BigInt(depositAmount);
        });

        it('transfer to Bob', async () => {
          const rawTx = '0x' + createTransaction(builder, 'Transfer', { to: bob.address, token: erc20.address, value: depositAmount }, alice);
          const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);
          const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);
          assert.equal(receipt.status, '0x1', 'receipt.status');
        });

        it('Bob: exit #1', async () => {
          //const oldExitBalance = await bridge.getERC20Exit(erc20.address, bob.address);

          const rawTx = '0x' + createTransaction(builder, 'Exit', { token: erc20.address, value: exitAmount }, bob);
          const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);
          assert.equal(txHash, ethers.utils.keccak256(rawTx));
          const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);
          assert.equal(receipt.status, '0x1', 'receipt.status');

          //const newExitBalance = await bridge.getERC20Exit(erc20.address, bob.address);
          //assert.equal(newExitBalance.toString(), oldExitBalance.add(exitAmount).toString(), 'exit balance should match');
        });

        it('Bob: exit #2', async () => {
          const rawTx = '0x' + createTransaction(builder, 'Exit', { token: erc20.address, value: exitAmount }, bob);
          const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);
          assert.equal(txHash, ethers.utils.keccak256(rawTx));
          const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);
          assert.equal(receipt.status, '0x1', 'receipt.status');
        });
      });

      describe('ERC-721 deposit', async () => {
        let nftId;

        before(() => {
          nftId = minted++;
        });

        it('mint nft', async () => {
          const tx = await erc721.mint(await alice.getAddress(), nftId);
          const receipt = await tx.wait();
        });

        it('approve bridge', async () => {
          const tx = await erc721.approve(context.bridgeL1.address, nftId);
          const receipt = await tx.wait();
        });

        it('deposit nft', async () => {
          const user = await alice.getAddress();
          const oldBlock = await context.myNode.getBlockNumber();
          const oldOwner = await bridge.callStatic.owners(erc721.address, nftId);

          const tx = await context.bridgeL1.deposit(erc721.address, nftId, await context.bridgeL1.signer.getAddress());
          const receipt = await tx.wait();
          await waitForValueChange(oldBlock, () => context.myNode.getBlockNumber());

          const newOwner = await bridge.callStatic.owners(erc721.address, nftId);
          assert.equal(newOwner, user, 'token owner should match');
        });

        it('transfer to Bob', async () => {
          const rawTx = '0x' + createTransaction(builder, 'Transfer', { to: bob.address, token: erc721.address, value: nftId }, alice);
          const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);
          const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);
          assert.equal(receipt.status, '0x1', 'receipt.status');
        });

        it('test revert', async () => {
          const one = '0x' + createTransaction(builder, 'ShouldRevert', { shouldRevertWithString: 1 }, alice);
          const two = '0x' + createTransaction(builder, 'ShouldRevert', { shouldRevertWithString: 0 }, alice);

          await assert.rejects(context.myNode.send('eth_sendRawTransaction', [one]), /hello world/);
          await assert.rejects(context.myNode.send('eth_sendRawTransaction', [two]), /evm errno: 7/);
          await assert.rejects(context.myNode.send(
            'eth_call',
            [{ from: alice.address, primaryType: 'ShouldRevert', message: { shouldRevertWithString: 1 } }]),
            /hello world/
          );
          await assert.rejects(context.myNode.send(
            'eth_call',
            [{ from: alice.address, primaryType: 'ShouldRevert', message: { shouldRevertWithString: 0 } }]),
            /evm errno: 7/
          );
        });

        it('Bob: exit', async () => {
          //const oldOwner = await bridge.getERC721Exit(erc721.address, nftId);
          //assert.equal(oldOwner, '0x0000000000000000000000000000000000000000', 'nft owner');

          const rawTx = '0x' + createTransaction(builder, 'Exit', { token: erc721.address, value: nftId }, bob);
          const txHash = await context.myNode.send('eth_sendRawTransaction', [rawTx]);
          assert.equal(txHash, ethers.utils.keccak256(rawTx));
          const receipt = await context.myNode.send('eth_getTransactionReceipt', [txHash]);
          assert.equal(receipt.status, '0x1', 'receipt.status');

          //const newOwner = await bridge.getERC721Exit(erc721.address, nftId);
          //assert.equal(newOwner, bob.address, 'nft owner');
        });

        it('submit a custom block beacon', async () => {
          const oldBlock = await context.myNode.getBlockNumber();
          const foo = 1;
          const bar = 124;
          const tx = await context.bridgeL1.submitCustomBlock(foo, bar);
          const receipt = await tx.wait();
          assert.equal(receipt.logs.length, 1);
          await waitForValueChange(oldBlock, () => context.myNode.getBlockNumber());

          {
            // yes, there is still a pending block, thus the 'old' height is exactly the block we want
            const block = await context.myNode.send('eth_getBlockByNumber', ['0x' + oldBlock.toString(16), true]);
            const tx = block.transactions[0];
            const receipt = await context.myNode.send('eth_getTransactionReceipt', [tx.hash]);
            assert.equal(receipt.status, '0x1');
            assert.equal(receipt.logs.length, 2);
            assert.equal(tx.primaryType, 'CustomBlockBeacon');
            const decoded = ethers.utils.defaultAbiCoder.decode(['uint', 'uint'], tx.message.data);
            assert.equal(decoded[0].toNumber(), foo, 'foo');
            assert.equal(decoded[1].toNumber(), bar, 'bar');
          }
        });
      });
    }

    describe('chain - challenge', function () {
      doRound();
      describe('finalize', function () {
        it('submitBlock', () => submitBlockUntilEmpty(context.bridgeL1, rootProvider, context.myNode));
        it('doChallenge', () => doChallenge(context.bridgeL1, rootProvider, context.myNode));
        it('debugStorage', () => debugStorage(context.bridgeL1, rootProvider, context.myNode));
        checkExits();
        it('sleep', async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        });
        it('debugStorage', () => debugStorage(context.bridgeL1, rootProvider, context.myNode));
      });
    });

    describe('chain - forward', function () {
      doRound();
      describe('finalize', function () {
        it('submitBlock', () => submitBlockUntilEmpty(context.bridgeL1, rootProvider, context.myNode));
        it('doForward', () => doForward(context.bridgeL1, rootProvider, context.myNode));
        it('sleep', async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        });
        it('debugStorage', () => debugStorage(context.bridgeL1, rootProvider, context.myNode));
        withdrawERC20();
        withdrawERC721();
        checkExits();
      });
    });

    describe('check ether balances', () => {
      it('check balance of wallet', async () => {
        // just measure the ether balance
        const balance = await wallet.getBalance();
        const paid = walletBalanceBefore.sub(balance).toNumber();
        const maxDelta = 1000;
        const baseline = 3095109;
        // before berlin = 3042052
        // after berlin  = 3075052

        console.log({ baseline, paid });
        assert.ok(paid < baseline + maxDelta, `gas usage should not be too high`);
      });

      it('check balance of node operator wallet', async () => {
        const balance = await operatorWallet.getBalance();
        const paid = operatorBalanceBefore.sub(balance).toNumber();

        console.log({ paid });
      });
    });

    describe('kill node', () => {
      it('debug_kill', async () => {
        try {
          await context.myNode.send('debug_kill', []);
        } catch (e) {
        }
      });
    });
  });
}
