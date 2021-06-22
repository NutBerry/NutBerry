import Inventory from './Inventory.js';
import { Block as TsmBlock } from '../../tsm/lib/index.js';
import { arrayify, bufToHex } from '../../common/conversion.js';
import V1Runtime from './V1Runtime.js';
import Keccak256 from '../../common/Keccak256.js';
import BalancedBinaryTree from '../../bbt/BalancedBinaryTree.js';
import { keccak256HexPrefix } from '../../common/utils.js';
import TransactionBuilder from './TransactionBuilder.js';

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const BIG_ZERO = BigInt(0);
// _InternalReflectStorage(uint256, uin256)
const INTERNAL_EVENT_SET_STORAGE = '0x0000000000000000000000000000000000000000000000000000000000000001';
// ..
const INTERNAL_EVENT_SET_STORAGE_DELTA = '0x0000000000000000000000000000000000000000000000000000000000000002';
const INTERNAL_EVENT_DEADLINE_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000003';

const INTERNAL_TYPED_DATA = {
  types: {
    EIP712Domain: [
      { name: 'version', type: 'string' },
    ],
    Deposit: [
      { name: 'owner', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'tokenType', type: 'uint256' },
    ],
    CustomBlockBeacon: [
      { name: 'data', type: 'bytes' },
    ],
  },
  domain: {
    version: '1',
  },
  primaryTypes: ['Deposit', 'CustomBlockBeacon'],
};

const INTERNAL_TX_BUILDER = new TransactionBuilder(INTERNAL_TYPED_DATA, true);

export default class Block extends TsmBlock {
  decodeTransactionLength (buf, offset, bridge) {
    return bridge.transactionBuilder.decodeLength(buf, offset);
  }

  encodeTx (tx, bridge) {
    const encoded = bridge.transactionBuilder.encode(tx);

    return bufToHex(encoded, 0, encoded.length);
  }

  decodeTx (rawStringOrArray, bridge) {
    const bytes = arrayify(rawStringOrArray);
    const tx = bridge.transactionBuilder.decode(bytes);

    tx.to = bridge.rootBridge.protocolAddress;
    tx.nonce = this.nonces[tx.from] || BIG_ZERO;

    return tx;
  }

  async addDeposit (obj, bridge) {
    const tx = await super.addDeposit(obj);
    tx.primaryType = 'Deposit';
    tx.message = {
      owner: obj.owner,
      token: obj.token,
      value: obj.value,
      tokenType: obj.tokenType,
    };

    const { errno, returnValue, logs } = await this.executeTx(tx, bridge, false, true);
    tx.logs = logs || [];
    tx.status = errno === 0 ? '0x1' : '0x0';
    tx.errno = errno;
    tx.returnData = returnValue;

    if (errno !== 0) {
      this.log(`Deposit error ${errno}`);
    }

    return tx;
  }

  async addCustomMessage (data, bridge) {
    const tx = await super.addCustomMessage(data, bridge);
    tx.primaryType = 'CustomBlockBeacon';
    tx.message = {
      data,
    };

    const { errno, returnValue, logs } = await this.executeTx(tx, bridge, false, true);
    tx.logs = logs || [];
    tx.status = errno === 0 ? '0x1' : '0x0';
    tx.errno = errno;
    tx.returnData = returnValue;

    if (errno !== 0) {
      this.log(`CustomMessage error ${errno}`);
    }

    return tx;
  }

  constructor (prevBlock) {
    super(prevBlock);

    // the token inventory
    // TODO move Inventory to a proper commit-log state manager
    this.inventory = prevBlock && prevBlock.inventory ? prevBlock.inventory.clone() : new Inventory();
    this.reflectedStorage = {};
    this.reflectedStorageDelta = {};

    if (this.inventory) {
      // clear any temp values
      this.inventory.clearCache();
    }
  }

  freeze () {
    super.freeze();

    // TODO
    // freeze other stuff too
    if (this.inventory) {
      this.inventory.freeze();
    }
  }

  prune () {
    super.prune();

    this.inventory = null;
    this.reflectedStorage = {};
    this.reflectedStorageDelta = {};
    // todo - uncomment once stateRoots are saved separately
    //for (const tx of this.transactions) {
    //  tx.witness = undefined;
    //}
    // clear this.raw?
  }

