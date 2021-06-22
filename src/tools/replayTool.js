import fs from 'fs';
import createFetchJson from '../common/createFetchJson.js';

async function main () {
  process.on('unhandledRejection', console.error);
  console.log('environment variables:\n\tBLOCK (default=latest) - or 0x1 etc\n\tRPC_URL - http://...\n\tFILE_PATH - path to read & write transaction data');

  const blockTag = process.env.BLOCK || 'latest';
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8080';
  const filePath = process.env.FILE_PATH || './txSafe.json';
  const fetchJson = await createFetchJson(rpcUrl);
  const txSafe = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : {};

  console.log({ rpcUrl, filePath, blockTag });

  // check transactions
  for (const txHash in txSafe) {
    const tx = txSafe[txHash];
    let found = false;

    console.log(`checking ${tx.hash}`);

    try {
      const callRet = await fetchJson('eth_getTransactionByHash', [tx.hash]);
      if (callRet.hash === tx.hash) {
        found = true;
        console.log('\tfound!');
      }
    } catch (e) {
      console.error('error', e);
    }

    if (!found) {
      try {
        console.log(`\tsubmitting transaction`);
        const callRet = await fetchJson('eth_sendRawTransaction', [tx]);
      } catch (e) {
        console.error('error', e);
      }
    }
  }

  // pull new transactions
  const block = await fetchJson('eth_getBlockByNumber',
    [
      blockTag,
    ]
  );
  const { transactions } = block;

  for (const txHash of transactions) {
    if (txSafe[txHash]) {
      continue;
    }
    console.log(`new transaction ${txHash}`);
    try {
      const tx = await fetchJson('eth_getTransactionByHash', [txHash]);
      txSafe[txHash] = tx;
    } catch (e) {
      console.error(e);
    }
  }

  console.log(`Dumping to ${filePath}`);
  fs.writeFileSync(filePath, JSON.stringify(txSafe));
}

main();
