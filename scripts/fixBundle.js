#!/usr/bin/env node

import fs from 'fs';

const p = process.argv[2];
const tmp = fs.readFileSync(p).toString().split('\n');
const ctns = [];

for (const line of tmp) {
  if (line.startsWith('import ')) {
    console.log('ignoring', line);
    continue;
  }

  ctns.push(line);
}

fs.writeFileSync(p, ctns.join('\n'));
