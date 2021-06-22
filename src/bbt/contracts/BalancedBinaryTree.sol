// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

contract BalancedBinaryTree {
  function verify (uint256 rootHash, uint256[] calldata data) external view returns (bool, bool, uint) {
    assembly {
      
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
