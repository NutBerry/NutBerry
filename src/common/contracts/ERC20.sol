// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

contract ERC20 {
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Deposit(address indexed from, uint256 value);
  event Withdrawal(address indexed from, uint256 value);

  uint256 _totalSupply = 0;
  mapping (address => uint) _balances;
  mapping (address => mapping (address => uint)) _allowances;
  bool _ret;
  bool _lock;
  address _owner;

  constructor () {
    _owner = msg.sender;
    _ret = true;
    _balances[msg.sender] = uint256(-1);
  }

  function deposit () public payable {
    _balances[msg.sender] += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

  function withdraw (uint256 value) public {
    require(_balances[msg.sender] >= value);
    _balances[msg.sender] -= value;
    msg.sender.transfer(value);
    emit Withdrawal(msg.sender, value);
  }

  function ret (bool v) public {
    require(msg.sender == _owner);
    _ret = v;
  }

  function lock (bool v) public {
    require(msg.sender == _owner);
    _lock = v;
  }

  function name () public virtual view returns (string memory) {
    return 'Foo';
  }

  function symbol () public virtual view returns (string memory) {
    return 'FOO';
  }

  function decimals () public virtual view returns (uint8) {
    return 18;
  }

  function totalSupply () public virtual view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf (address account) public virtual view returns (uint256) {
    return _balances[account];
  }

  function allowance (address account, address spender) public virtual view returns (uint256) {
    return _allowances[account][spender];
  }

  function _mint (address account, uint256 amount) internal {
    require(account != address(0), 'mint address zero');

    uint256 oldValue = _totalSupply;
    uint256 newValue = _totalSupply + amount;
    // overflow check
    require(newValue > oldValue, 'overflow mint');
    _totalSupply = newValue;

    oldValue = _balances[account];
    newValue = oldValue + amount;
    // overflow check
    require(newValue > oldValue, 'overflow mint2');
    _balances[account] = newValue;

    emit Transfer(address(0), account, amount);
  }

  function approve (address spender, uint256 value) public virtual returns (bool) {
    _allowances[msg.sender][spender] = value;

    emit Approval(msg.sender, spender, value);

    return true;
  }

  function _transferFrom (address from, address to, uint256 value) internal virtual returns (bool) {
    if (_lock) {
      revert();
    }

    require(value != 0, 'zero value');

    uint256 balance = _balances[from];

    require(balance >= value, 'balance');
    _balances[from] = balance - value;

    if (to == address(0)) {
      // burn
      balance = _totalSupply;
      require(balance >= value, 'burn');

      _totalSupply = balance - value;
    } else {
      balance = _balances[to];
      uint256 newBalance = balance + value;
      // overflow check
      require(newBalance > balance, 'overflow');

      _balances[to] = newBalance;
    }

    emit Transfer(from, to, value);

    return _ret;
  }

  function transfer (address to, uint256 value) public virtual returns (bool) {
    return _transferFrom(msg.sender, to, value);
  }

  function transferFrom (address from, address to, uint256 value) public virtual returns (bool) {
    uint256 __allowance = _allowances[from][msg.sender];

    if (from != msg.sender && __allowance != uint256(-1)) {
      require(__allowance >= value, 'allowance');
      _allowances[from][msg.sender] = __allowance - value;
    }

    return _transferFrom(from, to, value);
  }
}
