import { Constants, EVMRuntime } from './../js/index.js';

function genCode () {
  const res = [Constants.PUSH1, 'fa'];

  for (let i = 0; i < 0xfffff; i++) {
    res.push(Constants.DUP1);
    res.push(Constants.ADD);
  }

  res.push(Constants.STOP);

  return res.map( (e) => parseInt(e, 16) );
}

describe('EVMRuntime', () => {
  const args = {
    code: genCode(),
    data: [],
  };
  const runs = 10;
  const runtime = new EVMRuntime();
  let ms = BigInt(0);

  for (let i = 0; i < runs; i++) {
    describe(`run ${i}`, () => {
      it('works', async () => {
        const now = process.hrtime.bigint();
        const state = await runtime.run(args);

        ms += process.hrtime.bigint() - now;

        assert.ok(state.errno === 0);
      });
    });
  }

  describe('check', async () => {
    it('average', () => {
      const avg = ((ms / BigInt(runs)) / BigInt(1000));
      console.log({
        avg: avg.toLocaleString() + ' ms',
      });
    });
  });
});
