// use this file for custom preparations

import assert from 'assert';
import Artifacts from '../Artifacts.js';
import { startNode } from './worker.js';
import * as shared from './shared.js';

Object.assign(
  globalThis,
  {
    assert,
    Artifacts,
    startNode,
  }
);

for (const k in shared) {
  globalThis[k] = shared[k];
}

console.info(`*** ROOT_RPC_URL=${process.env.ROOT_RPC_URL} ***`);
