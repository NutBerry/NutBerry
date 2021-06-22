import { formatObject } from '../../common/utils.js';

const ZERO_LOGS_BLOOM = `0x${''.padStart(512, '0')}`;
const ZERO_NONCE = '0x0000000000000000';
const ZERO_HASH = `0x${''.padStart(64, '0')}`;
const MAX_HASH = `0x${''.padStart(64, 'f')}`;
const BIG_ZERO = BigInt(0);

const BLOCK_ZERO = {
  hash: MAX_HASH,
  parentHash: MAX_HASH,
  sha3Uncles: ZERO_HASH,
  stateRoot: ZERO_HASH,
  transactionsRoot: ZERO_HASH,
  receiptsRoot: ZERO_HASH,
  number: '0x0',
  timestamp: '0x0',
  nonce: ZERO_NONCE,
  difficulty: '0x0',
  gasLimit: '0x0',
  gasUsed: '0x0',
  miner: '0x0000000000000000000000000000000000000000',
  extraData: '0x',
  transactions: [],
  uncles: [],
};

function toQuantity (val) {
  return `0x${val.toString(16)}`;
}

function formatTransaction (tx, txIndex, block) {
  const transactionIndex = `0x${txIndex.toString(16)}`;
  const blockHash = block.hash || ZERO_HASH;
  const blockNumber = `0x${block.number.toString(16)}`;

  // Typed data transaction
  if (tx.primaryType) {
    return {
      transactionIndex,
      blockHash,
      blockNumber,
      primaryType: tx.primaryType,
      message: formatObject(tx.message),
      from: tx.from,
      to: tx.to,
      r: tx.r,
      s: tx.s,
      v: tx.v,
      nonce: '0x' + tx.nonce.toString(16),
      hash: tx.hash,
      gasPrice: '0x0',
      gas: '0x0',
      value: '0x0',
    };
  }

  return {
    transactionIndex,
    blockHash,
    blockNumber,
    from: tx.from,
    r: tx.r,
    s: tx.s,
    v: tx.v,
    to: tx.to,
    input: tx.data,
    nonce: '0x' + tx.nonce.toString(16),
    hash: tx.hash,
    gasPrice: '0x0',
    gas: '0x0',
    value: '0x0',
  };
}

function blockRequest (block, withTxData) {
  if (!block) {
    throw new Error('Requested Block not found');
  }

  const transactions = [];

  for (let txIndex = 0, len = block.transactions.length; txIndex < len; txIndex++) {
    const tx = block.transactions[txIndex];

    if (withTxData) {
      transactions.push(formatTransaction(tx, txIndex, block));
    } else {
      transactions.push(tx.hash);
    }
  }

  return {
    hash: block.hash || ZERO_HASH,
    parentHash: block.prevBlock ? block.prevBlock.hash : ZERO_HASH,
    sha3Uncles: ZERO_HASH,
    stateRoot: ZERO_HASH,
    transactionsRoot: ZERO_HASH,
    receiptsRoot: ZERO_HASH,
    number: `0x${block.number.toString(16)}`,
    timestamp: `0x${block.timestamp.toString(16)}`,
    // TODO: implement block nonce
    nonce: ZERO_NONCE,
    difficulty: '0x0',
    gasLimit: '0x0',
    gasUsed: '0x0',
    miner: '0x0000000000000000000000000000000000000000',
    extraData: '0x',
    transactions,
    uncles: [],
  };
}

export default class Methods {
  static 'debug_submitBlock' (obj, bridge) {
    return bridge.submitBlock();
  }

  static 'debug_submitSolution' (obj, bridge) {
    return bridge.submitSolution([BigInt(obj.params[0])]);
  }

  static 'debug_finalizeSolution' (obj, bridge) {
    return bridge.finalizeSolution(BigInt(obj.params[0]));
  }

  static 'debug_directReplay' (obj, bridge) {
    return bridge.directReplay(BigInt(obj.params[0]));
  }

  static 'debug_kill' () {
    setTimeout(function () {
      process.exit(1);
    }, 10);

    return true;
  }

  static 'debug_haltEvents' (obj, bridge) {
    bridge._debugHaltEvents = obj.params[0] ? true : false;
    return bridge._debugHaltEvents;
  }

  static 'debug_forwardChain' (obj, bridge) {
    return bridge.forwardChain();
  }

