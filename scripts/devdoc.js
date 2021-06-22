#!/usr/bin/env node

import fs from 'fs';
import { keccak256HexPrefix } from './../src/common/utils.js';

const encoder = new TextEncoder();
const output = 'docs/artifacts.md';
const dir = './build/contracts/';
const files = fs.readdirSync(dir);
const reg = {};
let toc = 'Table of Contents\n=================\n\n';
let str = '';

for (const file of files) {
  const artifact = JSON.parse(fs.readFileSync(`${dir}${file}`));
  const devdoc = artifact.devdoc;
  const name = artifact.contractName;

  toc += `* [${name}](#${name.toLowerCase()})\n`
  str += `# ${name}\n\n`;

  for (const method in devdoc.methods) {
    const functionSig = keccak256HexPrefix(encoder.encode(method)).slice(0, 10);
    const obj = devdoc.methods[method];
    const id = reg[method] | 0;
    reg[method] = id + 1;
    const strippedName =
      method.toLowerCase()
      .replace('(', '')
      .replace(')', '')
      .split(',').join('')
      .split('[').join('')
      .split(']').join('');

    toc += `  * [${method}](#${strippedName + (id ? '-' + id : '')})\n`;
    str += `## ${method}\n(${functionSig})\n\n`;

    if (obj.details) {
      str += `${obj.details}\n\n`;
    }
    if (obj.params) {
      for (const p in obj.params) {
        str += `- ${p} ${obj.params[p]}\n`;
      }
    }

    str += '\n';
  }
}

fs.writeFileSync(output, toc + '\n\n' + str);
