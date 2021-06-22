// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './../NutBerryBatchedTokenBridge.sol';

contract ProtoBatchMock is NutBerryBatchedTokenBridge {
  function onChallenge () external returns (uint256) {
    assembly {
      let numOfTransfers := 0
      let token := 0
      let tokenType := 0
      let blockDataStart := sub(calldatasize(), calldataload(68))
      // skip nonce
      blockDataStart := add(blockDataStart, 32)

      for { let i := blockDataStart } lt(i, calldatasize()) {} {
        if iszero(numOfTransfers) {
          // initialize new `section`
          tokenType := 0
          token := shr(96, calldataload(i))
          i := add(i, 20)
          numOfTransfers := shr(240, calldataload(i))
          i := add(i, 2)
        }
        numOfTransfers := sub(numOfTransfers, 1)

        let owner := shr(96, calldataload(i))
        i := add(i, 20)
        let amountOrId := calldataload(i)
        i := add(i, 32)

        if iszero(tokenType) {
          // default to ERC-20
          tokenType := 1

          // ownerOf(amountOrId)
          mstore(0, 0x6352211e)
          mstore(32, amountOrId)
          let success := staticcall(60000, token, 28, 36, 0, 0)
          if and(success, eq(returndatasize(), 32)) {
            // assume NFT
            tokenType := 2
          }
        }

        switch tokenType
        case 1 {
          // set exit - ERC-20
          mstore(0, 0x409d98be992cf6feb2d0dd08517cea5626d092a062b587294f77c8867ee9ecae)
          mstore(32, token)
          mstore(64, owner)
          let hash := keccak256(0, 96)
          sstore( hash, add( sload(hash), amountOrId) )
        }
        case 2 {
          // set exit - ERC-721
          mstore(0, 0xed93405f54628300c204dec35dc26ea0937dddc7eef817a80d167cf6034b6abe)
          mstore(32, token)
          mstore(64, amountOrId)
          sstore( keccak256(0, 96), owner )
        }
        default {
          revert(0, 0)
        }
      }

      mstore(0, not(0))
      return(0, 32)
    }
  }

  function onFinalizeSolution (uint256 blockNumber, bytes32 hash) external {
  }
}