  static async 'debug_storage' (obj, bridge) {
    const bbt = bridge.pendingBlock.bbt;
    const other = new bridge.pendingBlock.bbt.constructor();
    const storage = bridge.pendingBlock.inventory.storage;

    for (const k in storage) {
      other.add(BigInt(k), BigInt(storage[k]));
    }

    if (other.root.hash !== bbt.root.hash) {
      throw new Error('stateRoot mismatch on client');
    }

    const stateRootBridge = BigInt(await bridge.rootBridge.stateRoot());
    if (stateRootBridge !== bbt.root.hash) {
      throw new Error('stateRoot mismatch on contract');
    }

    return storage;
  }

  static 'web3_clientVersion' (obj, bridge) {
    return bridge.rootBridge.protocolAddress;
  }

  static 'net_version' (obj, bridge) {
    return bridge.CHAIN_ID.toString();
  }

  static 'eth_chainId' (obj, bridge) {
    return `0x${bridge.CHAIN_ID.toString(16)}`;
  }

  static 'eth_gasPrice' (obj) {
    // always zero, Hooray 🎉
    return '0x0';
  }

  static async 'eth_syncing' (obj, bridge) {
    const rootBridge = bridge.rootBridge;

    //if (rootBridge.ready) {
    //  return false;
    //}

    if (!this._syncStatus) {
      this._syncStatus = {
        startingBlock: toQuantity(await rootBridge.createdAtBlock()),
        currentBlock: toQuantity(rootBridge.eventFilter.fromBlock - 1),
        highestBlock: toQuantity(rootBridge.eventFilter.toBlock),
      };
      setTimeout(() => this._syncStatus = null, 1000);
    }

    return this._syncStatus;
  }

  static async 'eth_blockNumber' (obj, bridge) {
    return `0x${bridge.pendingBlock.number.toString(16)}`;
  }

  static async 'eth_getBlockByNumber' (obj, bridge) {
    let maybeNumber = obj.params[0];
    if (maybeNumber === 'latest' || maybeNumber === 'pending') {
      maybeNumber = bridge.pendingBlock.number;
    }

    const num = BigInt(maybeNumber);

    // special case
    if (num === BIG_ZERO) {
      return BLOCK_ZERO;
    }

    const withTxData = obj.params[1] ? true : false;
    const block = await bridge.getBlockByNumber(num, true);

    return blockRequest(block, withTxData);
  }

  static async 'eth_getBlockByHash' (obj, bridge) {
    const withTxData = obj.params[1] ? true : false;
    const block = await bridge.getBlockByHash(obj.params[0], true);

    return blockRequest(block, withTxData);
  }

  static async 'eth_getBalance' (obj) {
    // always zero
    return '0x0';
  }

  static async 'eth_getTransactionCount' (obj, bridge) {
    // TODO: pending, latest
    // currently returns pending-nonce
    const nonce = await bridge.getNonce(obj.params[0]);
    return `0x${nonce.toString(16)}`;
  }

  static async 'eth_estimateGas' (obj) {
    // always zero
    return '0x0';
  }

  static async 'eth_getTransactionReceipt' (obj, bridge) {
    const txHash = obj.params[0];
    const { block, tx, txIndex } = bridge.getBlockOfTransaction(txHash);

    if (!tx) {
      throw new Error('Transaction not found');
    }

    const transactionIndex = `0x${txIndex.toString(16)}`;
    const blockHash = block.hash || ZERO_HASH;
    const blockNumber = `0x${block.number.toString(16)}`;
    const logs = [];

    if (tx.logs) {
      const logLen = tx.logs.length;

      for (let i = 0; i < logLen; i++) {
        const logIndex = `0x${i.toString(16)}`;
        const log = tx.logs[i];
        const obj = {
          transactionLogIndex: logIndex,
          transactionIndex,
          blockNumber,
          transactionHash: tx.hash,
          address: log.address,
          topics: log.topics,
          data: log.data,
          logIndex,
          blockHash,
        };
        logs.push(obj);
      }
    }

    // TODO: proper receipts
    return {
      transactionHash: tx.hash,
      transactionIndex,
      blockHash,
      blockNumber,
      from: tx.from,
      to: tx.to,
      status: tx.status,
      logs: logs,
      contractAddress: null,
      logsBloom: ZERO_LOGS_BLOOM,
      cumulativeGasUsed: '0x0',
      gasUsed: '0x0',
    };
  }

