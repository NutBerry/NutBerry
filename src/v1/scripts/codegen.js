#!/usr/bin/env node

import fs from 'fs';

import defaultCodeTemplates from '../lib/defaultCodeTemplates.js';
import typedData1 from '../test/typedData.js';
import typedData2 from '../test/typedData2.js';

(async function () {
  const baseDir = import.meta.url.split('/').slice(2, -2).join('/');

  {
    const { builder, challengeCode, debugCode } = await defaultCodeTemplates({ typedData: typedData1, contractName: 'CodegenTest' });
    console.log(builder.info());
    fs.writeFileSync(`${baseDir}/contracts/test/CodegenTest.sol`, debugCode);
  }

  {
    const { builder, challengeCode, debugCode } = await defaultCodeTemplates({ typedData: typedData2, contractName: 'V1TestOne' });
    console.log(builder.info());
    fs.writeFileSync(`${baseDir}/contracts/test/V1TestOneChallenge.sol`, challengeCode);
    fs.writeFileSync(`${baseDir}/contracts/test/V1TestOneDebug.sol`, debugCode);
  }
})();
