import { toHexPrefix } from '../../common/conversion.js';
import { timeLog, privateToAddress, signRlpTransaction, formatObject } from '../../common/utils.js';

import Methods from './Methods.js';
import Block from './Block.js';
import RootBridge from './RootBridge.js';

const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const IS_NATIVE_ENV = typeof process !== 'undefined';

/// @dev Glue for everything.
export default class Bridge {
  constructor (options, BlockClass) {
    this.bytecodeCache = Object.create(null);
    this.pendingBlock = new (BlockClass || Block)(null);

    this.disableValidation = options.operatingMode === 'producer';
    this.disableBlockProduction = options.operatingMode === 'validator';
    this.debugMode = options.debugMode ? true : false;
    this.eventCheckMs = options.eventCheckMs || 1000;
    // may include custom flags
    this.featureFlags = options.featureFlags | 0;

    // options regarding block submission behaviour
    this.blockSizeThreshold = options.blockSizeThreshold || 1000;
    this.blockTimeThreshold = (options.blockTimeThreshold * 1000) || 60000;

    // options regarding solution submission behaviour
    this.submitSolutionThreshold = options.submitSolutionThreshold || 256;
    this.submitSolutionTimeThreshold = (options.submitSolutionTimeThreshold * 1000) || 60000;
    // challenge behaviour
    this.alwaysChallengeDisputedBlocks = !!options.alwaysChallengeDisputedBlocks;
    // pending block tx pool behaviour
    this.alwaysKeepRevertedTransactions = this.debugMode || !!options.alwaysKeepRevertedTransactions;
    // option to disable store & restore pending transactions
    this.storeAndRestoreDisabled = !!options.disableStoreAndRestore;

    // incoming transactions
    this.maxTransactionSize = Number(options.maxTransactionSize) | 0;

    // rpc related
    this.rpcApiKey = options.rpcApiKey || '';
    this.disabledRpcMethods = (options.disabledRpcMethods || '').split(',');

    // TODO: find a better place / method
    this._pendingBlockSubmission = false;
    this._lastBlockSubmission = Date.now();
    this._lastSolutionSubmitted = Date.now();

    if (options.privKey) {
      this.privKey = options.privKey.replace('0x', '');
      this.signer = toHexPrefix(privateToAddress(this.privKey));
    } else {
      this.log('Warning: No private key - Read-only mode');
    }

    this.rootBridge = new RootBridge(options);

    // keep track of pending transactions
    this._pendingTransactionPool = [];
    // address of the rollup contract
    // can be changed via the RollupUpgrade(address) event
    this.implementationAddress = this.rootBridge.protocolAddress;
  }

  log (...args) {
    timeLog('Bridge', ...args);
  }

  async reloadConfig () {
    // safe number for the client (not enforced)
    this.MAX_SOLUTION_SIZE = 8 << 10;
    this.MAX_BLOCK_SIZE = await this.rootBridge.MAX_BLOCK_SIZE();
    this.INSPECTION_PERIOD = await this.rootBridge.INSPECTION_PERIOD();
    this.INSPECTION_PERIOD_MULTIPLIER = await this.rootBridge.INSPECTION_PERIOD_MULTIPLIER();
    this.CHAIN_ID = Number(await this.rootBridge.fetchJson('net_version', []));

    const rootProviderVersion = await this.rootBridge.fetchJson('web3_clientVersion', []);

    this.log(
      {
        rootRpcUrl: this.rootBridge.rootRpcUrl,
        rootProviderVersion,
        bridge: this.rootBridge.protocolAddress,
        implementation: this.implementationAddress,
        MAX_BLOCK_SIZE: this.MAX_BLOCK_SIZE,
        MAX_SOLUTION_SIZE: this.MAX_SOLUTION_SIZE,
        INSPECTION_PERIOD: this.INSPECTION_PERIOD,
        INSPECTION_PERIOD_MULTIPLIER: this.INSPECTION_PERIOD_MULTIPLIER,
        CHAIN_ID: this.CHAIN_ID,
        wallet: this.signer,
        debugMode: this.debugMode,
        eventCheckMs: this.eventCheckMs,
        featureFlags: this.featureFlags,
      }
    );
  }

