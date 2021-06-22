import createFetchJson from '../../common/createFetchJson.js';
import { packString } from '../../common/conversion.js';
import { timeLog } from '../../common/utils.js';

// Deposit(address,address,uint256,uint256)
const TOPIC_DEPOSIT = '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7';
// BlockBeacon()
const TOPIC_BEACON = '0x98f7f6a06026bc1e4789634d93bff8d19b1c3b070cc440b6a6ae70bae9fec6dc';
// CustomBlockBeacon()
const TOPIC_CUSTOM_BEACON = '0xb078ebcc4cca318b4b52d21e9a19505dfb2bcdaad38bee3d6b5d95b7d329b870';
// NewSolution()
const TOPIC_SOLUTION = '0xd180748b1b0c35f46942acf30f64a94a79d303ffd18cce62cbbb733b436298cb';
// RollupUpgrade(address)
const TOPIC_ROLLUP_UPGRADE = '0x1af6bceb4b9de70d3a0d322db3ebde262ab3f6375cc4c59f04a39834d8c03f0d';

const FUNC_SIG_SUBMIT_BLOCK = '0x25ceb4b2';
const FUNC_SIG_SUBMIT_SOLUTION = '0x84634f44';
const FUNC_SIG_CHALLENGE = '0xd2ef7398';
const FUNC_SIG_FINALIZE = '0x9af5db2e';
const FUNC_SIG_DISPUTE = '0x1f2f7fc3';
const FUNC_SIG_STATE_ROOT = '0x9588eca2';

const FUNC_SIG_MAX_BLOCK_SIZE = '0x6ce02363';
const FUNC_SIG_INSPECTION_PERIOD = '0xe70f0e35';
const FUNC_SIG_INSPECTION_PERIOD_MULTIPLIER = '0xfe4314fe';
const FUNC_SIG_BLOCK_META = '0x3749779c';
const FUNC_SIG_FINALIZED_HEIGHT = '0xb2223bd6';
const FUNC_SIG_CHALLENGE_OFFSET = '0x058b7a6a';

const STATE_ROOT_STORAGE_KEY = '0xd27f023774f5a743d69cfc4b80b1efe4be7912753677c20f45ee5464160b7d24';
const CHALLENGE_OFFSET_KEY = '0xd733644cc0b916a23c558a3a2815e430d2373e6f5bf71acb729373a0dd995878';

const UINT_ZERO = '0x'.padEnd(66, '0');
const UINT_MAX = '0x'.padEnd(66, 'f');
const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const MAX_SHIFT = BigInt(255);

export default class RootBridge {
  constructor (options) {
    this.rootRpcUrl = options.rootRpcUrl;
    this.protocolAddress = options.contract.toLowerCase();

    this.eventQueue = [];
    this.eventFilter = {
      fromBlock: 0,
      toBlock: 0,
      address: this.protocolAddress,
      topics: [
        [TOPIC_DEPOSIT, TOPIC_BEACON, TOPIC_CUSTOM_BEACON, TOPIC_SOLUTION, TOPIC_ROLLUP_UPGRADE],
      ],
    };

    this.eventHandlers = {};
    this.eventHandlers[TOPIC_DEPOSIT] =
      async (evt, delegate) => {
        let offset = 26;
        const data =
          evt.data.substring(offset, offset += 40)
          + evt.data.substring(offset += 24, offset += 40)
          + evt.data.substring(offset, offset += 64)
          + evt.data.substring(offset, offset += 64);

        const rootBlock = await this.fetchRootBlock(evt.blockHash);

        await delegate.onDeposit(data, rootBlock);
      };
    this.eventHandlers[TOPIC_BEACON] =
      async (evt, delegate) => {
        const tx = await this.fetchJson('eth_getTransactionByHash', [evt.transactionHash]);
        const rootBlock = await this.fetchRootBlock(evt.blockHash);
        const data = tx.input.substring(10, tx.input.length);

        await delegate.onBlockBeacon(tx, data, rootBlock);
      };
    this.eventHandlers[TOPIC_CUSTOM_BEACON] =
      async (evt, delegate) => {
        const tx = await this.fetchJson('eth_getTransactionByHash', [evt.transactionHash]);
        const rootBlock = await this.fetchRootBlock(evt.blockHash);
        const data = tx.input.substring(10, tx.input.length);

        await delegate.onCustomBlockBeacon(tx, data, rootBlock);
      };
    this.eventHandlers[TOPIC_SOLUTION] =
      async (evt, delegate) => {
        const tx = await this.fetchJson('eth_getTransactionByHash', [evt.transactionHash]);
        // strip the function sig
        const data = tx.input.substring(10, tx.input.length);
        // first 32 bytes is block number
        let blockNum = BigInt('0x' + data.substring(0, 64));

        for (let i = 64, len = data.length; i < len;) {
          const solutionHash = '0x' + data.substring(i, i += 64).padEnd(64, '0');

          if (solutionHash === UINT_ZERO || solutionHash === UINT_MAX) {
            continue;
          }
          await delegate.onSolution(blockNum, solutionHash, evt);
          blockNum++;
        }
      };
    this.eventHandlers[TOPIC_ROLLUP_UPGRADE] =
      async (evt, delegate) => {
        const address = `0x${evt.data.substring(26, 66)}`;

        await delegate.onRollupUpgrade(address, evt);
      };
  }

