
// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

contract CodegenTestDebug {
  fallback () external {
    assembly {
      
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

let gasBefore := gas()
  switch primaryType

// start of Mail
// typeHash: 0x3ebb15d469221e2562f7d56c127ee79351481f46c5eed680ee26a81df3afc127
// function: onMail(address,string,address,string,string,address,string,string)
case 0 {
  let headSize := 256
  let typeLen := 0
  let txPtr := 576
  let endOfSlot := add(txPtr, 256)

  txPtr := 608
  // typeHash of Mail
  mstore(0, 0x3ebb15d469221e2562f7d56c127ee79351481f46c5eed680ee26a81df3afc127)
  // typeHash of Person
  mstore(32, 0xaa9758b75a945f4b22c1b80905ac552c64c1b79b04227a7c2992668992a06dbc)
  // string Person.name
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(64, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // address Person.wallet
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash of Cyborg
  mstore(128, 0x54a04c4263a87657fb09f22e40d06d2b506c11ede600fc43ded908fd3cbb9013)
  // string Cyborg.identifier
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(160, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)
  // hash of ...
  mstore(128, keccak256(128, 64))
  // hash of ...
  mstore(32, keccak256(32, 128))

  // typeHash of Person
  mstore(64, 0xaa9758b75a945f4b22c1b80905ac552c64c1b79b04227a7c2992668992a06dbc)
  // string Person.name
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(96, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // address Person.wallet
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash of Cyborg
  mstore(160, 0x54a04c4263a87657fb09f22e40d06d2b506c11ede600fc43ded908fd3cbb9013)
  // string Cyborg.identifier
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(192, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)
  // hash of ...
  mstore(160, keccak256(160, 64))
  // hash of ...
  mstore(64, keccak256(64, 128))

  // string Mail.contents
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(96, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 128)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(544, 0xf6f082e5)
  mstore(576, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(572, sub(endOfSlot, 540))
}
// end of Mail

// start of Transaction
// typeHash: 0x174ead53e7b62242b648b7bb2a954244aaa3af2f55517ec670f9801d2dea09e5
// function: onTransaction(address,address,uint256,bytes)
case 1 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of Transaction
  mstore(0, 0x174ead53e7b62242b648b7bb2a954244aaa3af2f55517ec670f9801d2dea09e5)
  // address Transaction.to
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 Transaction.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes Transaction.data
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(96, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 128)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(288, 0xf957ee78)
  mstore(320, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(316, sub(endOfSlot, 284))
}
// end of Transaction

// start of TypeTest
// typeHash: 0xdb31b35c84ca6e48f74f80ad0d69ba04eb7c2b53a8033f13714b58993f72963d
// function: onTypeTest(address,bytes,address,uint256,uint8,int8,bytes20)
case 2 {
  let headSize := 224
  let typeLen := 0
  let txPtr := 512
  let endOfSlot := add(txPtr, 224)

  txPtr := 544
  // typeHash of TypeTest
  mstore(0, 0xdb31b35c84ca6e48f74f80ad0d69ba04eb7c2b53a8033f13714b58993f72963d)
  // bytes TypeTest.data
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(32, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // address TypeTest.to
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 TypeTest.u256
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint8 TypeTest.u8
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // int8 TypeTest.i8
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, not(1))
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(160, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes20 TypeTest.b20
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(20, typeLen)), offset, typeLen)
  mstore(192, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 224)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(480, 0xf14742aa)
  mstore(512, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(508, sub(endOfSlot, 476))
}
// end of TypeTest

// start of Foo
// typeHash: 0x2937f1ca5dd875b11a08729d8e911b1395b9ada19ad8798065ba5512ea55d0a7
// function: onFoo(address,bytes)
case 3 {
  let headSize := 64
  let typeLen := 0
  let txPtr := 192
  let endOfSlot := add(txPtr, 64)

  txPtr := 224
  // typeHash of Foo
  mstore(0, 0x2937f1ca5dd875b11a08729d8e911b1395b9ada19ad8798065ba5512ea55d0a7)
  // bytes Foo.data
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(32, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 64)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(160, 0xdd2be7c4)
  mstore(192, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(188, sub(endOfSlot, 156))
}
// end of Foo
default { }
}

      let nextOffset, success, inOffset, inSize := _parseTransaction(0)
    }
  }
}
