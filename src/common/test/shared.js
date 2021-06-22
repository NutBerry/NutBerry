import assert from 'assert';
import ethers from 'ethers';

export const PRIV_KEY_MAIN = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200';
export const PRIV_KEY_ALICE = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203';
export const PRIV_KEY_BOB = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501204';
export const GAS_LIMIT = 6_000_000;

export async function waitForValueChange (oldValue, getNewValue) {
  while (true) {
    if (oldValue.toString() !== (await getNewValue()).toString()) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function waitForSync (l1, l2) {
  const blockN = await l1.provider.getBlockNumber();
  let v = 0;

  while (blockN > v) {
    const obj = await l2.provider.send('eth_syncing', []);
    v = Number(obj.currentBlock);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function assertRevert (tx) {
  let reverted = false;

  try {
    await (await tx).wait();
  } catch (e) {
    reverted = e.code === 'CALL_EXCEPTION';
  }

  assert.ok(reverted, 'Expected revert');
}

export async function produceBlocks (t, wallet) {
  for (let i = 0; i < t; i++) {
    const tx = await wallet.sendTransaction({ to: await wallet.getAddress() });
    await tx.wait();
  }
}

export function getDefaultWallets () {
  const rootProvider = new ethers.providers.JsonRpcProvider(process.env.ROOT_RPC_URL);
  // increase it because of coverage
  rootProvider.connection.timeout = 10 * 60 * 1000;

  const baseKey = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120';
  return {
    rootProvider,
    alice: new ethers.Wallet(baseKey + '0', rootProvider),
    bob: new ethers.Wallet(baseKey + '1', rootProvider),
    charlie: new ethers.Wallet(baseKey + '2', rootProvider),
    daniel: new ethers.Wallet(baseKey + '3', rootProvider),
    eva: new ethers.Wallet(baseKey + '4', rootProvider),
  };
}

export async function deploy (artifact, wallet, ...args) {
  const _factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );
  const contract = await _factory.deploy(...args);
  await contract.deployTransaction.wait();

  return contract;
}

export async function submitBlock (bridge, rootProvider, myNode) {
  const blockN = await myNode.getBlockNumber();
  await myNode.send('debug_submitBlock', []);
  await waitForValueChange(blockN, () => myNode.getBlockNumber());
}

export async function submitBlockUntilEmpty (bridge, rootProvider, myNode) {
  let block = await myNode.getBlock();

  while (block.transactions.length) {
    console.log({ transactionsRemaining: block.transactions.length });

    await myNode.send('debug_submitBlock', []);
    await waitForValueChange(block.number, () => myNode.getBlockNumber());
    block = await myNode.getBlock();
  }
}

export async function doForward (bridge, rootProvider, myNode) {
  const signer = await rootProvider.getSigner(0);
  const pendingHeight = (await myNode.getBlockNumber()) - 1;
  let finalizedHeight = Number(await bridge.finalizedHeight());

  console.log({ pendingHeight, finalizedHeight });

  while (finalizedHeight < pendingHeight) {
    try {
      await myNode.send('debug_forwardChain', []);
    } catch (e) {
      console.log(e);
    }
    const newHeight = Number(await bridge.finalizedHeight());
    console.log({ newHeight });

    if (newHeight === finalizedHeight) {
      console.log('producing INSPECTION_PERIOD blocks');
      await produceBlocks(parseInt(await bridge.INSPECTION_PERIOD()), signer);
    }
    finalizedHeight = newHeight;
  }
}

export async function doChallenge (bridge, rootProvider, myNode) {
  const pendingHeight = (await myNode.getBlockNumber()) - 1;
  let finalizedHeight = Number(await bridge.finalizedHeight());

  console.log({ pendingHeight, finalizedHeight });

  while (finalizedHeight !== pendingHeight) {
    try {
      let ok = await myNode.send('debug_directReplay', ['0x' + (finalizedHeight + 1).toString(16)]);
      if (!ok) {
        console.log({ok});
      }
    } catch (e) {
      console.log(e);
    }
    finalizedHeight = Number(await bridge.finalizedHeight());
  }
}

export async function debugStorage (bridge, rootProvider, myNode) {
  // verifies state roots
  const storage = await myNode.send('debug_storage', []);

  // not relevant for state root supported chains
  /*
  for (const key in storage) {
    const onChainValue = await rootProvider.send('eth_getStorageAt', [bridge.address, key, 'latest']);
    const clientValue = storage[key];

    assert.equal(onChainValue, clientValue, `storage value for key: ${key}`);
  }
  */
}

export async function doChallengeForward (bridge, rootProvider, myNode) {
  const pendingHeight = (await myNode.getBlockNumber()) - 1;
  let finalizedHeight = Number(await bridge.finalizedHeight());
  let i = 0;

  console.log({ pendingHeight, finalizedHeight });

  while (finalizedHeight !== pendingHeight) {
    const nextHeight = finalizedHeight + 1;
    try {
      if (i++ % 2) {
        console.log(`debug_forwardChain block:${nextHeight}`);
        await myNode.send('debug_forwardChain', []);
        await produceBlocks(parseInt(await bridge.INSPECTION_PERIOD()), wallet);
      } else {
        console.log(`debug_directReplay block:${nextHeight}`);
        await myNode.send('debug_directReplay', ['0x' + nextHeight.toString(16)]);
      }
    } catch (e) {
      console.log(e);
    }
    finalizedHeight = Number(await bridge.finalizedHeight());
  }
}

export function createTransaction (builder, primaryType, message, signer) {
  const tx = {
    primaryType,
    message,
  };
  const hash = builder.sigHash(tx);
  const { r, s, v } = signer._signingKey().signDigest(hash);

  Object.assign(tx, { r, s, v });

  const encoded = builder.encode(tx);
  const decoded = builder.decode(encoded);

  if (decoded.from !== signer.address.toLowerCase()) {
    console.log({ tx, decoded });
    assert.equal(decoded.from, signer.address.toLowerCase());
  }

  let str = '';
  for (const v of encoded) {
    str += v.toString(16).padStart(2, '0');
  }

  return str;
}