  static async 'eth_getTransactionDetails' (obj, bridge) {
    const txHash = obj.params[0];
    const { block, tx, txIndex } = bridge.getBlockOfTransaction(txHash);

    if (!tx) {
      throw new Error('Transaction not found');
    }

    return {
      errno: `0x${tx.errno.toString(16)}`,
      returnData: tx.returnData,
    };
  }

  static async 'eth_getTransactionByHash' (obj, bridge) {
    const txHash = obj.params[0];
    const { block, tx, txIndex } = bridge.getBlockOfTransaction(txHash);

    if (!tx) {
      throw new Error('Transaction not found');
    }

    return formatTransaction(tx, txIndex, block);
  }

  static async 'eth_call' (obj, bridge) {
    const block = obj.params[1];
    // from, to, data, gas, gasPrice, value
    const tx = obj.params[0];
    return bridge.runCall(tx);
  }

  static async 'eth_getCode' (obj, bridge) {
    return bridge.getCode(obj.params[0], obj.params[1]);
  }

  static async 'eth_sendRawTransaction' (obj, bridge) {
    const data = obj.params[0];
    return bridge.runTx({ data });
  }

  static async 'eth_getLogs' (obj, bridge) {
    // TODO
    // Support
    // - blockhash filter
    // - nested topic queries
    // - pending, earliest ..
    // - correct log indices
    const eventFilter = obj.params[0];
    const filterAddress = eventFilter.address ? eventFilter.address.toLowerCase() : null;
    const filterAddressFrom = eventFilter.from ? eventFilter.from.toLowerCase() : null;
    const filterTopics = eventFilter.topics || [];
    const filterMessageTypes = eventFilter.primaryTypes || [];
    const maxResults = eventFilter.maxResults | 0;
    const res = [];

    if (!(filterTopics.length || filterMessageTypes.length)) {
      return res;
    }

    const stop = BigInt(eventFilter.toBlock || bridge.pendingBlock.number);
    const start = BigInt(eventFilter.fromBlock || bridge.pendingBlock.number);
    const reverse = stop < start;

    for (let i = BIG_ZERO, len = reverse ? start - stop : stop - start; i <= len; i++) {
      const block = await bridge.getBlockByNumber(reverse ? start - i : start + i, true);

      if (!block) {
        break;
      }

      const blockHash = block.hash || ZERO_HASH;
      const blockNumber = `0x${block.number.toString(16)}`;
      const txsLength = block.transactions.length;

      for (let x = 0; x < txsLength; x++) {
        const txIndex = reverse ? txsLength - (x + 1) : x;
        const tx = block.transactions[txIndex];

        if (tx.status !== '0x1') {
          continue;
        }

        if (filterAddress && tx.to !== filterAddress) {
          continue;
        }

        if (filterAddressFrom && tx.from !== filterAddressFrom) {
          continue;
        }

        if (tx.primaryType && filterMessageTypes.indexOf(tx.primaryType) !== -1) {
          if (res.push(formatTransaction(tx, txIndex, block)) === maxResults) {
            return res;
          }
          continue;
        }

        if (filterTopics.length === 0) {
          continue;
        }

        const transactionIndex = `0x${txIndex.toString(16)}`;
        const logsLength = tx.logs.length;
        for (let y = 0; y < logsLength; y++) {
          const logIndex = reverse ? logsLength - (y + 1) : y;
          const log = tx.logs[logIndex];
          const filterTopicsLength = filterTopics.length;
          let skip = false;

          for (let t = 0; t < filterTopicsLength; t++) {
            const q = filterTopics[t];
            if (!q) {
              continue;
            }
            if (log.topics[t] !== q) {
              skip = true;
              break;
            }
          }
          if (skip) {
            continue;
          }

          const idx = `0x${logIndex.toString(16)}`;
          const obj = {
            transactionLogIndex: idx,
            transactionIndex,
            blockNumber,
            transactionHash: tx.hash,
            address: log.address,
            topics: log.topics,
            data: log.data,
            logIndex: idx,
            blockHash,
          };

          if (res.push(obj) === maxResults) {
            return res;
          }
        }
      }
    }

    return res;
  }

  // TODO
  // eth_getStorageAt
}