  async init () {
    await this.rootBridge.init();
    await this.reloadConfig();
    await this.rootBridge.initialSync(this);
    this.ready = true;
    this._eventLoop();

    // Disable automatic submissions for testing or debugging purposes.
    if (this.debugMode) {
      this.log('Disabled update loop because of debugMode');
    }

    if (IS_NATIVE_ENV && !this.storeAndRestoreDisabled) {
      // restore and check pendingTransactionPool
      const { existsSync, readFileSync, mkdirSync } = await import('fs');

      // create directories
      this._dataDir = `./data/${this.rootBridge.protocolAddress}`;
      mkdirSync(this._dataDir, { recursive: true });

      const path = `${this._dataDir}/txsafe.json`;
      if (existsSync(path)) {
        try {
          const txs = JSON.parse(readFileSync(path));

          for (const tx of txs) {
            const found = await this.getTransaction(tx.hash);

            if (!found) {
              try {
                // add again
                await this.runTx({ data: tx.raw });
              } catch (e) {
                this.log(`Error adding transaction from store`, e);
              }
            }
          }
        } catch (e) {
          this.log('restore transactions from store', e);
        }
      }
    }
  }

  async forwardChain () {
    if (this.shouldSubmitNextBlock()) {
      this._pendingBlockSubmission = true;

      this.log('submitting block...');
      try {
        await this.pendingBlock.submitBlock(this);
      } catch (e) {
        this.log(e);
      }

      this._pendingBlockSubmission = false;
      this._lastBlockSubmission = Date.now();
    }

    // finalize or submit solution, if possible
    if (!this.disableValidation) {
      const next = (await this.rootBridge.finalizedHeight()) + BIG_ONE;
      const wrongSolutions = [];
      const pendingSolutions = [];
      const pendingFinalizations = [];

      // we can do this for the next 256 pending blocks
      for (let i = 0; i < 256; i++) {
        const block = await this.getBlockByNumber(next + BigInt(i));

        if (!block || !block.hash) {
          break;
        }

        // this.log(`forwardChain: checking block(${block.number})`);

        // we found the next pending block
        // no solution yet?
        if (!block.submittedSolutionHash) {
          pendingSolutions.push(block.number);
        } else {
          // ...has a submitted solution
          const mySolution = await block.computeSolution(this);

          // check if the solution is already marked as invalid
          if (mySolution.hash !== block.submittedSolutionHash) {
            const alreadyDisputed = await this.rootBridge.isDisputed(block.number);

            if (!alreadyDisputed) {
              wrongSolutions.push(block.number);
            } else if (block.number === next) {
              this.log('Different results, starting challenge...');
              await this.processChallenge(block);
            }
          } else {
            // solution is correct
            pendingFinalizations.push(block.number);
          }
        }
      }

      // dispute them, if any
      if (wrongSolutions.length) {
        await this.dispute(wrongSolutions);
      }

      // submit them, if any
      // honor config parameter that specifies a threshold for submission
      if (
        pendingSolutions.length >= this.submitSolutionThreshold ||
        Date.now() > this._lastSolutionSubmitted + this.submitSolutionTimeThreshold
      ) {
        await this.submitSolution(pendingSolutions);
      }

      // for tracking the block numbers that can be normally finalized
      const todo = [];
      // finalize them, if any
      for (const blockNumber of pendingFinalizations) {
        const pendingBlock = await this.getBlockByNumber(blockNumber);

        // at this point the solution is considered valid and finalization is only a question of patience
        const canFinalize = await this.rootBridge.canFinalizeBlock(pendingBlock.number);
        this.log(`Can finalize pending block: ${pendingBlock.number}=${canFinalize}`);

        if (canFinalize) {
          todo.push(pendingBlock.number);
        } else {
          // can't finalize, maybe the solution is too young?
          if (this.alwaysChallengeDisputedBlocks) {
            const isDisputed = await this.rootBridge.isDisputed(pendingBlock.number);

            if (isDisputed) {
              this.log(`starting challenge for disputed block: ${pendingBlock.number}`);
              await this.processChallenge(pendingBlock);
            }
          }
        }
      }

      // finalize
      await this.finalizeSolution(todo);
    }
  }

  async _eventLoop () {
    try {
      if (!this._debugHaltEvents) {
        await this.rootBridge.fetchEvents(this);
      }
      if (!this.debugMode) {
        await this.forwardChain();
      }
    } catch (e) {
      this.log(e);
    }
    setTimeout(this._eventLoop.bind(this), this.eventCheckMs);
  }

