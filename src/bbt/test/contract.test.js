import crypto from 'crypto';

import { toHexPrefix as toHex } from '../../common/conversion.js';
import BalancedBinaryTree from '../BalancedBinaryTree.js';
import { printTree } from '../utils.js';
import fs from 'fs';

describe('BBT', () => {
  const buf = new Uint8Array(32);

  function getRandomHash () {
    crypto.randomFillSync(buf);

    return BigInt(toHex(buf));
  }

  const { alice } = getDefaultWallets();
  const tree = new BalancedBinaryTree();
  const keys = [];
  const values = [];
  let contract;
  let verifyCumulativeGas = 0n;
  let verifyCalls = 0;
  let newRootCumulativeGas = 0n;
  let newRootCalls = 0;

  async function contractVerify (a, b) {
    const ret = await contract.verify(a, b);
    const gas = BigInt(await contract.estimateGas.verify(a, b)) - 21_000n;
    verifyCumulativeGas += gas;
    verifyCalls++;

    return ret;
  }

  async function contractNewRoot (a, b) {
    const ret = BigInt(await contract.calculateNewRoot(a, b));
    const gas = BigInt(await contract.estimateGas.calculateNewRoot(a, b)) - 21_000n;
    newRootCumulativeGas += gas;
    newRootCalls++;

    return ret;
  }

  before('Prepare contracts', async () => {
    contract = await deploy(Artifacts.BalancedBinaryTree, alice);
  });

  describe('custom insertition / proofs tests', () => {
    const keys = [0b00n, 0b1000n, 0b1011n, 0b1010n, 0b0001n, 0b1001n];

    it('insert zero', async () => {
      const newValue = 0n;
      for (const someKey of keys) {
        const proof = tree.proofUniform(someKey);
        assert.ok(tree.verifyUniform(someKey, proof).valid, 'valid proof #1');
        assert.ok(tree.verifyUniform(someKey, proof).inTree === false, 'inTree #1');
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const proof2 = tree.proofUniform(someKey);
        const expectedRoot = tree.root.hash;
        assert.ok(tree.verifyUniform(someKey, proof2).valid, 'valid proof #2');
        assert.ok(tree.verifyUniform(someKey, proof2).inTree === false, 'inTree #2');
        assert.equal(tree.clone().root.hash, tree.root.hash, 'rootHash after clone');
        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')

        {
          const [valid, inTree, value] = await contractVerify(tree.root.hash, [someKey, proof.length, ...proof]);
          assert.equal(valid, true);
          assert.equal(inTree, false);
          assert.equal(value, newValue);
        }
        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }
    });

    it('insert non-zero', async () => {
      const newValue = 1n;
      for (const someKey of keys) {
        const proof = tree.proofUniform(someKey);
        assert.ok(tree.verifyUniform(someKey, proof).valid, 'valid proof #1');
        assert.ok(tree.verifyUniform(someKey, proof).inTree === false, 'inTree #1');
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const proof2 = tree.proofUniform(someKey);
        const expectedRoot = tree.root.hash;
        assert.ok(tree.verifyUniform(someKey, proof2).valid, 'valid proof #2');
        assert.ok(tree.verifyUniform(someKey, proof2).inTree === true, 'inTree #2');
        assert.equal(tree.clone().root.hash, tree.root.hash, 'rootHash after clone');

        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')
        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }
    });

    it('clear tree', async () => {
      const newValue = 0n;
      for (const someKey of keys) {
        const proof = tree.proofUniform(someKey);
        assert.ok(tree.verifyUniform(someKey, proof).valid, 'valid proof #1');
        assert.ok(tree.verifyUniform(someKey, proof).inTree === true, 'inTree #1');
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const proof2 = tree.proofUniform(someKey);
        const expectedRoot = tree.root.hash;
        assert.ok(tree.verifyUniform(someKey, proof2).valid, 'valid proof #2');
        assert.ok(tree.verifyUniform(someKey, proof2).inTree === false, 'inTree #2');
        assert.equal(tree.clone().root.hash, tree.root.hash, 'rootHash after clone');
        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')

        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }
    });
  });

  describe('misc', () => {
    it('insert #1', async () => {
      for (let someKey = 0n; someKey < 0x100n; someKey++) {
        const newValue = BigInt(0xfafa);
        const proof = tree.proofUniform(someKey);
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const proof2 = tree.proofUniform(someKey);
        const expectedRoot = tree.root.hash;
        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')

        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }

      if (process.env.DEBUG) {
        fs.writeFileSync('./bbt-graph.dot', printTree(tree));
      }
    });

    it('insert #2', async () => {
      for (let i = 0; i <= 0xff; i++) {
        const someKey = BigInt(1n << BigInt(i));
        const newValue = BigInt(0xffcc + i);
        const proof = tree.proofUniform(someKey);
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const proof2 = tree.proofUniform(someKey);
        const expectedRoot = tree.root.hash;
        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')

        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }

      if (process.env.DEBUG) {
        fs.writeFileSync('./bbt-graph.dot', printTree(tree));
      }
    });

    it('insert #3', async () => {
      let v = BigInt.asUintN(256, '-1');
      for (let i = 0; i <= 0xff; i++) {
        const someKey = v;
        v = BigInt.asUintN(256, v << 1n);
        const newValue = BigInt(0xffcc + i);
        const proof = tree.proofUniform(someKey);
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const proof2 = tree.proofUniform(someKey);
        const expectedRoot = tree.root.hash;
        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')

        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }

      if (process.env.DEBUG) {
        fs.writeFileSync('./bbt-graph.dot', printTree(tree));
      }
    });

    const n = 10;
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

    it('verify proofs', async () => {
      const maxIterations = 1;
      let i = 0;
      for (const k in tree.leaves) {
        if (i > maxIterations) {
          break;
        }
        i++;
        const key = BigInt(k);

        {
          const proof = tree.proofUniform(key);
          const ret = tree.verifyUniform(key, proof);
          assert.equal(ret.valid, true);
          assert.equal(ret.inTree, true);
          assert.equal(ret.value, tree.leaves[k].value);

          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [key, proof.length, ...proof]);
            assert.equal(valid, true);
            assert.equal(inTree, true);
            assert.equal(value, tree.leaves[k].value);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [key, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
        }

        {
          const proof = tree.proofUniform(key);
          proof.pop();
          proof.pop();
          const ret = tree.verifyUniform(key, proof);
          assert.equal(ret.valid, false);
          assert.equal(ret.inTree, false);
          assert.equal(ret.value, 0n);

          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [key, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [key, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
        }

        {
          const proof = tree.proofUniform(key);
          proof.push(0n);
          proof.push(0n);
          const ret = tree.verifyUniform(key, proof);
          assert.equal(ret.valid, false);
          assert.equal(ret.inTree, false);
          assert.equal(ret.value, 0n);

          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [key, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [key, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
        }

        {
          const nonKey = getRandomHash();
          const proof = tree.proofUniform(nonKey);
          const ret = tree.verifyUniform(nonKey, proof);
          assert.equal(ret.valid, true);
          assert.equal(ret.inTree, false);
          assert.equal(ret.value, 0n);

          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [nonKey, proof.length, ...proof]);
            assert.equal(valid, true);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [nonKey, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
        }

        {
          const nonKey = getRandomHash();
          const proof = tree.proofUniform(nonKey);
          proof.pop();
          proof.pop();
          const ret = tree.verifyUniform(nonKey, proof);
          assert.equal(ret.valid, false);
          assert.equal(ret.inTree, false);
          assert.equal(ret.value, 0n);

          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [nonKey, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [nonKey, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
        }

        {
          const nonKey = getRandomHash();
          const proof = tree.proofUniform(nonKey);
          proof.push(0n);
          proof.push(0n);
          const ret = tree.verifyUniform(nonKey, proof);
          assert.equal(ret.valid, false);
          assert.equal(ret.inTree, false);
          assert.equal(ret.value, 0n);

          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [nonKey, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [nonKey, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
        }

        {
          const nonKey = getRandomHash();
          const proof = tree.proofUniform(nonKey);
          proof.push(0n);
          const ret = tree.verifyUniform(nonKey, proof);
          assert.equal(ret.valid, false);
          assert.equal(ret.inTree, false);
          assert.equal(ret.value, 0n);

          await assert.rejects(contractVerify(tree.root.hash, [nonKey, 1, ...proof]));
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [nonKey, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [nonKey, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
        }

        if (tree.hasLeaf(0n)) {
          const key = 0n;
          const proof = tree.proofUniform(key);
          const ret = tree.verifyUniform(key, proof);
          assert.equal(ret.valid, true);
          assert.equal(ret.inTree, true);
          assert.equal(ret.value, tree.leaves[key].value);
        } else {
          const key = 0n;
          const proof = tree.proofUniform(key);
          const ret = tree.verifyUniform(key, proof);
          assert.equal(ret.valid, true);
          assert.equal(ret.inTree, false);
          assert.equal(ret.value, 0n);

          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash, [key, proof.length, ...proof]);
            assert.equal(valid, true);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }
          {
            const [valid, inTree, value] = await contractVerify(tree.root.hash - 1n, [key, proof.length, ...proof]);
            assert.equal(valid, false);
            assert.equal(inTree, false);
            assert.equal(value, 0);
          }

          {
            tree.add(key, 0n);
            const proof = tree.proofUniform(key);
            const ret = tree.verifyUniform(key, proof);
            assert.equal(ret.valid, true);
            assert.equal(ret.inTree, true);
            assert.equal(ret.value, 0n);
          }
        }
      }
    });

    it('calculate new root - key update', async () => {
      for (const k in tree.leaves) {
        const someKey = BigInt(k);
        const proof = tree.proofUniform(someKey);
        const newValue = getRandomHash();
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const expectedRoot = tree.root.hash;
        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')

        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }
    });

    it('calculate new root - key previously not in tree', async () => {
      for (let i = 0; i < 1_000; i++) {
        const someKey = BigInt(getRandomHash());
        if (tree.hasLeaf(someKey)) {
          i--;
          continue;
        }
        const proof = tree.proofUniform(someKey);
        const newValue = getRandomHash();
        const oldRoot = tree.root.hash;
        tree.add(someKey, newValue);
        const proof2 = tree.proofUniform(someKey);
        const expectedRoot = tree.root.hash;
        assert.equal(tree.calculateUpdate(someKey, newValue, proof), tree.root.hash, 'calculateUpdate')

        const calculatedRoot = BigInt(await contractNewRoot(newValue, [someKey, proof.length, ...proof]));
        assert.equal(calculatedRoot, expectedRoot, 'root.hash');
      }
    });

    it('print stats', () => {
      console.log(
        {
          verifyCumulativeGas,
          verifyAvg: verifyCumulativeGas / BigInt(verifyCalls),
          newRootCumulativeGas,
          newRootAvg: newRootCumulativeGas / BigInt(newRootCalls),
        }
      );
    });
  });
});