  log (...args) {
    timeLog('RootBridge', ...args);
  }

  async init () {
    // construct it once
    this.fetchJson = await createFetchJson(this.rootRpcUrl);
  }

  async abiCall (data) {
    const res = await this.fetchJson('eth_call',
      [
        {
          to: this.protocolAddress,
          data,
        },
        'latest',
      ]
    );

    return res;
  }

  async getStorage (key) {
    return await this.fetchJson('eth_getStorageAt',
      [
        this.protocolAddress,
        key,
        'latest',
      ]
    );
  }

  async INSPECTION_PERIOD () {
    const res = await this.abiCall(FUNC_SIG_INSPECTION_PERIOD);

    return Number(res);
  }

  async INSPECTION_PERIOD_MULTIPLIER () {
    const res = await this.abiCall(FUNC_SIG_INSPECTION_PERIOD_MULTIPLIER);

    return Number(res);
  }

  async MAX_BLOCK_SIZE () {
    const res = await this.abiCall(FUNC_SIG_MAX_BLOCK_SIZE);

    return Number(res);
  }

  async stateRoot () {
    let res = '0x';

    try {
      res = await this.getStorage(STATE_ROOT_STORAGE_KEY);
    } catch (e) {
      this.log('stateRoot', e);
    }

    if (res === '0x') {
      return false;
    }

    return res;
  }

  async canFinalizeBlock (blockNumber) {
    const res = await this.abiCall(`0x5b11ae01${blockNumber.toString(16).replace('0x', '').padStart(64, '0')}`);

    return !!Number(res);
  }

  async isDisputed (blockNumber) {
    const res = await this.abiCall(`${FUNC_SIG_BLOCK_META}${blockNumber.toString(16).replace('0x', '').padStart(64, '0')}`);

    // if the lsb is 1, then the solution was disputed
    return !!(BigInt(res) & BIG_ONE);
  }

  async createdAtBlock () {
    const res = await this.getStorage('0x319a610c8254af7ecb1f669fb64fa36285b80cad26faf7087184ce1dceb114df');

    return Number(res);
  }

  async finalizedHeight () {
    const res = await this.abiCall(FUNC_SIG_FINALIZED_HEIGHT);

    return BigInt(res);
  }

  async challengeOffset () {
    const res = await this.getStorage(CHALLENGE_OFFSET_KEY);

    return Number(res);
  }

  async fetchRootBlock (blockHash) {
    const res = await this.fetchJson('eth_getBlockByHash',
      [
        blockHash,
        false
      ]
    );

    return res;
  }

  encodeSubmit (data) {
    return {
      to: this.protocolAddress,
      data: FUNC_SIG_SUBMIT_BLOCK + data.replace('0x', ''),
    };
  }

  encodeChallenge ({ blockData, witnesses, rounds }) {
    const payload = blockData.replace('0x', '');
    let data = FUNC_SIG_CHALLENGE +
               (payload.length / 2).toString(16).padStart(64, '0') +
               rounds.toString(16).padStart(64, '0');

    if (witnesses.length) {
      for (const { readWitnessN, readWitness, writeWitnessN, writeWitness } of witnesses) {
        data += packString(
          [
            readWitnessN,
            readWitness,
            writeWitnessN,
            writeWitness,
          ],
          [32, 0, 32, 0]
        );
      }
    } else {
      data += packString([0, 0], [32, 32]);
    }

    return {
      to: this.protocolAddress,
      data: data + payload,
    };
  }