  async _saveTxPool () {
    // filter _pendingTransactionPool
    if (IS_NATIVE_ENV && !this.storeAndRestoreDisabled) {
      const tmp = [];

      for (const tx of this._pendingTransactionPool) {
        const { block } = await this.getBlockOfTransaction(tx.hash);

        // if this transaction is inside a block that is lower than the pending one,
        // then drop it
        if (block && block.number < this.pendingBlock.number) {
          continue;
        }

        // else append it again
        tmp.push(tx);
      }

      // update
      this._pendingTransactionPool = tmp;

      const { writeFileSync } = await import('fs');
      // save to file
      writeFileSync(
        `${this._dataDir}/txsafe.json`,
        JSON.stringify(this._pendingTransactionPool)
      );
    }
  }

  async onDeposit (data, rootBlock) {
    const block = new this.pendingBlock.constructor(this.pendingBlock.prevBlock);

    await block.onDeposit(data, rootBlock, this);
    await this.addBlock(block);
  }

  async onBlockBeacon (tx, data, rootBlock) {
    const block = new this.pendingBlock.constructor(this.pendingBlock.prevBlock);

    await block.fromBeacon(data, rootBlock, this);
    await this.addBlock(block);
  }

  async onCustomBlockBeacon (tx, data, rootBlock) {
    const block = new this.pendingBlock.constructor(this.pendingBlock.prevBlock);

    await block.fromCustomBeacon(data, rootBlock, this);
    await this.addBlock(block);
  }

  /// @dev Checks if `blockNumber` is the next Block that needs finalization.
  async isCurrentBlock (blockNumber) {
    const finalizedHeight = (await this.rootBridge.finalizedHeight()) + BIG_ONE;

    return finalizedHeight === blockNumber;
  }

  async onSolution (blockNumber, solutionHash, evt) {
    this.log('Solution registered');
    this.log({ blockNumber, solutionHash });

    const block = await this.getBlockByNumber(BigInt(blockNumber));

    // TODO
    if (!block) {
      return;
    }

    if (block.submittedSolutionHash) {
      this.log('A solution was already registered for this block. Ignoring.');
      return;
    }

    block.submittedSolutionHash = solutionHash;
    block.submittedSolutionBlockNumber = Number(evt.blockNumber);
  }

  async onRollupUpgrade (address, evt) {
    this.log('new implementation', address);

    // create a new block and rebase
    const block = this.pendingBlock;
    const rebaseBlock = new block.constructor(block.prevBlock);
    // upgrade and recalculate everything
    this.implementationAddress = address;
    await this.reloadConfig();
    await rebaseBlock.rebase(block, this);

    this.pendingBlock = rebaseBlock;
  }

  getBlockOfTransaction (txHash) {
    let block = this.pendingBlock;

    while (block) {
      for (let txIndex = 0, len = block.transactions.length; txIndex < len; txIndex++) {
        const tx = block.transactions[txIndex];

        if (tx.hash === txHash) {
          return { block, tx, txIndex };
        }
      }
      block = block.prevBlock;
    }

    return {};
  }

  async getBlockByHash (hash, includePending) {
    if (includePending && hash === this.pendingBlock.hash) {
      return this.pendingBlock;
    }

    let block = this.pendingBlock.prevBlock;

    while (block) {
      if (block.hash === hash) {
        return block;
      }
      block = block.prevBlock;
    }

    return null;
  }

  async getBlockByNumber (num, includePending) {
    if (includePending && num === this.pendingBlock.number) {
      return this.pendingBlock;
    }

    let block = this.pendingBlock.prevBlock;

    while (block) {
      if (block.number === num) {
        return block;
      }
      block = block.prevBlock;
    }

    return null;
  }

  async addBlock (block) {
    block.freeze();

    // create a new head
    const newHead = new this.pendingBlock.constructor(block);
    const head = this.pendingBlock;

    await newHead.rebase(head, this);
    this.pendingBlock = newHead;
  }

  async getNonce (addr) {
    const nonce = this.pendingBlock.nonces[addr.toLowerCase()];

    return nonce || BIG_ZERO;
  }

  getTransaction (txHash) {
    let block = this.pendingBlock;

    while (block) {
      for (const tx of block.transactions) {
        if (tx.hash === txHash) {
          return tx;
        }
      }

      block = block.prevBlock;
    }

    return null;
  }

  async runCall (tx) {
    return this.pendingBlock.dryExecuteTx(tx, this);
  }

