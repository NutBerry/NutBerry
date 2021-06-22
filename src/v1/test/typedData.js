export default {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Transaction: [
      { name: 'to', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    Cyborg: [
      { name: 'identifier', type: 'string' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
      { name: 'foo', type: 'Cyborg' }
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
    ],
    TypeTest: [
      { name: 'data', type: 'bytes' },
      { name: 'to', type: 'address' },
      { name: 'u256', type: 'uint256' },
      { name: 'u8', type: 'uint8' },
      { name: 'i8', type: 'int8' },
      { name: 'b20', type: 'bytes20' },
    ],
    Foo: [
      { name: 'data', type: 'bytes' },
    ],
  },
  domain: {
    name: 'Ether Mail',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  primaryTypes: ['Mail', 'Transaction', 'TypeTest', 'Foo'],
}; 
