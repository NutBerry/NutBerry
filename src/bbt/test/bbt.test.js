import crypto from 'crypto';

import { toHexPrefix as toHex } from '../../common/conversion.js';
import BalancedBinaryTree from '../BalancedBinaryTree.js';
import { printTree } from '../utils.js';

const BIG_ZERO = BigInt(0);

function traverseLeaves (tree) {
  const todo = [tree.root];
  const leaves = [];

  while (todo.length) {
    const node = todo.shift();
    if (node.isBranch) {
      if (node.left && node.left.hash !== BIG_ZERO) {
        todo.push(node.left);
      }
      if (node.right && node.right.hash !== BIG_ZERO) {
        todo.push(node.right);
      }
      continue;
    }

    leaves.push(node);
  }

  return leaves.map((v) => v.value);
}

describe('BBT', () => {
  const buf = new Uint8Array(32);

  function getRandomHash () {
    crypto.randomFillSync(buf);

    return BigInt(toHex(buf));
  }

  const tree = new BalancedBinaryTree();
  const keys = [];
  const values = [];

  function round (roundN) {
    describe(`round ${roundN}`, () => {
      const n = 1000;
      it(`random insert and update n=${n}`, () => {
        for (let i = 0; i < n; i++) {
          const key = getRandomHash();
          const value = getRandomHash();

          keys.push(key);
          values.push(value);

          tree.add(key, getRandomHash());
          tree.add(key, value);
        }
      });

      it('check leaves', () => {
        const leaves = traverseLeaves(tree);

        assert.equal(leaves.length, values.length, 'leaf count');
        for (const v of leaves) {
          assert.ok(values.indexOf(v) !== -1, 'leaf value');
        }
      });

      it('verify - key = 0, value = 0', () => {
        const key = 0n;
        if (keys.indexOf(key) !== -1) {
          const proofs = tree.proofUniform(key);
          const verified = tree.verifyUniform(key, proofs);

          assert.equal(verified.valid, true, 'verify - valid');
          assert.equal(verified.inTree, true, 'verify - inTree');
          assert.equal(verified.value, 1n, 'verify - value');

          return;
        }

        assert.ok(!tree.leaves[key], 'should not exist');

        const proofs = tree.proofUniform(key);
        const verified = tree.verifyUniform(key, proofs);

        assert.equal(verified.valid, true, 'verify - valid');
        assert.equal(verified.inTree, false, 'verify - inTree');
        assert.equal(verified.value, 0n, 'verify - value');
      });

      it('insert key = 0', () => {
        const key = 0n;
        if (keys.indexOf(key) !== -1) {
          return;
        }

        tree.add(key, 1n);

        const proofs = tree.proofUniform(key);
        const verified = tree.verifyUniform(key, proofs);

        assert.equal(verified.valid, true, 'verify - valid');
        assert.equal(verified.inTree, true, 'verify - inTree');
        assert.equal(verified.value, 1n, 'verify - value');

        keys.push(key);
        values.push(1n);
      });

      it('verify', () => {
        for (const key of keys) {
          const node = tree.leaves[key];
          assert.ok(node, key);

          const proofs = tree.proofUniform(key);
          const verified = tree.verifyUniform(key, proofs);

          assert.equal(verified.valid, true, 'verify - valid');
          assert.equal(verified.inTree, true, 'verify - inTree');
          assert.equal(verified.value, node.value, 'verify - value');
        }
      });

      it('proofs for invalid keys', () => {
        const nonKey = getRandomHash();
        const proofs = tree.proofUniform(nonKey);
        const verified = tree.verifyUniform(nonKey, proofs);

        assert.equal(verified.valid, true, 'valid proof');
        assert.equal(verified.inTree, false, 'key not in tree');
        assert.equal(verified.value, 0, 'value');
      });

      it('clone', () => {
        const clonedTree = tree.clone();

        assert.equal(clonedTree.root.hash, tree.root.hash);
      });
    });
  }

  round(1);
  round(2);
  round(3);

  if (process.env.DEBUG) {
    describe('debug', () => {
      it('dump tree to graph.dot', async () => {
        (await import('fs')).writeFileSync('./graph.dot', printTree(tree));
      });
    });
  }
});
