// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import 'src/tsm/contracts/NutBerryTokenBridge.sol';
import 'src/v1/contracts/NutBerryFlavorV1.sol';
import './V1TestOneChallenge.sol';

contract V1TestOne is NutBerryFlavorV1, V1TestOneChallenge {
  function submitCustomBlock (uint256, uint256) external {
    _createBlockMessage();
  }

  // ERC-20
  function _BALANCES_KEY (address token, address account) internal returns (uint256 ret) {
    assembly {
      mstore(0, token)
      mstore(32, account)
      ret := keccak256(0, 64)
    }
  }

  // ERC-721
  function _OWNERS_KEY (address token, uint256 tokenId) internal returns (uint256 ret) {
    assembly {
      mstore(0, token)
      mstore(32, tokenId)
      ret := keccak256(0, 64)
    }
  }

  function _NONCE_KEY (address a) internal returns (uint256 ret) {
    assembly {
      mstore(0, 0xacacac)
      mstore(32, a)
      ret := keccak256(0, 64)
    }
  }

  function _increment (uint256 k, uint256 v) internal {
    _sstore(k, _sload(k) + v);
  }

  function _incrementNonce (address a) internal {
    _increment(_NONCE_KEY(a), 1);
    NutBerryCore._setStorageL1(bytes32(uint256(a)), 1);
  }

  function owners (address token, uint256 tokenId) public returns (address) {
    return address(_sload(_OWNERS_KEY(token, tokenId)));
  }

  function balances (address token, address account) public returns (uint256) {
    return _sload(_BALANCES_KEY(token, account));
  }

  function nonces (address account) public returns (uint256) {
    return _sload(_NONCE_KEY(account));
  }

  /// @dev State transition when a user deposits a token.
  function onDeposit (address owner, address token, uint256 value, uint256 tokenType) external {
    // all power the core protocol
    require(msg.sender == address(this));

    if (NutBerryTokenBridge._getTokenType(token) == 0) {
      NutBerryTokenBridge._setTokenType(token, tokenType);
    }

    if (tokenType == 1) {
      _increment(_BALANCES_KEY(token, owner), value);
    } else {
      _sstore(_OWNERS_KEY(token, value), uint(owner));
    }
  }

  event Message(bytes data);

  function onCustomBlockBeacon (bytes memory data) external {
    require(msg.sender == address(this));

    _storeCallDataHash();
    _sstore(uint256(keccak256(data)), _getTime());
    emit Message(data);
  }

  function _storeCallDataHash () internal {
    uint ptr;
    uint hash;
    assembly {
      let size := calldatasize()
      // that becomes more work on L1 (challenge)
      if origin() {
        // < usual calldata... >
        // < 32 bytes timestamp >
        // < read witnesses... - each 32 bytes >
        // < # of witness elements - 32 bytes>
        // < write witnesses - each 32 bytes >
        // < # of witness elements - 32 bytes >
        size := sub(calldatasize(), 32)
        // load the length of nElements and sub
        size := sub(size, mul(32, calldataload(size)))
        // points to the start of `write witnesses`
        size := sub(size, 32)
        // points at `# read witnesses` and subtracts
        size := sub(size, mul(32, calldataload(size)))
        // sub again (block timestamp)
        size := sub(size, 32)
      }

      ptr := mload(64)
      calldatacopy(ptr, 0, size)
      hash := keccak256(ptr, size)
      log1(0, 0, hash)
    }

    _sstore(hash, ptr);
  }

  function onExit (address msgSender, address token, uint256 value) external {
    // all power the core protocol
    require(msg.sender == address(this));
    _storeCallDataHash();
    _incrementNonce(msgSender);

    if (NutBerryTokenBridge._getTokenType(token) == 1) {
      _incrementExit(token, msgSender, value);
    } else {
      _setERC721Exit(token, msgSender, value);
    }

    assembly {
      let ptr := 0
      let size := 32

      mstore(ptr, token)
      log0(ptr, size)
      ptr := add(ptr, size)

      mstore(ptr, value)
      log0(ptr, size)
    }
  }

  function onTransfer (address msgSender, address to, address token, uint256 value) external {
    // all power the core protocol
    require(msg.sender == address(this));
    _storeCallDataHash();
    _incrementNonce(msgSender);

    assembly {
      let ptr := 0
      let size := 32

      mstore(ptr, to)
      log0(ptr, size)
      ptr := add(ptr, size)

      mstore(ptr, token)
      log0(ptr, size)
      ptr := add(ptr, size)

      mstore(ptr, value)
      log0(ptr, size)
    }
  }

  function onOne (address msgSender, bytes memory one, uint256 nonce, bytes memory two) external {
    // all power the core protocol
    require(msg.sender == address(this));
    _storeCallDataHash();
    _incrementNonce(msgSender);

    assembly {
      let ptr := mload(64)
      let size := 32

      size := mload(one)
      log0(add(one, 32), size)

      size := 32
      mstore(ptr, nonce)
      log0(ptr, size)

      size := mload(two)
      log0(add(two, 32), size)
    }
  }

  function onTwo (address msgSender, bytes24 foo) external {
    require(msg.sender == address(this));
    _storeCallDataHash();
    _incrementNonce(msgSender);

    uint tmp;
    assembly {
      let ptr := mload(64)
      let size := 32

      mstore(ptr, foo)
      log0(ptr, size)

      tmp := keccak256(0, 32)
    }

    for (uint i = 0; i < 3000; i++) {
      _sstore(0x4411, tmp);
    }
  }

  function onThree (address msgSender, int128) external {
    require(msg.sender == address(this));
    _storeCallDataHash();
    _incrementNonce(msgSender);

    uint tmp = 0;
    for (uint i = 0; i < 0xff; i++) {
      uint _now = _getTime();
      if (_now < 1623777000 || _now > 2623777000) {
        revert();
      }
      tmp += _now;
    }
    _sstore(0x9241, tmp);

    assembly {
      mstore(0, calldataload(36))
      log0(0, 32)
    }
  }

  function onShouldRevert (address, uint256 shouldRevertWithString) external {
    require(msg.sender == address(this));
    if (shouldRevertWithString == 0) {
      revert();
    }
    revert('hello world');
  }

  function signalUpgradeTo (address newImplementation) external {
    emit NutBerryCore.RollupUpgrade(newImplementation);
  }
}
