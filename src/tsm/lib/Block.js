import { arrayify, packString, toHexPrefix } from '../../common/conversion.js';
import { timeLog, keccak256HexPrefix, maybeDecodeError } from '../../common/utils.js';

const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

function slicePadEnd (buf, start, end) {
  const ret = buf.slice(start, end)
  const padding = (end - start) - ret.length;

  if (padding !== 0) {
    return buf.concat(new Array(padding).fill(0));
  }

  return ret;
}

// TODO
// This needs to be rebased
export default class Block {
  decodeTransactionLength (buf, offset, bridge) {
    return 1;
  }

  encodeTx (tx, bridge) {
    return '0xff';
  }

  decodeTx (rawStringOrArray, bridge) {
    return { from: ADDRESS_ZERO, to: ADDRESS_ZERO, hash: ZERO_HASH, nonce: BIG_ZERO };
  }

  async executeTx (tx, bridge, dry) {
    return { errno: 0, returnValue: '0x', logs: [] };
  }

  toRaw (bridge) {
    if (this._raw) {
      return this._raw;
    }

    let ret = '0x' + packString([this.number, this.blockType, this.timestamp], [32, 32, 32]);

    for (const tx of this.transactions) {
      ret += this.encodeTx(tx, bridge).replace('0x', '');
    }

    return ret;
  }

  async fromBeacon (data, rootBlock, bridge) {
    this.blockType = 2;
    this._raw = '0x' + packString([this.number, this.blockType, Number(rootBlock.timestamp), data], [32, 32, 32, 0]);
    this.hash = keccak256HexPrefix(this._raw);
    this.timestamp = Number(rootBlock.timestamp);

    this.log(`new Block ${this.number}/${this.hash}`);

    const buf = arrayify(this._raw);
    const bufLength = buf.length;
    // skip block header
    let offset = 96;

    while (offset < bufLength) {
      try {
        const txLen = this.decodeTransactionLength(buf, offset, bridge);
        const txOffset = offset;
        const rawTx = buf.slice(offset, offset += txLen);

        try {
          this.txOffsets[txOffset] = await this.addTransaction(rawTx, bridge, true);
        } catch (e) {
          this.log('informative', e);
        }
      } catch (e) {
        this.log('TODO - proper tx parsing', e);
      }
    }

    this.log('Done');
  }

  async fromCustomBeacon (data, rootBlock, bridge) {
    this.blockType = 3;
    this._raw = '0x' + packString([this.number, this.blockType, Number(rootBlock.timestamp), data], [32, 32, 32, 0]);
    this.hash = keccak256HexPrefix(this._raw);
    this.timestamp = Number(rootBlock.timestamp);

    this.log(`new Custom-Block ${this.number}/${this.hash}`);

    try {
      // block header
      const txOffset = 96;
      this.txOffsets[txOffset] = await this.addCustomMessage('0x' + data, bridge);
    } catch (e) {
      this.log('fromCustomBeacon', e);
    }
  }

  async onDeposit (data, rootBlock, bridge) {
    this.blockType = 1;
    this.timestamp = Number(rootBlock.timestamp);
    this.isDepositBlock = true;

    this._raw = '0x' + packString([this.number, this.blockType, this.timestamp, data], [32, 32, 32, 0]);
    this.hash = keccak256HexPrefix(this._raw);

    this.log(`new Deposit-Block ${this.number}/${this.hash}`);

    const buf = arrayify(this._raw);
    const bufLength = buf.length;
    // skip block header
    let offset = 96;
    while (offset < bufLength) {
      try {
        const txOffset = offset;
        const owner = toHexPrefix(slicePadEnd(buf, offset, offset += 20));
        const token = toHexPrefix(slicePadEnd(buf, offset, offset += 20));
        const value = toHexPrefix(slicePadEnd(buf, offset, offset += 32));
        const tokenType = toHexPrefix(slicePadEnd(buf, offset, offset += 32));

        this.txOffsets[txOffset] = await this.addDeposit({ owner, token, value, tokenType }, bridge);
      } catch (e) {
        this.log('onDeposit', e);
      }
    }

    this.log('Done');
  }

