// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './ERC20.sol';
import './ERC721.sol';


contract TestContract {
  address public constant SPENDER_ADDR = 0xF3beAC30C498D9E26865F34fCAa57dBB935b0D74;

  mapping (address => uint256) public deposits;

  event BlockBeacon();
  event TestEvent(address indexed addr, uint256 val);
  event TestEvent2(address indexed addr, uint256 indexed val);
  event TestEvent3(address indexed addr, uint256 indexed val, bool indexed);

  function test (address tokenAddr, address[] memory receivers, uint[] memory amounts) public {
    ERC20 token = ERC20(tokenAddr);

    for (uint i = 0; i < receivers.length; i++) {
      token.transferFrom(receivers[i], receivers[i], amounts[i]);
      require(token.balanceOf(receivers[i]) >= amounts[i]);
    }
  }

  function testERC20 (address tokenAddr, address alice, address bob, uint256 /*value*/) public {
    ERC20 token = ERC20(tokenAddr);
    uint _balance = token.balanceOf(alice);
    uint _allowance = token.allowance(alice, address(this));
    require(_balance > 0 && _allowance > 0 && _allowance <= _balance);
    token.transferFrom(alice, bob, _allowance);
    require(token.balanceOf(alice) == _balance - _allowance);
    require(token.allowance(alice, address(this)) == 0);
    require(token.balanceOf(bob) >= _allowance);
    _balance = _allowance - 1;
    token.transfer(alice, _balance);
    token.transfer(address(uint160(address(this)) - 1), 1);
    emit TestEvent(bob, _balance);
    emit TestEvent2(bob, _balance);
    emit TestEvent3(bob, _balance, true);
    emit BlockBeacon();
    assembly {
      mstore(0, 0xbadbeef)
      log0(0, 0)
      log0(4, 0)
      log0(0, 32)
      log0(4, 34)
      log0(0, 34)
      log0(31, 144)
      log1(0, 0, 0xc0ffebabe)
      log1(4, 0, 0xc0ffebabe)
      log1(0, 32, 0xc0ffebabe)
      log1(4, 34, 0xc0ffebabe)
      log1(0, 34, 0xc0ffebabe)
      log1(31, 144, 0xc0ffebabe)
      log2(0, 0, 0xc0ffebabe, 0xa)
      log2(4, 0, 0xc0ffebabe, 0xa)
      log2(0, 32, 0xc0ffebabe, 0xa)
      log2(4, 34, 0xc0ffebabe, 0xb)
      log2(0, 34, 0xc0ffebabe, 0xc)
      log2(31, 144, 0xc0ffebabe, 0xd)
      log3(0, 0, 0xc0ffebabe, 0xa, 0xa)
      log3(4, 0, 0xc0ffebabe, 0xa, 0xa)
      log3(0, 32, 0xc0ffebabe, 0xa, 0xa)
      log3(4, 34, 0xc0ffebabe, 0xb, 0xa)
      log3(0, 34, 0xc0ffebabe, 0xc, 0xa)
      log3(31, 144, 0xc0ffebabe, 0xd, 0xa)
      log4(0, 0, 0xc0ffebabe, 0xa, 0xa, 0x1)
      log4(4, 0, 0xc0ffebabe, 0xa, 0xa, 0x1)
      log4(0, 32, 0xc0ffebabe, 0xa, 0xa, 0x1)
      log4(4, 34, 0xc0ffebabe, 0xb, 0xa, 0x2)
      log4(0, 34, 0xc0ffebabe, 0xc, 0xa, 0x5)
      log4(31, 144, 0xc0ffebabe, 0xd, 0xa, 0x9)
    }
  }

  function testERC721 (address tokenAddr, address alice, address bob, uint256 tokenId) public {
    ERC721 token = ERC721(tokenAddr);
    address owner = token.ownerOf(tokenId);
    require(owner == alice);
    require(token.getApproved(tokenId) == address(this));
    token.transferFrom(alice, bob, tokenId);
  }

  function storageLoad (uint256 key) public view returns (uint256) {
    assembly {
      mstore(0, sload(key))
      return(0, 32)
    }
  }

  function storageStore (uint256 key, uint256 value) public {
    assembly {
      sstore(key, value)
    }
  }

  function deposit (address addr, uint256 value, address other) public {
    require(address(this) == other);
    ERC20 token = ERC20(addr);
    token.transferFrom(msg.sender, address(this), value);
    deposits[msg.sender] += value;
  }

  function withdraw (address addr, address other) public {
    require(address(this) == other);
    ERC20 token = ERC20(addr);
    uint256 value = deposits[msg.sender];
    deposits[msg.sender] = 0;
    token.transfer(msg.sender, value + 1);
  }

  function ping () public view returns (address) {
    return address(this);
  }

  function testRipemd160 () public returns (bytes20) {
    bytes memory data = new bytes(128);
    return ripemd160(data);
  }

  function partialFail (address tokenAddr, address alice, address bob) public {
    ERC20 token = ERC20(tokenAddr);
    token.transferFrom(alice, bob, 1);
    uint256 balance = token.balanceOf(bob);
    emit TestEvent(bob, balance);
    emit TestEvent2(bob, balance);
    emit TestEvent3(bob, balance, true);
    emit BlockBeacon();
    if (msg.sender == alice) {
      revert();
    }
  }

  function balanceOf (address target, address owner) public returns (uint256) {
    ERC20 token = ERC20(target);
    return token.balanceOf(owner);
  }

  function allowance (address target, address owner, address spender) public returns (uint256) {
    ERC20 token = ERC20(target);
    return token.allowance(owner, spender);
  }

  function ownerOf (address target, uint256 tokenId) public returns (address) {
    ERC721 token = ERC721(target);
    return token.ownerOf(tokenId);
  }

  function getApproved (address target, uint256 tokenId) public returns (address) {
    ERC721 token = ERC721(target);
    return token.getApproved(tokenId);
  }

  function approve (address target, address spender, uint256 value) public {
    ERC20 token = ERC20(target);
    token.approve(spender, value);
  }

  function transfer (address target, address to, uint256 value) public {
    ERC20 token = ERC20(target);
    token.transfer(to, value);
  }

  function transferFrom (address target, address from, address to, uint256 value) public {
    ERC20 token = ERC20(target);
    token.transferFrom(from, to, value);
  }

  function submitBlock (address bridge) external payable {
    assembly {
      let size := sub(calldatasize(), 36)
      calldatacopy(0, 36, size)
      let success := call(gas(), bridge, callvalue(), 0, size, 0, 0)
      if iszero(success) {
        revert(0, 0)
      }
    }
  }

  function testGAS () public {
    uint256 val;
    assembly {
      val := gas()
    }
    if (val != uint256(-1)) {
      revert();
    }
  }

  function doLoop (uint256 rounds) public {
    while (rounds-- != 0) {
      assembly {
        log1(0, 0, rounds)
      }
    }
  }

  // 0xaf6b0a80
  function testContractCalls (address) public {
    assembly {
      if eq(sload(0), 1) {
        log3(0, 0, caller(), address(), origin())
        sstore(1, add(sload(1), 1))

        if eq(sload(3), 1) {
          invalid()
        }

        if eq(sload(4), 1) {
          revert(0, 32)
        }
        stop()
      }
      if iszero(calldataload(4)) {
        log3(0, 0, caller(), address(), origin())
        stop()
      }

      mstore(0, shl(224, 0xaf6b0a80))
      sstore(0, 1)
      mstore(32, 0)
      let success := call(gas(), address(), callvalue(), 0, 36, 0, 32)
      let ctr := add(1, sload(1))
      sstore(1, ctr)
      mstore(32, ctr)
      log3(0, 64, success, returndatasize(), ctr)

      mstore(32, 0)
      success := delegatecall(gas(), calldataload(4), 0, 36, 0, 32)
      ctr := add(1, sload(1))
      sstore(1, ctr)
      mstore(32, ctr)
      log3(0, 64, success, returndatasize(), ctr)

      mstore(32, 0)
      success := callcode(gas(), calldataload(4), callvalue(), 0, 36, 0, 32)
      ctr := add(1, sload(1))
      sstore(1, ctr)
      mstore(32, ctr)
      log3(0, 64, success, returndatasize(), ctr)

      mstore(32, 0)
      success := staticcall(gas(), address(), 0, 36, 0, 32)
      ctr := add(1, sload(1))
      sstore(1, ctr)
      mstore(32, ctr)
      log3(0, 64, success, returndatasize(), ctr)

      sstore(3, 1)
      mstore(32, 0)
      success := delegatecall(gas(), calldataload(4), 0, 36, 0, 32)
      ctr := add(1, sload(1))
      sstore(1, ctr)
      mstore(32, ctr)
      log3(0, 64, success, returndatasize(), ctr)

      sstore(3, 0)
      sstore(4, 1)
      mstore(32, 0)
      success := delegatecall(gas(), calldataload(4), 0, 36, 0, 32)
      ctr := add(1, sload(1))
      sstore(1, ctr)
      mstore(32, ctr)
      log3(0, 64, success, returndatasize(), ctr)

      sstore(4, 0)
      mstore(0, shl(224, 0xaf6b0a80))
      mstore(32, 0)
      success := call(gas(), calldataload(4), callvalue(), 0, 36, 0, 32)
      ctr := add(1, sload(1))
      sstore(1, ctr)
      mstore(32, ctr)
      log3(0, 64, success, returndatasize(), ctr)
    }
  }

  function testPlayground (uint256 y) external {
    assembly {
      for { let i := 0 } lt(i, y) { i := add(i, 1) } {
        log1(0, 0, blockhash(sub(number(), i)))
      }
    }
  }

  function testTimestamp () external {
    assembly {
      log1(0, 0, timestamp())
    }
  }

  function testChainId () external {
    assembly {
      log1(0, 0, chainid())
    }
  }

  function testContractCreation () external {
    assembly {
      // return
      mstore(0, 0x600b380380600b593936f3363434373634f30000000000000000000000000000)
      let addr := create(0, 0, 32)
      log1(0, 0, addr)
      log1(0, 0, returndatasize())

      // revert
      mstore(0, 0x600b380380600b593936fd363434373634f30000000000000000000000000000)
      addr := create(0, 0, 32)
      log1(0, 0, addr)
      log1(0, 0, returndatasize())
    }
  }
}