  async runTx ({ data }) {
    let hexString = data;

    if (typeof data === 'object') {
      // encode the transaction object if `data` is a object instead of a hex-string
      hexString = await this.pendingBlock.encodeTx(data, this);
    }

    if (this.maxTransactionSize > 0) {
      if (((hexString.length / 2) - 1) > this.maxTransactionSize) {
        throw new Error(`Transaction size (${this.maxTransactionSize}) exceeded`);
      }
    }

    const tx = await this.pendingBlock.addTransaction(hexString, this);

    if (!tx) {
      throw new Error('Invalid transaction');
    }

    // store tx into pending pool. We might get duplicates, but this is not an error per se.
    {
      this._pendingTransactionPool.push({ hash: tx.hash, raw: hexString });
      // async
      this._saveTxPool();
    }

    return tx.hash;
  }

  async getCode (addr) {
    let bytecode = this.bytecodeCache[addr];

    if (!bytecode) {
      bytecode = this.rootBridge.fetchJson('eth_getCode', [addr, 'latest']);
      this.bytecodeCache[addr] = bytecode;
    }

    return bytecode;
  }

  setCode (addr, bytecodeHexStr) {
    this.bytecodeCache[addr] = bytecodeHexStr;
  }

  async submitBlock () {
    const blockNumber = await this.pendingBlock.submitBlock(this);

    return `0x${(blockNumber || 0).toString(16)}`;
  }

  async submitSolution (blockNumbers) {
    if (!blockNumbers || !Array.isArray(blockNumbers)) {
      throw new TypeError(`expected an array of block numbers`);
    }
    if (blockNumbers.length === 0 || blockNumbers.length > 256) {
      throw new Error(`invalid length of blockNumbers(${blockNumbers.length})`);
    }

    const firstBlock = blockNumbers[0];
    let lastNumber = firstBlock - BIG_ONE;
    let data = '';

    for (const blockNumber of blockNumbers) {
      let diff = blockNumber - lastNumber;

      if (diff < BIG_ONE) {
        throw new Error(`incorrect sequence of blockNumbers`);
      }

      while (diff-- > BIG_ONE) {
        // fill `holes`
        data += ZERO_HASH;
      }

      const block = await this.getBlockByNumber(blockNumber);

      if (!block) {
        throw new Error(`Block(${blockNumber}) not found`);
      }

      const mySolution = await block.computeSolution(this);
      data += mySolution.hash.replace('0x', '');
      lastNumber = blockNumber;
      this.log(`submitting solution for block(${blockNumber})`);
    }

    const receipt = await this.wrapSendTransaction(
      this.rootBridge.encodeSolution(firstBlock, data)
    );

    this._lastSolutionSubmitted = Date.now();
    this.log('Bridge.submitSolution', Number(receipt.gasUsed));

    return true;
  }

  async finalizeSolution (blockNumbers) {
    if (!blockNumbers.length) {
      // nothing todo
      return true;
    }

    const TAG = 'Bridge.finalizeSolution';
    const blocks = [];
    const payloads = [];
    const firstBlockNumber = blockNumbers[0];
    for (const blockNumber of blockNumbers) {
      const block = await this.getBlockByNumber(blockNumber);

      if (!block) {
        throw new Error(`Block(${blockNumber}) not found`);
      }

      const mySolution = await block.computeSolution(this);
      this.log(TAG, mySolution);
      blocks.push(block);
      payloads.push(mySolution.payload);
    }

    const txData = this.rootBridge.encodeFinalize(
      firstBlockNumber,
      payloads
    );
    const receipt = await this.wrapSendTransaction(txData);
    this.log(TAG, Number(receipt.gasUsed));

    // TODO: maybe move this to `forwardChain`
    for (const block of blocks) {
      // all blocks except the latest submitted block are safe to prune
      if (this.pendingBlock.prevBlock !== block) {
        block.prune();
      }
    }

    return true;
  }

  async dispute (blockNumbers) {
    this.log(`dispute: ${blockNumbers}`);

    const receipt = await this.wrapSendTransaction(this.rootBridge.encodeDispute(blockNumbers));

    this.log(`txHash: ${receipt.transactionHash} status:${receipt.status}`);
  }

  async directReplay (blockNumber) {
    const block = await this.getBlockByNumber(blockNumber);

    if (!block) {
      return false;
    }

    await this.processChallenge(block);

    return true;
  }

