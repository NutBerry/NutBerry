
export default async function startServer (bridge, { host, rpcPort }) {
  const OPTIONS_HEADERS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'post, get, options',
    'access-control-allow-headers': 'origin, content-type, accept, x-requested-with',
    'access-control-max-age': '300'
  };
  const DEFAULT_HEADERS = {
    'access-control-allow-origin': '*',
    'content-type': 'application/json'
  };
  const DEFLATE_HEADERS = {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
    'content-encoding': 'deflate'
  };
  const { deflateRawSync } = await import('zlib');

  function log (...args) {
    console.log('Server:', ...args);
  }

  function onRequest (req, resp) {
    resp.sendDate = false;

    if (req.method === 'POST') {
      const maxLen = 8 << 20;
      const len = parseInt(req.headers['content-length'] || maxLen);

      if (len > maxLen) {
        resp.writeHead(413);
        resp.end();
        return;
      }

      let body = '';

      req.on('data', function (buf) {
        body += buf.toString();

        // this is actually not correct but we also do not expect unicode
        if (body.length > len) {
          resp.abort();
        }
      });

      req.on('end', async function () {
        try {
          const obj = JSON.parse(body);
          log(obj.method);

          const compress = (req.headers['accept-encoding'] || '').indexOf('deflate') !== -1;
          resp.writeHead(200, compress ? DEFLATE_HEADERS : DEFAULT_HEADERS);

          const ret = JSON.stringify(await bridge.rpcCall(obj));
          resp.end(compress ? deflateRawSync(ret) : ret);
        } catch (e) {
          resp.writeHead(400, DEFAULT_HEADERS);
          resp.end();
        }
      });

      return;
    }

    resp.writeHead(204, OPTIONS_HEADERS);
    resp.end();
  }
  // TODO:
  // - start the server after the bridge is properly initialized
  // - allow for a https option (path to cert/key)
  // - use HTTP/2

  // lazy import
  const esm = await import('http');
  const server = new esm.default.Server(onRequest);
  // timeout after 120 seconds
  server.timeout = 120000;
  server.listen(rpcPort, host);

  log(`listening on ${host}:${rpcPort}`);
}
