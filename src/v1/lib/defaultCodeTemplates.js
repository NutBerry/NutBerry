import TransactionBuilder from './TransactionBuilder.js';
import codegen from './codegen.js'
import { VERIFY_UNIFORM, UPDATE_UNIFORM } from '../../bbt/template.js';

export default async function ({ typedData, contractName }) {
  const builder = new TransactionBuilder(typedData);
  const _challengeCode = codegen(builder, { debug: false });
  const _debugCode = codegen(builder, { debug: true });
  const challengeCode =
`
// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

/// @dev Autogenerated file. Do not edit manually.
contract ${contractName}Challenge {
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
      ${_challengeCode}

      ${VERIFY_UNIFORM}
      ${UPDATE_UNIFORM}

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
`;

  const debugCode =
`
// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

contract ${contractName}Debug {
  fallback () external {
    assembly {
      ${_debugCode}
      let nextOffset, success, inOffset, inSize := _parseTransaction(0)
    }
  }
}
`;

  return { builder, challengeCode, debugCode };
}