  async processChallenge (block) {
    const TAG = `Bridge.challenge(${block.number})`;
    const cBlock = await this.rootBridge.finalizedHeight();

    if (cBlock >= block.number) {
      this.log(TAG, 'ALREADY COMPLETED');
      return;
    }

    let lastChallengeOffset = await this.rootBridge.challengeOffset();
    let cumulative = 0;
    try {
      let ctr = 0;
      while (true) {
        const lBlock = await this.rootBridge.finalizedHeight();

        if (lBlock >= block.number) {
          // done
          this.log(TAG, 'done', cumulative);
          break;
        }

        lastChallengeOffset = await this.rootBridge.challengeOffset();
        const challengeData = await block.computeChallenge(lastChallengeOffset, this);
        let tx;
        {
          // the nodes in the ethereum network have a (hardcoded in clienst) limit
          // for transactions arriving in the mempool.
          // This is not consensus related but if a transaction becomes too large,
          // then we have problem.
          const MAX_SAFE_CALLDATA_SIZE = 63 << 10;
          const rootBlock = await this.rootBridge.fetchJson('eth_getBlockByNumber', ['latest', false]);
          const maxGas = ~~Number(rootBlock.gasLimit) - 1_000_000;
          // Use 1/4 of the block gas limit as our target
          // TODO: make this configurable
          //const targetGas = ~~(maxGas * 0.25);

          const witnesses = challengeData.witnesses;
          while (witnesses.length >= 0) {
            const rounds = witnesses.length || 1;
            let tmp = Object.assign({}, challengeData);
            tmp.rounds = rounds;
            tmp.witnesses = witnesses;

            tmp = this.rootBridge.encodeChallenge(tmp);
            if (((tmp.data.length / 2) - 2) >= MAX_SAFE_CALLDATA_SIZE) {
              this.log(TAG, `Exceeded safe transaction size. Reducing payload.`);
              witnesses.pop();
              continue;
            }

            tmp.from = '0x'.padEnd(42, '1');
            tmp.gas = `0x${maxGas.toString(16)}`;

            let callRes;
            try {
              callRes = await this.rootBridge.fetchJson('eth_call', [tmp, 'latest']);
            } catch (e) {
              this.log(TAG, e);
              witnesses.pop();
              continue;
            }

            const complete = Number(callRes.substring(0, 66));
            const challengeOffset = Number('0x' + callRes.substring(66, 130));

            this.log(TAG, { rounds, complete, challengeOffset, lastChallengeOffset });

            if (complete || challengeOffset > lastChallengeOffset) {
              tx = tmp;
              break;
            }

            if (!witnesses.length) {
              break;
            }
            witnesses.pop();
          }

          if (!tx) {
            throw new Error('Unable to engage challenge');
          }
        }

        const receipt = await this.wrapSendTransaction(tx);
        cumulative += Number(receipt.gasUsed);

        ctr++;

        this.log(TAG, `step = ${ctr}`, Number(receipt.gasUsed));
      }
    } catch (e) {
      const cBlock = await this.rootBridge.finalizedHeight();
      if (cBlock >= block.number) {
        this.log(TAG, 'ALREADY COMPLETED');
        return;
      }

      this.log(TAG, e);
    }
  }

  async rpcCall (body) {
    const method = body.method;
    const { id, jsonrpc } = body;

    {
      // TODO: replace simple api key with nonce + HMAC or nonce + signature
      const authenticated = this.rpcApiKey ? body.auth === this.rpcApiKey : false;
      if (
        !method ||
        ((method.startsWith('debug') && (!this.debugMode && !authenticated))) ||
        (this.disabledRpcMethods.indexOf(method) !== -1 && !authenticated)
      ) {
        return {
          id,
          jsonrpc,
          error: {
            code: -32601,
            message: 'DebugMode is not enabled or request is not authenticated',
          }
        };
      }
    }

    if (Methods.hasOwnProperty(method)) {
      const func = Methods[method];

      try {
        if (!this.ready) {
          throw new Error('Bridge is not ready yet');
        }

        return {
          id,
          jsonrpc,
          result: await func.call(Methods, body, this)
        };
      } catch (e) {
        this.log(e);

        return {
          id,
          jsonrpc,
          error: {
            code: -32000,
            message: (e.message || e).toString(),
          }
        };
      }
    }

    return {
      id,
      jsonrpc,
      error: {
        code: -32601,
        message: `The method ${method} does not exist/is not available`,
      }
    };
  }

