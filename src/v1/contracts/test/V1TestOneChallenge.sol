
// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

/// @dev Autogenerated file. Do not edit manually.
contract V1TestOneChallenge {
  /// @dev Challenge the solution or just verify the next pending block directly.
  /// calldata layout:
  /// < 4 bytes function sig >
  /// < 32 bytes challenge offset >
  /// < 32 bytes address of challenge handler - contract (self) >
  /// < 32 bytes size of block >
  /// < 32 bytes number of challenge rounds >
  /// < arbitrary witness data >
  /// < data of block >
  function onChallenge () external returns (uint256) {
    // all power the core protocol
    require(msg.sender == address(this));

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

  inOffset := 316
  inSize := sub(endOfSlot, 316)
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

  inOffset := 252
  inSize := sub(endOfSlot, 252)
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

  inOffset := 316
  inSize := sub(endOfSlot, 316)
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

  inOffset := 188
  inSize := sub(endOfSlot, 188)
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

  inOffset := 188
  inSize := sub(endOfSlot, 188)
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

  inOffset := 188
  inSize := sub(endOfSlot, 188)
}
// end of ShouldRevert
default { }
}


      
// verifies a proof
function verifyUniform (proofOffset, len, key, root) -> valid, inTree, value {
  let _k := 0
  let _v := 0
  let ret := 0

  if len {
    // if # of proof elements are greather than 0 and less than 2, revert
    if lt(len, 2) {
      revert(0, 0)
    }

    _k := calldataload(proofOffset)
    proofOffset := add(proofOffset, 32)
    _v := calldataload(proofOffset)
    proofOffset := add(proofOffset, 32)

    if _v {
      // leafHash
      // left, right = key, value
      inTree := eq(key, _k)
      
  // hash leaf
  mstore(0, _k)
  mstore(32, _v)
  mstore(64, 1)
  ret := keccak256(0, 96)
  // end of hash leaf

    }
  }

  // it is not used anyway if it underflows (see loop)
  let depth := sub(len, 2)

  for { let i := 2 } lt(i, len) { i:= add(i, 1) } {
    depth := sub(depth, 1)
    let bitmask := shl(depth, 1)
    let goLeft := and(key, bitmask)
    let next := calldataload(proofOffset)
    proofOffset := add(proofOffset, 32)

    
  // hash branch
  switch goLeft
  case 0 {
    mstore(0, next)
    mstore(32, ret)
  }
  default {
    mstore(0, ret)
    mstore(32, next)
  }
  ret := keccak256(0, 64)
  // end of hash branch

  }

  valid := eq(ret, root)
  if iszero(valid) {
    inTree := 0
  }
  if inTree {
    value := _v
  }
}

      
function updateTree (ptr, len, key, newValue) -> ret {
  let _k := 0
  let _v := 0

  if newValue {
    // insert or update
    // hash leaf
    
  // hash leaf
  mstore(0, key)
  mstore(32, newValue)
  mstore(64, 1)
  ret := keccak256(0, 96)
  // end of hash leaf

  }

  if len {
    if lt(len, 2) {
      // invalid proof
      revert(0, 0)
    }

    _k := calldataload(ptr)
    ptr := add(ptr, 32)
    _v := calldataload(ptr)
    ptr := add(ptr, 32)

    // _v != 0 && key != _k
    if and(iszero(iszero(_v)), iszero(eq(key, _k))) {
      // Update and create a new branch.
      // Compare against the key of the other leaf and loop until diverge.
      // Then create a new branch(es).

      // minus [_k, _v]
      let depth := sub(len, 2)
      for {} true {} {
        let bitmask := shl(depth, 1)
        let goLeft := and(key, bitmask)
        let otherLeft := and(_k, bitmask)

        if eq(goLeft, otherLeft) {
          // key and _k are still on the same path, go deeper
          depth := add(depth, 1)
          continue
        }

        let other
        
  // hash leaf
  mstore(0, _k)
  mstore(32, _v)
  mstore(64, 1)
  other := keccak256(0, 96)
  // end of hash leaf

        
  // hash branch
  switch goLeft
  case 0 {
    mstore(0, other)
    mstore(32, ret)
  }
  default {
    mstore(0, ret)
    mstore(32, other)
  }
  ret := keccak256(0, 64)
  // end of hash branch

        break
      }

      // now, walk back and hash each new branch with a zero-neighbor.
      let odepth := sub(len, 2)
      for {} iszero(eq(depth, odepth)) {} {
        depth := sub(depth, 1)
        let bitmask := shl(depth, 1)
        let goLeft := and(key, bitmask)

        
  // hash branch
  switch goLeft
  case 0 {
    mstore(0, 0)
    mstore(32, ret)
  }
  default {
    mstore(0, ret)
    mstore(32, 0)
  }
  ret := keccak256(0, 64)
  // end of hash branch

      }
    }
  }

  // use the supplied proofs and walk back to the root (TM)
  // minus [_k, _v]
  let depth := sub(len, 2)
  for { let i := 2 } lt(i, len) {} {
    depth := sub(depth, 1)

    let bitmask := shl(depth, 1)
    let goLeft := and(key, bitmask)
    let next := calldataload(ptr)
    ptr := add(ptr, 32)
    i := add(i, 1)

    
  // hash branch
  switch goLeft
  case 0 {
    mstore(0, next)
    mstore(32, ret)
  }
  default {
    mstore(0, ret)
    mstore(32, next)
  }
  ret := keccak256(0, 64)
  // end of hash branch

  }

  // ret contains new root
}


      // pre & post transaction verification
      function verifyTransition (blockTimestamp, __rootHash, __witnessOffset, inOffset, inSize) -> witnessOffset, rootHash {
        // setup return value
        rootHash := __rootHash
        witnessOffset := __witnessOffset

        // number of storage reads
        let nPairs := calldataload(witnessOffset)
        witnessOffset := add(witnessOffset, 32)

        // append data to the end of the transaction
        let memPtr := add(inOffset, inSize)
        mstore(memPtr, blockTimestamp)
        memPtr := add(memPtr, 32)

        for { let i := 0 } lt(i, nPairs) { i := add(i, 1) } {
          let key := calldataload(witnessOffset)
          witnessOffset := add(witnessOffset, 32)
          let nProofElements := calldataload(witnessOffset)
          witnessOffset := add(witnessOffset, 32)

          // verify key, value
          let valid, inTree, value := verifyUniform(witnessOffset, nProofElements, key, rootHash)
          if iszero(valid) {
            // invalid proof
            revert(0, 0)
          }
          witnessOffset := add(witnessOffset, mul(nProofElements, 32))

          // only store the value if the key is in the tree.
          // Consumers must take care of not introducing key collisions for L1 storage vs L2 storage.
          if inTree {
            sstore(key, value)
          }

          // store key (for calldata)
          mstore(memPtr, key)
          memPtr := add(memPtr, 32)
        }
        // write number of storage (read access) keys
        mstore(memPtr, nPairs)
        memPtr := add(memPtr, 32)

        {
          // make a copy
          // the current position of witnessOffset is the starting point in verifyPostTransition
          let witnessOffsetCopy := witnessOffset
          // storage writes (access)
          nPairs := calldataload(witnessOffsetCopy)
          if gt(nPairs, 0xff) {
            // too large
            revert(0, 0)
          }
          witnessOffsetCopy := add(witnessOffsetCopy, 32)

          let bitmap := 0
          for { let i := 0 } lt(i, nPairs) { i := add(i, 1) } {
            bitmap := or(bitmap, shl(i, 1))

            let key := calldataload(witnessOffsetCopy)
            witnessOffsetCopy := add(witnessOffsetCopy, 32)
            let nProofElements := calldataload(witnessOffsetCopy)
            witnessOffsetCopy := add(witnessOffsetCopy, 32)
            witnessOffsetCopy := add(witnessOffsetCopy, mul(nProofElements, 32))

            // only remember the keys, the proof will be verified later
            mstore(memPtr, key)
            memPtr := add(memPtr, 32)
          }
          // write number of storage (writes) keys
          mstore(memPtr, nPairs)
          memPtr := add(memPtr, 32)

          // SPECIAL_STORAGE_SLOT - store storage write access bitmap
          sstore(0xabcd, bitmap)
          // help the compiler :ouch
          pop(bitmap)
        }

        // now, start calling the function
        // if returndatasize > 0
        //   success; even if reverted
        // else
        //   - out of gas?
        //   - implementation error?
        //   - something else?
        //
        // We can't proof if a transaction failed because of an implementation error or because it is out of gas
        // Well, technically we can enforce gas limits but div by zero, jump to invalid() or something else will
        // lead to a runtime exception and burn all gas (meh -.-).
        //
        // In this case:
        // - Revert
        // The core logic has to deal with it.
        // For example, the block could be skipped and marked as invalid partly or as a whole
        // if it's not possible to proceed the challenge for some reason.
        // Otherwise, without this functionality, it would be possible that we spin here forever.
        //

        // calldataload = address of challenge contract
        let success := delegatecall(gas(), calldataload(36), inOffset, sub(memPtr, inOffset), 0, 0)
        success := or(success, returndatasize())
        switch success
        case 0 {
          revert(0, 0)
        }
        default {
          // verifyPostTransition, verification after executing a transaction

          // SPECIAL_STORAGE_SLOT - all bits must be unset
          if sload(0xabcd) {
            revert(0, 0)
          }

          // validate & clean write accesss
          nPairs := calldataload(witnessOffset)
          witnessOffset := add(witnessOffset, 32)

          for { let i := 0 } lt(i, nPairs) { i := add(i, 1) } {
            let key := calldataload(witnessOffset)
            witnessOffset := add(witnessOffset, 32)
            let nProofElements := calldataload(witnessOffset)
            witnessOffset := add(witnessOffset, 32)

            // verify proof
            let valid, inTree, value := verifyUniform(witnessOffset, nProofElements, key, rootHash)
            if iszero(valid) {
              // invalid proof
              revert(0, 0)
            }
            // calculate new state root
            rootHash := updateTree(witnessOffset, nProofElements, key, sload(key))
            // reset storage slot
            sstore(key, 0)
            witnessOffset := add(witnessOffset, mul(nProofElements, 32))
          }
        }
        // end of verifyTransition
      }

      // load the stateRoot from storage
      let rootHash := sload(0xd27f023774f5a743d69cfc4b80b1efe4be7912753677c20f45ee5464160b7d24)
      // calldatasize - blockSize
      let startOfBlock := sub(calldatasize(), calldataload(68))
      // load timestamp for this block
      let blockTimestamp := calldataload(add(startOfBlock, 64))
      // start of arbitrary witness data in calldata
      let witnessOffset := 132
      // last block offset (byte offset for block)
      let challengeOffset := calldataload(4)
      if iszero(challengeOffset) {
        // add size of block header
        challengeOffset := add(challengeOffset, 96)
      }
      // fix the calldata offset
      challengeOffset := add(challengeOffset, startOfBlock)

      // load blockType
      // 1 = Deposit
      // 2 = arbitrary submitted data - signed transactions
      // 3 = custom message
      switch calldataload(add(startOfBlock, 32))
      case 1 {
        // function onDeposit (address owner, address token, uint256 value, uint256 tokenType) external
        mstore(128, 0x62731ff1)
        // ^ assuming this will not be overwritten in the loop below

        // iterate over the block data
        let rounds := calldataload(100)
        for { } lt(challengeOffset, calldatasize()) { } {
          if iszero(rounds) {
            break
          }
          rounds := sub(rounds, 1)

          // owner
          mstore(160, shr(96, calldataload(challengeOffset)))
          challengeOffset := add(challengeOffset, 20)

          // token
          mstore(192, shr(96, calldataload(challengeOffset)))
          challengeOffset := add(challengeOffset, 20)

          // value
          mstore(224, calldataload(challengeOffset))
          challengeOffset := add(challengeOffset, 32)

          // tokenType
          mstore(256, calldataload(challengeOffset))
          challengeOffset := add(challengeOffset, 32)

          // setup & call
          witnessOffset, rootHash := verifyTransition(blockTimestamp, rootHash, witnessOffset, 156, 132)
        }
      }
      case 2 {
        // iterate over the block data and keep track of the number of rounds to do
        let rounds := calldataload(100)
        for { } lt(challengeOffset, calldatasize()) { } {
          if iszero(rounds) {
            break
          }
          rounds := sub(rounds, 1)

          let success, inOffset, inSize
          challengeOffset, success, inOffset, inSize := _parseTransaction(challengeOffset)

          switch success
          case 0 {
            // invalid tx, ignore and skip
            success := 1
            // skip [ 32 bytes readWitnessLength, 32 bytes writeWitnessLength ]
            witnessOffset := add(witnessOffset, 64)
          }
          default {
            // setup & call
            witnessOffset, rootHash := verifyTransition(blockTimestamp, rootHash, witnessOffset, inOffset, inSize)
          }
        }
        // end of blockType = 2
      }
      case 3 {
        // onCustomBlockBeacon(bytes)
        mstore(128, 0xa891fba3)
        // abi head size
        mstore(160, 32)
        // whole block data, minus header
        let sizeOfData := sub(calldatasize(), challengeOffset)
        // store length
        mstore(192, sizeOfData)
        // copy data into memory
        calldatacopy(224, challengeOffset, sizeOfData)

        // setup & call
        witnessOffset, rootHash := verifyTransition(blockTimestamp, rootHash, witnessOffset, 156, add(sizeOfData, 68))
        // done
        challengeOffset := calldatasize()
      }
      default {
        // nothing todo - finish this block
        challengeOffset := calldatasize()
      }

      // save stateRoot
      sstore(0xd27f023774f5a743d69cfc4b80b1efe4be7912753677c20f45ee5464160b7d24, rootHash)

      // return challengeOffset.
      // if >= blockSize , then this block is done
      mstore(0, sub(challengeOffset, startOfBlock))
      return(0, 32)
    }
  }
}
