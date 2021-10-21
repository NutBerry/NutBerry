import ethers from 'ethers';
import fs from 'fs';
import workerThreads from 'worker_threads';
import { fileURLToPath } from 'url';

import startServer from '../startServer.js';

export async function startNode (serverPath, port, i, contract, typedData, overrides = {}) {
  const config = Object.assign({
    contract: contract,
    privKey: '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120' + i,
    rpcPort: port,
    host: 'localhost',
    rootRpcUrl: process.env.ROOT_RPC_URL,
    eventCheckMs: 60,
    debugMode: 1,
    blockSizeThreshold: 1,
    submitSolutionThreshold: 1,
    alwaysChallengeDisputedBlocks: true,
    disableStoreAndRestore: true,
    typedData,
    serverPath
  }, overrides);

  const logPath = `logs/node-${i}.log`;
  const pipe = fs.createWriteStream(logPath);
  const worker = new workerThreads.Worker(
    fileURLToPath(import.meta.url),
    { stdout: pipe, stderr: pipe }
  );
  worker.stdout.pipe(pipe);
  worker.stderr.pipe(pipe);
  worker.postMessage(config);

  console.log(`logfile for node-${i}: ${logPath}`);
  return new Promise((resolve) => {
    worker.once('message',
      function () {
        resolve(new ethers.providers.JsonRpcProvider(`http://localhost:${port}`));
      }
    );
  });
}

if (workerThreads.parentPort) {
  workerThreads.parentPort.once('message',
    async function (config) {
      const { Bridge } = await import(config.serverPath);
      const bridge = new Bridge(config);
      const srv = await startServer(bridge, config);

      await bridge.init();
      workerThreads.parentPort.postMessage(true);
    }
  );
}
