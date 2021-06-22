function doHashLeaf (leftTag, rightTag, outTag) {
  return `
  // hash leaf
  mstore(0, ${leftTag})
  mstore(32, ${rightTag})
  mstore(64, 1)
  ${outTag} := keccak256(0, 96)
  // end of hash leaf
`;
}

function doHashBranch (leftTag, rightTag, outTag) {
  return `
  // hash branch
  switch goLeft
  case 0 {
    mstore(0, ${leftTag})
    mstore(32, ${rightTag})
  }
  default {
    mstore(0, ${rightTag})
    mstore(32, ${leftTag})
  }
  ${outTag} := keccak256(0, 64)
  // end of hash branch
`;
}

export const VERIFY_UNIFORM =
`
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
      ${doHashLeaf('_k', '_v', 'ret')}
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

    ${doHashBranch('next', 'ret', 'ret')}
  }

  valid := eq(ret, root)
  if iszero(valid) {
    inTree := 0
  }
  if inTree {
    value := _v
  }
}
`;

export const UPDATE_UNIFORM =
`
function updateTree (ptr, len, key, newValue) -> ret {
  let _k := 0
  let _v := 0

  if newValue {
    // insert or update
    // hash leaf
    ${doHashLeaf('key', 'newValue', 'ret')}
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
        ${doHashLeaf('_k', '_v', 'other')}
        ${doHashBranch('other', 'ret', 'ret')}
        break
      }

      // now, walk back and hash each new branch with a zero-neighbor.
      let odepth := sub(len, 2)
      for {} iszero(eq(depth, odepth)) {} {
        depth := sub(depth, 1)
        let bitmask := shl(depth, 1)
        let goLeft := and(key, bitmask)

        ${doHashBranch('0', 'ret', 'ret')}
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

    ${doHashBranch('next', 'ret', 'ret')}
  }

  // ret contains new root
}
`;
