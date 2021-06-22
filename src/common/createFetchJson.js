export default async function createFetchJson (url) {
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
          const timeoutMsec = 500000;
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
