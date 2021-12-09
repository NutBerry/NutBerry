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
  const obj = {};
  globalThis['require$$0'] = obj;
  import('crypto').then(function(esm){Object.assign(obj, esm)});
}`,
  },
  plugins: [
    commonjs({ transformMixedEsModules: true }),
    resolve({ browser: true, preferBuiltins: false }),
    json(),
  ]
}
