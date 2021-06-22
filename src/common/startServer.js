
export default async function startServer (bridge, { host, rpcPort }) {
  function log (...args) {
    console.log('Server:', ...args);
  }

  function onRequest (req, resp) {
    resp.sendDate = false;
    resp.setHeader('Access-Control-Allow-Origin', '*');
    resp.setHeader('content-type', 'application/json');

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
          resp.end(JSON.stringify(await bridge.rpcCall(obj)));
        } catch (e) {
          resp.writeHead(400);
          resp.end();
        }
      });

      return;
    }

    resp.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, X-Requested-With');
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