  async wrapSendTransaction (txData) {
    if (!this.signer) {
      throw new Error('Read-only mode');
    }

    const TAG = 'wrapSendTransaction';
    let gasPrice = BigInt(await this.rootBridge.fetchJson('eth_gasPrice', []));
    // TODO: make this a config option
    gasPrice = ((gasPrice / 100n) * 130n) || 1n;
    const tx = {
      from: this.signer,
      to: txData.to,
      gasPrice: `0x${gasPrice.toString(16)}`,
      data: txData.data || '0x',
    };

    if (!tx.gas) {
      // TODO: make gasPadding a config option
       try {
        const gasPadding = 50000;
        const gas = (~~(Number((await this.rootBridge.fetchJson('eth_estimateGas', [tx, 'latest']))) + gasPadding)).toString(16);
        tx.gas = `0x${gas}`;
      } catch (e) {
        this.log(TAG, 'eth_estimateGas', e);
        throw e;
      }
      try {
        const ret = await this.rootBridge.fetchJson('eth_createAccessList', [tx, 'latest']);
        if (ret.error) {
          throw new Error(ret.error);
        }
        tx.accessList = ret.accessList;
      } catch (e) {
        this.log(TAG, 'eth_createAccessList', e);
        throw e;
      }
    }

    tx.nonce = Number(await this.rootBridge.fetchJson('eth_getTransactionCount', [this.signer, 'latest']));

    const { txHash, rawTxHex } = await signRlpTransaction(tx, this.privKey, this.CHAIN_ID);

    await this.rootBridge.fetchJson('eth_sendRawTransaction', [rawTxHex]);

    // TODO bound loop size
    while (true) {
      const latestNonce = Number(await this.rootBridge.fetchJson('eth_getTransactionCount', [this.signer, 'latest']));

      if (latestNonce > tx.nonce) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    let receipt;
    while (true) {
      receipt = await this.rootBridge.fetchJson('eth_getTransactionReceipt', [txHash]);

      if (receipt) {
        if (Number(receipt.status) === 0) {
          throw new Error(`transaction reverted`);
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return receipt;
  }

  shouldSubmitNextBlock () {
    // TODO: support more than one
    if (this.disableBlockProduction || this._pendingBlockSubmission || !this.pendingBlock.transactions.length) {
      return false;
    }

    if (this.pendingBlock.submissionDeadline !== 0) {
      // TODO: make this a config option or calculate block submission time averages
      // 180 seconds
      const submissionTime = 180;
      const now = ~~(Date.now() / 1000)
      const shouldSubmit = now >= (this.pendingBlock.submissionDeadline - submissionTime);

      this.log(`should submit next block because of transaction deadline: ${shouldSubmit} delta: ${this.pendingBlock.submissionDeadline - now}`);

      if (shouldSubmit) {
        return shouldSubmit;
      }
    }

    const timeSinceLastSubmission = Date.now() - this._lastBlockSubmission;
    const size = this.pendingBlock.calculateSize();

    return size >= this.blockSizeThreshold || timeSinceLastSubmission >= this.blockTimeThreshold;
  }

  async rollupStats () {
    const blockWindow = [];
    const finalizedHeight = await this.rootBridge.finalizedHeight();
    const next = finalizedHeight + BIG_ONE;

    // we can do this for the next 256 pending blocks
    for (let i = 0; i < 256; i++) {
      const block = await this.getBlockByNumber(next + BigInt(i));

      if (!block || !block.hash) {
        break;
      }

      const canFinalize = await this.rootBridge.canFinalizeBlock(block.number);
      const expectedSolutionHash = (await block.computeSolution(this)).hash;
      const submittedSolutionHash = block.submittedSolutionHash || null;
      const submittedSolutionBlockNumber = block.submittedSolutionBlockNumber || null;
      const regularFinalizationTarget =
        submittedSolutionBlockNumber ? submittedSolutionBlockNumber + this.INSPECTION_PERIOD : null;

      blockWindow.push(
        {
          blockNumber: Number(block.number),
          disputed: await this.rootBridge.isDisputed(block.number),
          expectedSolutionHash,
          submittedSolutionHash,
          submittedSolutionBlockNumber,
          regularFinalizationTarget,
          canFinalize
        }
      );
    }

    const nUnsubmittedTransactions = this.pendingBlock.transactions.length;
    const challengeOffset = await this.rootBridge.challengeOffset();
    return {
      blockWindow,
      nUnsubmittedTransactions,
      challengeOffset,
      finalizedHeight: Number(finalizedHeight)
    };
  }
}
