import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  inlineDynamicImports: true,
  external: ['http', 'https', 'crypto', 'process'],
  output: {
    intro:
 `
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
}`,
  },
  plugins: [
    commonjs({ transformMixedEsModules: true }),
    resolve({ browser: true, preferBuiltins: false }),
    json(),
  ]
}
