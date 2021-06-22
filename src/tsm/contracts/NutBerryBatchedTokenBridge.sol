// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './NutBerryTokenBridge.sol';

/// @notice Draft - do not use
contract NutBerryBatchedTokenBridge is NutBerryTokenBridge {
  /// @dev Batch deposits of tokens.
  /// functionSig: 0x24dbce54
  /// Layout is
  /// <20 bytes token address>
  /// <2 bytes number of transfers for this token>
  /// numOfTransfers x <20 bytes owner, 32 bytes amountOrId>
  /// ..repeat...
  /// the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,
  function batchDeposit () external {
    uint256 pending = pendingHeight() + 1;
    _setPendingHeight(pending);

    uint24 maxBlockSize = MAX_BLOCK_SIZE();
    bytes32 blockHash;
    assembly {
      // 32 bytes nonce
      mstore(128, pending)
      let blockSize := add(28, calldatasize())
      if gt(blockSize, maxBlockSize) {
        revert(0, 0)
      }
      calldatacopy(160, 4, sub(calldatasize(), 4))
      blockHash := keccak256(128, blockSize)
    }
    _setBlockHash(pending, blockHash);
    emit BlockBeacon();

    // now transfer the tokens
    assembly {
      let numOfTransfers := 0
      let token := 0
      let tokenType := 0

      for { let i := 4 } lt(i, calldatasize()) {} {
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

        // transferFrom
        mstore(0, 0x23b872dd)
        mstore(32, owner)
        mstore(64, address())
        mstore(96, amountOrId)
        if iszero( call(gas(), token, 0, 28, 100, 0, 32) ) {
          // ERR_TRANSFER_FROM
          revert(0, 0)
        }
        let transferRetVal := mload(0)
        if iszero(tokenType) {
          // default to ERC-20
          tokenType := 1

          // ownerOf(amountOrId)
          mstore(0, 0x6352211e)
          mstore(32, amountOrId)
          let success := staticcall(60000, token, 28, 36, 0, 32)
          if and(success, eq(returndatasize(), 32)) {
            // assume NFT
            tokenType := 2
          }
        }
        if and( eq(tokenType, 1), iszero(transferRetVal) ) {
          // not NFT and zero return value
          // ERR_ERC20_TRANSFER
          revert(0, 0)
        }
      }

      // we are done
      stop()
    }
  }

  /// @dev Batch withdraw of tokens.
  /// functionSig: 0x8b38e59a
  /// Layout is
  /// <20 bytes token address>
  /// <2 bytes number of transfers for this token>
  /// <1 byte tokenType; 0 = ERC-20, 1 = ERC-721>
  /// if tokenType == 1
  ///   numOfTransfers x <20 bytes owner, 32 bytes nftId>
  /// else
  ///   numOfTransfers x <20 bytes owner>
  /// ..repeat...
  function batchWithdraw () external {
    assembly {
      let numOfTransfers := 0
      let token := 0
      let tokenType := 0

      for { let i := 4 } lt(i, calldatasize()) {} {
        if iszero(numOfTransfers) {
          // initialize new `section`
          token := shr(96, calldataload(i))
          i := add(i, 20)
          numOfTransfers := shr(240, calldataload(i))
          i := add(i, 2)
          tokenType := byte(0, calldataload(i))
          i := add(i, 1)
        }
        numOfTransfers := sub(numOfTransfers, 1)

        let owner := shr(96, calldataload(i))
        i := add(i, 20)
        let amountOrId := 0

        switch tokenType
        case 2 {
          // nft - tokenId
          amountOrId := calldataload(i)
          i := add(i, 32)
          // exit - ERC-721
          mstore(0, 0xed93405f54628300c204dec35dc26ea0937dddc7eef817a80d167cf6034b6abe)
          mstore(32, token)
          mstore(64, amountOrId)
          let key := keccak256(0, 96)


          if iszero(eq(sload(key), owner)) {
            // skip if owner does not match
            continue
          }

          // clear owner
          sstore(key, 0)
          // transferFrom
          mstore(0, 0x23b872dd)
          mstore(32, address())
          mstore(64, owner)
          mstore(96, amountOrId)
          if iszero( call(gas(), token, 0, 28, 100, 0, 0) ) {
            // ERR_TRANSFER_FROM
            revert(0, 0)
          }
        }
        default {
          // exit - ERC-20
          mstore(0, 0x409d98be992cf6feb2d0dd08517cea5626d092a062b587294f77c8867ee9ecae)
          mstore(32, token)
          mstore(64, owner)
          let key := keccak256(0, 96)
          amountOrId := sload(key)

          if iszero(amountOrId) {
            // skip this exit
            continue
          }

          // set exit balance to zero
          sstore(key, 0)
          // use transfer() for ERC-20's instead of transferFrom,
          // some token contracts check for allowance even if caller() == owner of tokens
          mstore(0, 0xa9059cbb)
          mstore(32, owner)
          mstore(64, amountOrId)
          let success := call(gas(), token, 0, 28, 68, 0, 32)
          if iszero(success) {
            revert(0, 0)
          }
          if returndatasize() {
            if iszero(mload(0))  {
              // ERR_TRANSFER_ERC20
              revert(0, 0)
            }
          }
        }
      }

      // done
      stop()
    }
  }
}
