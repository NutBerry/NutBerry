if (typeof process !== 'undefined') {
  globalThis['process$1'] = process;
  import('crypto').then(function(esm){globalThis['require$$0']=esm});
  globalThis['fs'] = undefined;
  globalThis['path$1'] = undefined;
} else {
  globalThis['Buffer'] = {
    from: function (a, b) {
      if (b !== 'hex') {
        throw new Error('unsupported Buffer.from');
      }
      const len = a.length / 2;
      const ret = Array(len);
      for (let i = 0; i < len; i++) {
        const x = i * 2;
        ret[i] = parseInt(a.substring(x, x + 2), 16);
      }
      return ret;
    }
  };
}


async function createFetchJson (url) {
  const headers = {
    'content-type': 'application/json',
    'accept-encoding': 'gzip',
  };
  const method = 'POST';

  if (typeof fetch !== 'undefined') {
    // browser
    return async function (rpcMethod, params) {
      const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: rpcMethod, params });
      const resp = await fetch(url, { body: payload, method, headers });
      const obj = await resp.json();

      if (obj.error) {
        throw new Error(obj.error.message);
      }

      return obj.result;
    };
  }

  // nodejs
  {
    const http = await import('http');
    const https = await import('https');
    const { gunzipSync } = await import('zlib');
    const { parse } = await import('url');
    const urlParse = parse;

    return async function (rpcMethod, params) {
      const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: rpcMethod, params });

      return new Promise(
        function (resolve, reject) {
          const timeoutMsec = 5000;
          const fetchOptions = urlParse(url);

          fetchOptions.method = method;
          fetchOptions.headers = headers;

          const proto = fetchOptions.protocol === 'http:' ? http : https;
          const req = proto.request(fetchOptions);

          let body = Buffer.alloc(0);

          req.setTimeout(timeoutMsec, () => req.abort());
          req.on('error', reject);
          req.on('socket', (socket) => socket.setTimeout(timeoutMsec));
          req.on('response', function (resp) {
            resp.on('data', function (buf) {
              body = Buffer.concat([body, buf]);
            });
            resp.on('end', function () {
              try {
                const obj = JSON.parse(resp.headers['content-encoding'] === 'gzip' ? gunzipSync(body) : body);

                if (obj.error) {
                  reject(obj.error);
                }
                resolve(obj.result);
              } catch (e) {
                reject(e.message || e);
              }
            });
          });

          req.end(payload);
        }
      );
    };
  }
}

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
