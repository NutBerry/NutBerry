
// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

contract V1TestOneDebug {
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

// start of Transfer
// typeHash: 0xcac2fde8b359511738134dd2e5f36cb10d2d4a263d97c345bd29c658360e83ab
// function: onTransfer(address,address,address,uint256)
case 0 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of Transfer
  mstore(0, 0xcac2fde8b359511738134dd2e5f36cb10d2d4a263d97c345bd29c658360e83ab)
  // address Transfer.to
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address Transfer.token
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 Transfer.value
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 128)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe2731e9065bfc18a9c7f69e7a6867a7f82cde8f020a5ce133145365666409bd7)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(288, 0x0987df03)
  mstore(320, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(316, sub(endOfSlot, 284))
}
// end of Transfer

// start of Exit
// typeHash: 0x9ce2ce8efebc8404f3e1f547925f80c76dd788b220b3b193ed7f4f2187f97291
// function: onExit(address,address,uint256)
case 1 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of Exit
  mstore(0, 0x9ce2ce8efebc8404f3e1f547925f80c76dd788b220b3b193ed7f4f2187f97291)
  // address Exit.token
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 Exit.value
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 96)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe2731e9065bfc18a9c7f69e7a6867a7f82cde8f020a5ce133145365666409bd7)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(224, 0x55f9a20b)
  mstore(256, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(252, sub(endOfSlot, 220))
}
// end of Exit

// start of One
// typeHash: 0x93ae78c0c4a2b925c30dc174177aa956dd00ffe13e9acb27b278f3c193f7226c
// function: onOne(address,bytes,uint256,bytes)
case 2 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of One
  mstore(0, 0x93ae78c0c4a2b925c30dc174177aa956dd00ffe13e9acb27b278f3c193f7226c)
  // bytes One.foo
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

  // uint256 One.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes One.bar
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
  mstore(2, 0xe2731e9065bfc18a9c7f69e7a6867a7f82cde8f020a5ce133145365666409bd7)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(288, 0xc7fdca82)
  mstore(320, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(316, sub(endOfSlot, 284))
}
// end of One

// start of Two
// typeHash: 0x77c6e1e7e1d1129b4fdedfc65dafaa8750ded70925366f0affe6b7810159d8d0
// function: onTwo(address,bytes24)
case 3 {
  let headSize := 64
  let typeLen := 0
  let txPtr := 192
  let endOfSlot := add(txPtr, 64)

  txPtr := 224
  // typeHash of Two
  mstore(0, 0x77c6e1e7e1d1129b4fdedfc65dafaa8750ded70925366f0affe6b7810159d8d0)
  // bytes24 Two.foo
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(24, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 64)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe2731e9065bfc18a9c7f69e7a6867a7f82cde8f020a5ce133145365666409bd7)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(160, 0xb03ea316)
  mstore(192, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(188, sub(endOfSlot, 156))
}
// end of Two

// start of Three
// typeHash: 0x23d7901f8f4acc235b537472803fbd0dc6f82e142474eeb2599357dad41be78b
// function: onThree(address,int128)
case 4 {
  let headSize := 64
  let typeLen := 0
  let txPtr := 192
  let endOfSlot := add(txPtr, 64)

  txPtr := 224
  // typeHash of Three
  mstore(0, 0x23d7901f8f4acc235b537472803fbd0dc6f82e142474eeb2599357dad41be78b)
  // int128 Three.foo
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, not(1))
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 64)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe2731e9065bfc18a9c7f69e7a6867a7f82cde8f020a5ce133145365666409bd7)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(160, 0xf8acbe4a)
  mstore(192, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(188, sub(endOfSlot, 156))
}
// end of Three

// start of ShouldRevert
// typeHash: 0x80f9bf8b254264ac90316e3db438be37aae46fa06a6620ea2f5d6cc2417e420f
// function: onShouldRevert(address,uint256)
case 5 {
  let headSize := 64
  let typeLen := 0
  let txPtr := 192
  let endOfSlot := add(txPtr, 64)

  txPtr := 224
  // typeHash of ShouldRevert
  mstore(0, 0x80f9bf8b254264ac90316e3db438be37aae46fa06a6620ea2f5d6cc2417e420f)
  // uint256 ShouldRevert.shouldRevertWithString
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 64)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe2731e9065bfc18a9c7f69e7a6867a7f82cde8f020a5ce133145365666409bd7)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(160, 0x5326eb17)
  mstore(192, mload(128))

  mstore(endOfSlot, sub(gasBefore, gas()))
  return(188, sub(endOfSlot, 156))
}
// end of ShouldRevert
default { }
}

      let nextOffset, success, inOffset, inSize := _parseTransaction(0)
    }
  }
}