  async executeTx (tx, bridge, dry, internal) {
    // copy the environment
    const customEnvironment = this.inventory.clone();
    let data;

    if (internal) {
      data = INTERNAL_TX_BUILDER.encodeCall(tx);
    } else if (!dry || (tx.message && tx.primaryType)) {
      data = bridge.transactionBuilder.encodeCall(tx);
    } else {
      // assume eth_call
      data = arrayify(tx.data || '0x');
    }

    const address = bridge.rootBridge.protocolAddress.replace('0x', '');
    const caller = address;
    const code = arrayify(await bridge.getCode(bridge.implementationAddress));
    const runtime = new V1Runtime();
    const isPending = this.hash === ZERO_HASH;

    if (isPending) {
      // use Date.now if this is a pending block
      runtime.timestamp = BigInt(~~(Date.now() / 1000));
    } else {
      // else we use the timestamp of the submitted block
      runtime.timestamp = BigInt(this.timestamp);
    }

    customEnvironment.clearCache();

    // the maximum allowed steps the call can make; this is merely to avoid infinite execution
    // TODO: estimate gas for the call on the root-chain
    runtime.stepCount = 0x1fffff;
    const state = await runtime.run({ address, caller, code, data, customEnvironment, bridge });

    if (!dry) {
      // always store witnesses
      const { reads, writes } = customEnvironment;
      tx.witness = { reads, writes };
    }

    const logs = [];

    // no errors and not in dry-mode = use new state
    if (state.errno === 0 && !dry) {
      this.inventory = customEnvironment;

      // check if the contract emitted internal events
      for (const log of state.logs) {
        // skip events with zero topics
        if (log.topics.length === 0) {
          logs.push(log);
          continue;
        }

        const topic = log.topics[0];

        if (topic === INTERNAL_EVENT_SET_STORAGE) {
          const k = log.topics[1];
          const v = log.topics[2];

          this.reflectedStorage[k] = v;
          continue;
        }

        if (topic === INTERNAL_EVENT_SET_STORAGE_DELTA) {
          const k = log.topics[1];
          const newValue = BigInt(log.topics[2]);
          const oldValue = BigInt(this.reflectedStorageDelta[k] || '');

          this.reflectedStorageDelta[k] = '0x' + BigInt.asUintN(256, oldValue + newValue).toString(16).padStart(64, '0');
          continue;
        }

        if (topic === INTERNAL_EVENT_DEADLINE_TOPIC) {
          // this event doesn't matter if this block is already submitted
          if (isPending) {
            const time = Number(log.topics[1]);

            if (this.submissionDeadline === 0 || time < this.submissionDeadline) {
              this.submissionDeadline = time;

              this.log(`found deadline event: ${time}`);
            }
          }

          continue;
        }

        // no match
        logs.push(log);
      }
    }

    let returnValue = '0x';
    for (const v of state.returnValue) {
      returnValue += (v | 0).toString(16).padStart(2, '0');
    }

    return {
      errno: state.errno,
      returnValue,
      logs,
    };
  }

  get bbt () {
    const bbt = this.prevBlock ? this.prevBlock.bbt.clone() : new BalancedBinaryTree();
    let writes = {};
    for (const tx of this.transactions) {
      if (tx.witness) {
        writes = Object.assign(writes, tx.witness.writes);
      }
    }
    for (const k in writes) {
      const storageValue = writes[k];
      bbt.add(BigInt(k), BigInt(storageValue));
    }

    return bbt;
  }

  /// @dev Computes the solution for this Block.
  async computeSolution (bridge) {
    const STATE_ROOT_STORAGE_KEY = 'd27f023774f5a743d69cfc4b80b1efe4be7912753677c20f45ee5464160b7d24';
    const stateRoot = this.bbt.root.hash.toString(16).padStart(64, '0');
    let payload = '00' + STATE_ROOT_STORAGE_KEY + stateRoot;

    for (const k in this.reflectedStorage) {
      const val = this.reflectedStorage[k];
      // first byte = 0x00
      payload += `${k.replace('0x', '00')}${val.replace('0x', '')}`;
    }

    for (const k in this.reflectedStorageDelta) {
      const val = this.reflectedStorageDelta[k];
      // first byte = 0x01
      payload += `${k.replace('0x', '01')}${val.replace('0x', '')}`;
    }

    if ((payload.length / 2) > bridge.MAX_SOLUTION_SIZE) {
      throw new Error('Reached MAX_SOLUTION_SIZE');
    }

    const solution = {
      stateRoot,
      payload,
      hash: keccak256HexPrefix(payload),
    };

    this.log(`Solution: ${solution.hash}`);

    return solution;
  }

  async computeChallenge (challengeOffset, bridge) {
    const blockData = this.toRaw(bridge);
    const witnesses = [];

    let offset = challengeOffset || 96;
    let nextTx = this.txOffsets[offset];

    if (nextTx) {
      const bbt = this.prevBlock ? this.prevBlock.bbt.clone() : new BalancedBinaryTree();
      const txIndex = this.transactions.indexOf(nextTx);

      // construct the tree up to txIndex
      for (let i = 0; i < txIndex; i++) {
        const witness = this.transactions[i].witness;

        for (const k in witness.writes) {
          const storageValue = witness.writes[k];
          bbt.add(BigInt(k), BigInt(storageValue));
        }
      }

      // compute witnesses starting from txIndex
      for (let i = txIndex, len = this.transactions.length; i < len; i++) {
        const tx = this.transactions[i];
        let readWitnessN = 0;
        let readWitness = '';
        let writeWitnessN = 0;
        let writeWitness = '';

        // storage reads
        for (const k in tx.witness.reads) {
          const proof = bbt.proofUniform(BigInt(k));
          const val = tx.witness.reads[k];

          // < key 32 bytes > < # of proof elements 32 bytes >
          readWitness += k.replace('0x', '') + proof.length.toString(16).padStart(64, '0');

          for (const element of proof) {
            readWitness += element.toString(16).padStart(64, '0');
          }

          readWitnessN++;

        }

        // storage writes
        // first step - gather proofs for all writes
        for (const k in tx.witness.writes) {
          const key = BigInt(k);
          const proof = bbt.proofUniform(key);

          writeWitness += k.replace('0x', '') + proof.length.toString(16).padStart(64, '0');
          for (const element of proof) {
            writeWitness += element.toString(16).padStart(64, '0');
          }

          writeWitnessN++;
          console.log({k, val:tx.witness.writes[k], proof, writeWitnessN, writeWitness});

          // add it to the tree
          bbt.add(key, BigInt(tx.witness.writes[k]))
        }

        witnesses.push({ readWitnessN, readWitness, writeWitnessN, writeWitness });
      }
    } else {
      this.log(`Warning: No transaction at offset:${offset} found`);
    }

    return {
      blockType: this.blockType,
      timestamp: this.timestamp,
      blockData,
      witnesses,
    };
  }
};
