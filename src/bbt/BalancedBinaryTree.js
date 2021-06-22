import Keccak256 from '../common/Keccak256.js';

const keccak = new Keccak256();
const BIG_ZERO = BigInt(0);
const BIG_ONE = BigInt(1);
const HASH_ONE = '01'.padStart(64, '0');

function newEmptyLeaf () {
  return { isBranch: false, hash: BIG_ZERO, key: BIG_ZERO, value: BIG_ZERO };
}

export default class BalancedBinaryTree {
  clone () {
    const clonedTree = new this.constructor();

    Object.assign(clonedTree.root, this.root);

    const todo = [clonedTree.root];
    while (todo.length) {
      const node = todo.pop();
      if (node.left) {
        node.left = Object.assign({}, node.left);
        todo.push(node.left);
      }
      if (node.right) {
        node.right = Object.assign({}, node.right);
        todo.push(node.right);
      }
    }

    return clonedTree;
  }

  hash (left, right, isBranch) {
    if (isBranch) {
      return BigInt(
        '0x' +
        keccak.reset()
        .update(left.toString(16).padStart(64, '0'))
        .update(right.toString(16).padStart(64, '0'))
        .digest()
      );
    }

    return BigInt(
      '0x' +
      keccak.reset()
      .update(left.toString(16).padStart(64, '0'))
      .update(right.toString(16).padStart(64, '0'))
      .update(HASH_ONE)
      .digest()
    );
  }

  constructor () {
    this.root = {
      isBranch: false,
      left: null,
      right: null,
      hash: BIG_ZERO,
      key: BIG_ZERO,
      value: BIG_ZERO,
    };
    this.leaves = {};
  }

  updateNode (node) {
    if (node.isBranch) {
      node.key = BIG_ZERO;
      node.value = BIG_ZERO;
      node.hash = this.hash(
        node.left ? node.left.hash : BIG_ZERO,
        node.right ? node.right.hash : BIG_ZERO,
        true
      );
    }
  }

  add (key, value) {
    const path = [];
    // start with the root
    let node = this.root;
    let bits = BigInt(key);
    let depth = BIG_ZERO;

    while (true) {
      const goLeft = bits & BIG_ONE;

      if (node.isBranch) {
        node = goLeft ? node.left : node.right;
        path.push(node);
        bits = bits >> BIG_ONE;
        depth++;
        continue;
      }

      // fast case
      // (update or free space)
      if (node.value === BIG_ZERO || node.key === key) {
        node.isBranch = false;
        if (value === BIG_ZERO) {
          // delete
          node.value = BIG_ZERO;
          node.key = BIG_ZERO;
          node.hash = BIG_ZERO;
          delete this.leaves[key];
        } else {
          node.value = value;
          node.key = key;
          node.hash = this.hash(key, value);
          this.leaves[key] = node;
        }
        break;
      }

      // at this point, the node is not a branch,
      // neither is it the node for `key`
      // and also not empty

      {
        // move it
        const oldLeaf = { isBranch: false, hash: node.hash, key: node.key, value: node.value };
        if (node.value !== BIG_ZERO) {
          this.leaves[node.key] = oldLeaf;
        } else {
          throw new Error('unexpected');
        }

        const _goLeft = (oldLeaf.key >> depth) & BIG_ONE;

        if (_goLeft) {
          node.left = oldLeaf;
          node.right = newEmptyLeaf(node);
        } else {
          node.right = oldLeaf;
          node.left = newEmptyLeaf(node);
        }

        // node becomes a branch
        node.isBranch = true;
        node.value = BIG_ZERO;
        node.key = BIG_ZERO;

        // resume the journey
        node = goLeft ? node.left : node.right;
        path.push(node);
        bits = bits >> BIG_ONE;
        depth++;
        continue;
      }
    }

    // update all nodes
    for (const node of path.reverse()) {
      this.updateNode(node);
    }
    // update root node
    this.updateNode(this.root);

    return this;
  }

  hasLeaf (key) {
    return this.leaves[key] !== undefined;
  }

  proofUniform (key) {
    const path = [];

    //if (this.root.hash === BIG_ZERO) {
    //  return path;
    //}

    // start with the root
    let node = this.root;
    let bits = BigInt(key);

    while (true) {
      const goLeft = bits & BIG_ONE;

      if (node.isBranch) {
        path.push(goLeft ? node.right.hash : node.left.hash);
        node = goLeft ? node.left : node.right;
        bits = bits >> BIG_ONE;
        continue;
      }

      path.push(node.value);
      path.push(node.key);

      return path.reverse();
    }

    return path;
  }

  // 3 scenarios
  // - insert
  // - update
  // - delete
  calculateUpdate (key, newValue, proofs) {
    const len = proofs.length;
    let ret = BIG_ZERO;
    let _k = BIG_ZERO;
    let _v = BIG_ZERO;

    if (newValue !== BIG_ZERO) {
      // insert or update
      // hash leaf
      ret = this.hash(key, newValue, false);
    }

    if (len) {
      if (len < 2) {
        throw new Error('invalid proof');
      }

      _k = proofs[0];
      _v = proofs[1];

      if (_v !== BIG_ZERO && _k !== key) {
        // Update and create a new branch.
        // Compare against the key of the other leaf and loop until diverge.
        // Then create a new branch(es).

        let depth = BigInt(len - 2);

        while (true) {
          const bitmask = 1n << depth;
          const goLeft = key & bitmask;
          const otherLeft = _k & bitmask;

          if (goLeft === otherLeft) {
            depth++;
            continue;
          }

          const other = this.hash(_k, _v, false);
          if (goLeft) {
            ret = this.hash(ret, other, true);
          } else {
            ret = this.hash(other, ret, true);
          }
          break
        }

        const odepth = BigInt(len - 2);
        while (depth !== odepth) {
          depth--;
          const bitmask = 1n << depth;
          const goLeft = key & bitmask;
          if (goLeft) {
            ret = this.hash(ret, 0, true);
          } else {
            ret = this.hash(0, ret, true);
          }
        }
      }
    }

    let depth = BigInt(len - 2);
    for (let i = 2; i < len;) {
      depth--;
      const bitmask = 1n << depth;
      let goLeft = key & bitmask;

      const next = proofs[i++];

      if (goLeft) {
        ret = this.hash(ret, next, true);
      } else {
        ret = this.hash(next, ret, true);
      }
    }

    return ret;
  }

  verifyUniform (key, proofs) {
    const len = proofs.length;
    let _k = BIG_ZERO;
    let _v = BIG_ZERO;
    let ret = BIG_ZERO;
    let inTree = false;

    if (len) {
      if (len < 2) {
        return { valid: false, inTree: false, value: BIG_ZERO };
      }

      _k = proofs[0];
      _v = proofs[1];

      // leafhash
      if (_v !== BIG_ZERO) {
        ret = this.hash(_k, _v, false);
        inTree = key === _k;
      }
    }

    let depth = BigInt(len - 2);
    for (let i = 2; i < len;) {
      depth--;
      const bitmask = 1n << depth;
      let goLeft = key & bitmask;

      const next = proofs[i++];

      if (goLeft) {
        ret = this.hash(ret, next, true);
      } else {
        ret = this.hash(next, ret, true);
      }
    }

    const valid = ret === this.root.hash;
    return {
      valid,
      inTree: valid ? inTree : false,
      value: valid && inTree ? _v : BIG_ZERO
    };
  }
}