  encodeSolution (blockNumber, solutionHash) {
    return {
      to: this.protocolAddress,
      data: FUNC_SIG_SUBMIT_SOLUTION + blockNumber.toString(16).padStart(64, '0') + solutionHash.replace('0x', ''),
    };
  }

  encodeDispute (blockNumbers) {
    if (!blockNumbers.length) {
      throw new Error(`need at least one blockNumber`);
    }

    let blockN = blockNumbers[0];
    let mask = BIG_ZERO;

    for (const blockNumber of blockNumbers) {
      const i = blockNumber - blockN;

      if (i > MAX_SHIFT || i < BIG_ZERO) {
        throw new Error(`distance too large: ${blockN} / ${blockNumber}`);
      }

      mask |= BIG_ONE << i;
    }

    return {
      to: this.protocolAddress,
      data: FUNC_SIG_DISPUTE + blockN.toString(16).padStart(64, '0') + mask.toString(16).padStart(64, '0'),
    };
  }

  encodeFinalize (firstBlockNumber, payloads) {
    let packed = packString([firstBlockNumber], [32]);
    for (const payload of payloads) {
      packed += packString([payload.length  / 2, payload], [32, 0]);
    }
    return {
      to: this.protocolAddress,
      data: FUNC_SIG_FINALIZE + packed,
    };
  }

  async initialSync (delegate) {
    // this is our starting point
    const createdAtBlock = await this.createdAtBlock();
    const latestBlock = Number(await this.fetchJson('eth_blockNumber', []));

    // sync
    this.eventFilter.fromBlock = createdAtBlock;

    const quantityStepping = 100;
    let fetchQuantity = 100;
    for (let i = createdAtBlock; i <= latestBlock;)  {
      let toBlock = i + fetchQuantity;
      if (toBlock > latestBlock) {
        toBlock = latestBlock;
      }
      this.eventFilter.toBlock = toBlock;

      let res;
      try {
        const r = {
          fromBlock: '0x' + this.eventFilter.fromBlock.toString(16),
          toBlock: '0x' + this.eventFilter.toBlock.toString(16),
          address: this.eventFilter.address,
          topics: this.eventFilter.topics,
        };

        this.log(`syncing from: ${this.eventFilter.fromBlock} to: ${this.eventFilter.toBlock}`);
        res = await this.fetchJson('eth_getLogs', [r]);
      } catch (e) {
        this.log(e);

        fetchQuantity -= quantityStepping;
        if (fetchQuantity < 1) {
          fetchQuantity = 1;
        }
        continue;
      }

      const len = res.length;
      for (let i = 0; i < len; i++) {
        await this._dispatchEvent(res[i], delegate);
      }

      i = toBlock + 1;
      this.eventFilter.fromBlock = i;
      fetchQuantity += quantityStepping;
    }

    this.ready = true;
    this.log('synced');
  }

  async _dispatchEvent (evt, delegate) {
    const topic = evt.topics[0];

    if (this.eventHandlers.hasOwnProperty(topic)) {
      await this.eventHandlers[topic](evt, delegate);
    }
  }

  async fetchEvents (delegate) {
    const latestBlock = Number(await this.fetchJson('eth_blockNumber', []));

    if (Date.now() % 1000 === 0) {
      this.log(`latestBlock: ${latestBlock} fetch if >= ${this.eventFilter.fromBlock}`);
    }

    if (latestBlock >= this.eventFilter.fromBlock) {
      this.eventFilter.toBlock = latestBlock;

      // the event filter
      const r = {
        fromBlock: '0x' + this.eventFilter.fromBlock.toString(16),
        toBlock: '0x' + this.eventFilter.toBlock.toString(16),
        address: this.eventFilter.address,
        topics: this.eventFilter.topics,
      };
      // fetch
      const events = await this.fetchJson('eth_getLogs', [r]);

      if (events.length) {
        this.log(`${events.length} new events`);
      }

      // save new height
      this.eventFilter.fromBlock = latestBlock + 1;
      // append to the event queue
      this.eventQueue = this.eventQueue.concat(events);
    }

    // now drain the eventQueue
    {
      const queue = this.eventQueue;
      let i = 0;
      for (const len = queue.length; i < len; i++) {
        try {
          await this._dispatchEvent(queue[i], delegate);
        } catch (e) {
          this.log(e);
          // break on error
          break;
        }
      }
      // remove the elements that succeeded
      this.eventQueue = queue.slice(i);
    }

    // everything that accumulates after an error in `this.eventQueue`
    // will be processed next time this function gets called
  }
}
