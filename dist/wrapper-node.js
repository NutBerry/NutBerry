#!/usr/bin/env node

import main from './bin.js';

(async function () {
  const { Bridge, startServer } = await import('./node.js');
  await main(Bridge, startServer);
})();