  constructor (prevBlock) {
    // previous block - if applicable
    this.prevBlock = prevBlock;
    // the blockHash - non-zero if this block was submitted to the Bridge.
    this.hash = ZERO_HASH;
    // the blockNumber
    this.number = prevBlock ? prevBlock.number + BIG_ONE : BIG_ONE;
    // the timestamp (from the L1 block)
    this.timestamp = prevBlock ? prevBlock.timestamp : 0;
    // address > nonce mapping
    this.nonces = {};
    // ordered list of transactions in this Block
    this.transactions = [];
    this.isDepositBlock = false;
    this.submissionDeadline = 0;
    this.txOffsets = {};
    this.blockType = 0;

    this._barrier = null;

    if (prevBlock) {
      // copy nonces since `prevBlock`
      this.nonces = Object.assign({}, prevBlock.nonces);
    }
  }

  calculateSize () {
    let ret = 0;

    for (const tx of this.transactions) {
      const size = tx.size || ((this.encodeTx(tx).length - 2) / 2);

      ret += size;
    }

    return ret;
  }

  async addDeposit (obj, bridge) {
    // borrow the transactions field for a deposit (we only have one deposit per block atm)
    // transactionHash = blockHash

    this.log('addDeposit', obj);
    const tx = {
      hash: this.hash,
      from: obj.owner,
      to: obj.token,
      data: obj.value,
      nonce: BIG_ZERO,
      status: '0x1',
      errno: 0,
      logs: [],
      returnData: '0x',
      size: 104,
    };
    this.transactions.push(tx);

    return tx;
  }

  async addCustomMessage (data, bridge) {
    const tx = {
      hash: this.hash,
      from: ADDRESS_ZERO,
      to: ADDRESS_ZERO,
      data: data,
      nonce: BIG_ZERO,
      status: '0x1',
      errno: 0,
      logs: [],
      returnData: '0x',
      // 0x...
      size: (data.length / 2) - 1,
    };
    this.transactions.push(tx);

    return tx;
  }

  log (...args) {
    timeLog(`${this.isDepositBlock ? 'DepositBlock' : 'Block'}(${this.number})`, ...args);
  }

  freeze () {
  }

  prune () {
    this._raw = null;
    this.nonces = {};
  }

  async rebase (block, bridge) {
    this.log(`Rebase:Started ${block.transactions.length} transactions`);

    for (const tx of block.transactions) {
      if (this.prevBlock) {
        let duplicate = false;

        for (const _tx of this.prevBlock.transactions) {
          if (_tx.hash === tx.hash) {
            duplicate = true;
            break;
          }
        }

        if (duplicate) {
          this.log('Rebase:Dropping tx', tx.hash);
          continue;
        }
      }

      this.log('Rebase:Adding tx', tx.hash);
      try {
        await this.addDecodedTransaction(tx, bridge);
      } catch (e) {
        this.log(e);
      }
    }

    this.log(`Rebase:Complete ${this.transactions.length} transactions left`);
  }

  async addTransaction (rawStringOrArray, bridge, fromBeacon) {
    if (this._barrier) {
      try {
        this.log('active barrier');
        await this._barrier;
      } catch (e) {
        // ignore
      }
    }

    try {
      this._barrier = new Promise(
        async (resolve, reject) => {
          try {
            const tx = this.decodeTx(rawStringOrArray, bridge);
            resolve(await this.addDecodedTransaction(tx, bridge, fromBeacon));
          } catch (e) {
            reject(e);
          }
        }
      );
      const ret = await this._barrier;
      this._barrier = null;
      return ret;
    } catch (e) {
      this._barrier = null;
      throw e;
    }
  }

