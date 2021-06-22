import SUPPORTED_TYPES from './valueTypes.js';

const CODEGEN_TEMPLATE = `
function _parseTransaction (o) -> offset, success, inOffset, inSize {
  // zero memory
  calldatacopy(0, calldatasize(), msize())
  offset := o

  let firstByte := byte(0, calldataload(offset))
  let v := add(and(firstByte, 1), 27)
  let primaryType := shr(1, firstByte)
  offset := add(offset, 1)
  let r := calldataload(offset)
  offset := add(offset, 32)
  let s := calldataload(offset)
  offset := add(offset, 32)

__CODE__
}
`;

export default function codegen (builder, { debug }) {
  let ret = (debug ? 'let gasBefore := gas()\n' : '') +
    '  switch primaryType\n';

  for (const primaryType of builder.primaryTypes) {
    const typeNumber = builder.primaryTypes.indexOf(primaryType);
    const typeHash = builder.typeHashes[primaryType];
    const fields = builder.fieldNames[primaryType];
    const functionSig = builder.functionSigs[primaryType];

    // order for head and tail
    // first one is always transaction sender; thus we start with 32
    let headSize = 32;
    let functionString = `on${primaryType}(address,`;
    for (const field of fields) {
      headSize += 32;
      functionString += field.type + ',';
    }
    functionString = functionString.slice(0, -1) + ')';

    const txPtr = 128 + (fields.length * 64);
    ret +=
      `\n// start of ${primaryType}\n` +
      `// typeHash: ${typeHash}\n` +
      `// function: ${functionString}\n` +
      `case ${typeNumber} {\n` +
      `  let headSize := ${headSize}\n` +
      `  let typeLen := 0\n` +
      `  let txPtr := ${txPtr}\n` +
      `  let endOfSlot := add(txPtr, ${headSize})\n\n` +
      `  txPtr := ${txPtr + 32}\n` +
      `  // typeHash of ${primaryType}\n` +
      `  mstore(0, ${typeHash})\n`;

    let slot = 32;
    let lastType = primaryType;
    const primaryFields = builder.types[primaryType];
    const hist = [{ type: primaryFields, slots: [32 * primaryFields.length] }];

    for (const field of fields) {
      const isStatic = field.type !== 'bytes' && field.type !== 'string';
      let slots = hist[hist.length - 1].slots;

      if (field.customType && lastType !== field.customType) {
        hist.push({ type: builder.types[field.customType], slots: [] });
        slots = hist[hist.length - 1].slots;
        lastType = field.customType;
        const typeHash = builder.typeHashes[field.customType];
        ret +=
          `  // typeHash of ${field.customType}\n` +
          `  mstore(${slot}, ${typeHash})\n`;
        slots.push(slot);
        slot += 32;
      }

      ret += `  // ${field.type} ${field.customType || primaryType}.${field.name}\n`;

      if (isStatic) {
        const fChar = field.type[0];
        let statement;

        if (fChar === 'b') {
          // bytes
          statement = `  calldatacopy(add(txPtr, sub(${SUPPORTED_TYPES[field.type]}, typeLen)), offset, typeLen)\n`;
        } else if (fChar === 'i') {
          // ints
          statement = `  mstore(txPtr, not(1))\n  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)\n`;
        } else {
          // everything else
          statement = `  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)\n`;
        }

        ret +=
          // 1 byte
          `  typeLen := byte(0, calldataload(offset))\n` +
          `  offset := add(offset, 1)\n` +
          statement +
          `  mstore(${slot}, mload(txPtr))\n` +
          `  offset := add(offset, typeLen)\n` +
          `  txPtr := add(txPtr, 32)\n`;
        slots.push(slot);
        slot += 32;
      } else {
        ret +=
          // 2 bytes
          `  typeLen := shr(240, calldataload(offset))\n` +
          `  offset := add(offset, 2)\n` +
          `  mstore(txPtr, headSize)\n` +
          `  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))\n` +
          `  txPtr := add(txPtr, 32)\n` +

          `  mstore(endOfSlot, typeLen)\n` +
          `  endOfSlot := add(endOfSlot, 32)\n` +
          `  calldatacopy(endOfSlot, offset, typeLen)\n` +
          `  mstore(${slot}, keccak256(endOfSlot, typeLen))\n` +
          `  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))\n` +
          `  offset := add(offset, typeLen)\n`;
        slots.push(slot);
        slot += 32;
      }

      while (hist.length > 1) {
        const { type, slots } = hist[hist.length - 1];

        // +1 for typeHash
        if (type.length + 1 === slots.length) {
          const start = slots[0];
          const size = slots.length * 32;
          slot = start;
          ret +=
            `  // hash of ...\n` +
            `  mstore(${slot}, keccak256(${start}, ${size}))\n`;
          slot += 32;
          hist.pop();
          if (hist.length) {
            hist[hist.length - 1].slots.push(slot);
          }
        } else {
          break;
        }
      }

      ret += '\n';
    }

    // TODO
    ret +=
      `  // typeHash\n` +
      `  let structHash := keccak256(0, ${(primaryFields.length + 1) * 32})\n` +
      `  // prefix\n` +
      `  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)\n` +
      `  // DOMAIN struct hash\n` +
      `  mstore(2, ${builder.domainStructHash})\n` +
      `  // transactionStructHash\n` +
      `  mstore(34, structHash)\n` +
      `  mstore(0, keccak256(0, 66))\n` +
      `  mstore(32, v)\n` +
      `  mstore(64, r)\n` +
      `  mstore(96, s)\n` +
      `  success := staticcall(gas(), 1, 0, 128, 128, 32)\n` +
      `  // functionSig\n` +
      `  mstore(${txPtr - 32}, ${functionSig})\n` +
      `  mstore(${txPtr}, mload(128))\n` +
      (
        debug ?
        `\n  mstore(endOfSlot, sub(gasBefore, gas()))\n  return(${txPtr - 4}, sub(endOfSlot, ${txPtr - 36}))\n`
        :
        `\n` +
        `  inOffset := ${txPtr - 4}\n` +
        `  inSize := sub(endOfSlot, ${txPtr - 4})\n`
      ) +
      `}\n// end of ${primaryType}\n`;
  }

  ret += 'default { }';
  ret = CODEGEN_TEMPLATE.replace('__CODE__', ret);

  return ret;
}
