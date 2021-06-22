export default {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
    ],
    Transfer: [
      { name: 'to', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    Exit: [
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    One: [
      { name: 'foo', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
      { name: 'bar', type: 'bytes' },
    ],
    Two: [
      { name: 'foo', type: 'bytes24' },
    ],
    Three: [
      { name: 'foo', type: 'int128' },
    ],
    ShouldRevert: [
      { name: 'shouldRevertWithString', type: 'uint256' },
    ],
  },
  domain: {
    name: 'V1TestOne',
    version: '1',
  },
  primaryTypes: [
    'Transfer',
    'Exit',
    'One',
    'Two',
    'Three',
    'ShouldRevert',
  ],
}