  async addDecodedTransaction (tx, bridge, fromBeacon) {
    if (this.validateTransaction(tx)) {
      const { errno, returnValue, logs } = await this.executeTx(tx, bridge);

      this.log(`${tx.from}:${tx.nonce}:${tx.hash}`);

      // TODO
      // check modified storage keys, take MAX_SOLUTION_SIZE into account
      if (errno !== 0) {
        this.log(`invalid tx errno:${errno}`);

        if (!fromBeacon) {
          // if this transaction is not already included in a block, then throw
          const errMsg = maybeDecodeError(returnValue);
          if (errMsg) {
            throw new Error(errMsg);
          } else {
            throw new Error(`transaction evm errno: ${errno}`);
          }
        }
      }

      tx.logs = logs || [];
      tx.status = errno === 0 ? '0x1' : '0x0';
      tx.errno = errno;
      tx.returnData = returnValue;

      this.nonces[tx.from] = tx.nonce + BIG_ONE;

      if (bridge.alwaysKeepRevertedTransactions || errno === 0 || fromBeacon) {
        // 'save' the transaction
        this.transactions.push(tx);
      }

      return tx;
    }

    this.log('invalid or duplicate tx', tx.hash);

    return null;
  }

  validateTransaction (tx) {
    return true;
  }

  async dryExecuteTx (tx, bridge) {
    const { errno, returnValue } = await this.executeTx(tx, bridge, true);

    if (errno !== 0) {
      const errMsg = maybeDecodeError(returnValue);
      if (errMsg) {
        throw new Error(errMsg);
      } else {
        throw new Error(`evm errno: ${errno}`);
      }
    }
    return returnValue || '0x';
  }

  async submitBlock (bridge) {
    const transactions = [];
    const tmp = [];

    // TODO
    // this also has to take MAX_SOLUTION_SIZE into account
    let payloadLength = 0;
    for (const tx of this.transactions) {
      if (tx.submitted) {
        this.log(`Already marked as submitted: ${tx.from}:${tx.nonce}`);
        continue;
      }
      if (tx.errno !== 0) {
        this.log(`Skipping due to transaction errno:${tx.errno} from:${tx.from} nonce:${tx.nonce}`);
        continue;
      }

      this.log('Preparing ' + tx.from + ':' + tx.nonce + ':' + tx.hash);

      const encoded = this.encodeTx(tx, bridge).replace('0x', '');
      const byteLength = encoded.length / 2;

      if (payloadLength + byteLength > bridge.MAX_BLOCK_SIZE) {
        this.log('reached MAX_BLOCK_SIZE');
        break;
      }

      payloadLength += byteLength;

      transactions.push(encoded);
      // mark it as submitted
      // if we get any errors in submitBlock, we unmark all again
      tmp.push(tx);
      tx.submitted = true;
    }

    if (transactions.length === 0) {
      this.log('Nothing to submit');
      return;
    }

    const rawData = transactions.join('');
    const txData = bridge.rootBridge.encodeSubmit(rawData);
    const n = this.number;

    let tx;
    try {
      // post data
      tx = await bridge.wrapSendTransaction(txData);
    } catch (e) {
      this.log(e);
      // TODO: check if we really failed to submit the block

      // unmark all transactions
      for (const v of tmp) {
        v.submitted = false;
      }
    }

    this.log('Block.submitBlock.postData', Number(tx.gasUsed));
    this.log(
      {
        total: this.transactions.length,
        submitted: transactions.length,
      }
    );

    // TODO: blockHash/number might not be the same if additional blocks are submitted in the meantime
    return n;
  }

  /// @dev Computes the solution for this Block.
  async computeSolution (bridge) {
    // first 32 bytes are the (unused) stateRoot
    const payload = ''.padStart(64, '0');

    if ((payload.length / 2) > bridge.MAX_SOLUTION_SIZE) {
      throw new Error(`Reached MAX_SOLUTION_SIZE: ${payload.length / 2} bytes`);
    }

    const solution = {
      payload,
      hash: keccak256HexPrefix(payload),
    };

    return solution;
  }

  async computeChallenge (challengeOffset, bridge) {
    const blockData = this.toRaw(bridge);

    return { blockData, witnesses: [], rounds: 1 };
  }
}
