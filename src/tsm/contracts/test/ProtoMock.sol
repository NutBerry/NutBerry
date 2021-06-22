// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './../NutBerryTokenBridge.sol';

contract ProtoMock is NutBerryTokenBridge {
  function onChallenge () external returns (uint256) {
    assembly {
      if eq( calldataload(100), not(0) ) {
        revert(0, 0)
      }

      mstore(0, calldatasize())
      return(0, 32)
    }
  }

  function onFinalizeSolution (uint256 blockNumber, bytes32 hash) external {
  }
}
