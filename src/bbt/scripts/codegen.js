#!/usr/bin/env node

import fs from 'fs';
import { VERIFY_UNIFORM, UPDATE_UNIFORM }from '../template.js';

const TEMPLATE =
`\
// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

contract BalancedBinaryTree {
  function verify (uint256 rootHash, uint256[] calldata data) external view returns (bool, bool, uint) {
    assembly {
      ${VERIFY_UNIFORM}

      let end := add(data.offset, data.length)
      for { let ptr := data.offset } lt(ptr, end) {} {
        let key := calldataload(ptr)
        ptr := add(ptr, 32)
        let proofElements := calldataload(ptr)
        ptr := add(ptr, 32)
        let a, b, c := verifyUniform(ptr, proofElements, key, rootHash)
        mstore(0, a)
        mstore(32, b)
        mstore(64, c)

        ptr := add(ptr, mul(proofElements, 32))
      }

      return(0, 96)
    }
  }

  function calculateNewRoot (uint256 _newValue, uint256[] calldata proof) external view returns (uint256) {
    assembly {
      ${UPDATE_UNIFORM}

      let ptr := proof.offset
      let key := calldataload(ptr)
      ptr := add(ptr, 32)
      let nElements := calldataload(ptr)
      ptr := add(ptr, 32)
      let ret  := updateTree(ptr, nElements, key, _newValue)
      mstore(0, ret)
      return(0, 32)
    }
  }
}
`;

const baseDir = import.meta.url.split('/').slice(2, -2).join('/');
fs.writeFileSync(`${baseDir}/contracts/BalancedBinaryTree.sol`, TEMPLATE);
