import ethers from 'ethers';

import TransactionBuilder from '../lib/TransactionBuilder.js';
import TYPED_DATA from './typedData.js';

const { CodegenTestDebug } = Artifacts;

describe('TransactionBuilder', async () => {
  const privateKey = ethers.utils.keccak256(Buffer.from('cow'));
  const signer = new ethers.Wallet(privateKey);
  const signingKey = signer._signingKey();
  const address = signer.address.toLowerCase();
  const { alice } = getDefaultWallets();
  let contract;

  before(async () => {
    contract = await deploy(CodegenTestDebug, alice)
  });

  let logs = [];
  afterEach(function () {
    while (logs.length) {
      console.log('\t', logs.shift());
    }
  });

  describe('encoding/decoding/abi', () => {
    const fixtures = [
      {
        message: {
          from: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'.toLowerCase(),
            foo: {
              'identifier': 'bla',
            }
          },
          to: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'.toLowerCase(),
            foo: {
              'identifier': 'coffe',
            }
          },
          contents: 'Hello, Bob!',
        },
        primaryType: 'Mail',
        size: 142,
      },
      {
        message: {
          from: {
            name: 'Cow',
            wallet: '0x0000000000000000000000000000000000000000',
            foo: {
              'identifier': 'bla',
            }
          },
          to: {
            name: 'Bob',
            wallet: '0x0000000000000000000000000000000000000000',
            foo: {
              'identifier': 'coffe',
            }
          },
          contents: '\u0e21 🙂',
        },
        primaryType: 'Mail',
        size: 101,
      },
      {
        message: {
          to: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'.toLowerCase(),
          nonce: 1,
          data: '0xf00ba7'
        },
        primaryType: 'Transaction',
        size: 93,
      },
      {
        message: {
          data: '0xf00ba7',
          to: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'.toLowerCase(),
          u256: 1,
          u8: 0,
          i8: -4,
          b20: '0xf1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1',
        },
        primaryType: 'TypeTest',
        size: 118,
      },
      {
        message: {
          data: '0x0000000000000000000000000000000000000000000000000000000000000000',
          to: '0xf1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1',
          u256: BigInt.asUintN(255, '-1'),
          u8: 0xff,
          i8: -127,
          b20: '0x0000000000000000000000000000000000000000',
        },
        primaryType: 'TypeTest',
        size: 159,
      },
      {
        message: {
          data: '0x'.padEnd((31 << 10) * 2, 'a')
        },
        primaryType: 'Foo',
        size: 31810,
      },
    ];

    for (const tx of fixtures) {
      it(`${tx.primaryType}`, async () => {
        const builder = new TransactionBuilder(TYPED_DATA);
        const sig = signingKey.signDigest(builder.sigHash(tx));
        tx.v = sig.v;
        tx.r = sig.r;
        tx.s = sig.s;
        tx.from = signer.address.toLowerCase();

        const encoded = builder.encode(tx);
        const decoded = builder.decode(encoded);

        logs.push({ encodedSize: encoded.length });

        assert.deepEqual(decoded.primaryType, tx.primaryType);
        assert.deepEqual(decoded.message, tx.message);
        const { from, v, r, s, primaryType, message, size } = decoded;
        assert.deepEqual({ from, v, r, s, primaryType, message, size }, tx);

        const functionSig = builder.functionSigs[tx.primaryType];
        const types = ['address'];
        const values = [signer.address];

        for (const field of builder.fieldNames[tx.primaryType]) {
          let fieldValue = tx.message;
          for (const p of field.parent) {
            fieldValue = fieldValue[p];
          }
          fieldValue = fieldValue[field.name];

          types.push(field.type);
          values.push(fieldValue);
        }

        const params = [
          {
            to: contract.address ,
            data: '0x' + encoded.map(v => (v | 0).toString(16).padStart(2, '0')).join(''),
          },
          'latest'
        ];
        // TODO: also submit a transaction to get coverage
        await (await alice.sendTransaction(params[0])).wait();

        let res = await alice.provider.send('eth_call', params);
        const gas = BigInt(`0x${res.slice(-64)}`);
        logs.push({gas});

        res = res.slice(0, -64);
        const coder = new ethers.utils.AbiCoder();
        const abiEncoded = functionSig + coder.encode(types, values).replace('0x', '');

        assert.equal(res, abiEncoded, 'contract abi encoding should match');
        assert.equal(
          '0x' + builder.encodeCall(tx).map(v => (v | 0).toString(16).padStart(2, '0')).join(''),
          abiEncoded,
          'client abi encoding should match'
        );
      });
    }
  });

  it('Encode and Decode: TypeTest()', async () => {
    const tx = {
      message: {
        data: '0xf00ba7',
        to: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'.toLowerCase(),
        u256: 1,
        u8: 0,
        i8: -4,
        b20: '0xf1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1',
      },
      primaryType: 'TypeTest',
    };
    const builder = new TransactionBuilder(TYPED_DATA);
    const sig = signingKey.signDigest(builder.sigHash(tx));
    tx.v = sig.v;
    tx.r = sig.r;
    tx.s = sig.s;
    tx.from = signer.address.toLowerCase();
    tx.hash = '0xc74fa66aef86b7d249aeb08696def683c570dfe4af1d6af6d0aa4d8374a1c480';
    tx.size = 118;

    const encoded = builder.encode(tx);
    const decoded = builder.decode(encoded);

    logs.push({ encodedSize: encoded.length });

    assert.deepEqual(decoded.primaryType, tx.primaryType);
    assert.deepEqual(decoded.message, tx.message);
    assert.deepEqual(decoded, tx);
  });

  // this is redundant but keep this to check if the transaction hash changes
  it('EIP-712 reference test', async () => {
    const TYPED_DATA = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' }
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' },
        ],
      },
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      },
      primaryTypes: ['Mail'],
    };
    const tx = {
      primaryType: 'Mail',
      message: {
        from: {
          name: 'Cow',
          wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        },
        to: {
          name: 'Bob',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
        contents: 'Hello, Bob!',
      },
    };

    const builder = new TransactionBuilder(TYPED_DATA);
    const sig = signingKey.signDigest(builder.sigHash(tx));

    assert.equal(builder.encodeType('Mail'), 'Mail(Person from,Person to,string contents)Person(string name,address wallet)');
    assert.equal(builder.typeHashes['Mail'], '0xa0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2');
    assert.equal(
      builder.structHash(tx.primaryType, tx.message),
      '0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e',
    );
    assert.equal(
      builder.domainStructHash,
      '0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f',
    );
    assert.equal(builder.sigHash(tx), '0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2');
    assert.equal(address, '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826');
    assert.equal(sig.v, 28);
    assert.equal(sig.r, '0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d');
    assert.equal(sig.s, '0x07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b91562');
  });

  it('NutBerry Transaction', async () => {
    const TYPED_DATA = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
        ],
        Transaction: [
          { name: 'to', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
      domain: {
        name: 'NutBerry',
        version: '2',
      },
      primaryTypes: ['Transaction'],
    };
    const tx = {
      primaryType: 'Transaction',
      message: {
        to: '0x0000000000000000000000000000000000000000',
        nonce: 1,
        data: '0xff',
      },
    };

    const builder = new TransactionBuilder(TYPED_DATA);
    const sig = signingKey.signDigest(builder.sigHash(tx));

    assert.equal(builder.encodeType('Transaction'), 'Transaction(address to,uint256 nonce,bytes data)');
    assert.equal(builder.typeHashes['Transaction'], '0x174ead53e7b62242b648b7bb2a954244aaa3af2f55517ec670f9801d2dea09e5');
    assert.equal(
      builder.structHash(tx.primaryType, tx.message),
      '0x6d1292e9b567b1f102a3653a2d385be4639fab820137e23e05023ec1805d0420',
    );
    assert.equal(
      builder.domainStructHash,
      '0x0f74ffb7207f25d4ae678c8841affcefd13e0c34b475ef7dd5773791690ba137',
    );
    assert.equal((builder.sigHash(tx)), '0x0d33b96e30302183f805ae9ec33a35a312c729e5bb2dfbfac544b00f97f71335');
  });

  it('Invalid transaction type',  async () => {
    const tx = {
      primaryType: 'Transaction',
      message: {
        to: '0x0000000000000000000000000000000000000000',
        nonce: 1,
        data: '0xff',
      },
    };
    const builder = new TransactionBuilder(TYPED_DATA);
    const sig = signingKey.signDigest(builder.sigHash(tx));
    tx.v = sig.v;
    tx.r = sig.r;
    tx.s = sig.s;

    const encoded = builder.encode(tx);
    const params = [
      {
        to: contract.address ,
        // only submit v, r, s and a 0xff byte
        data: '0x' + encoded.slice(0, 65).map(v => (v | 0).toString(16).padStart(2, '0')).join('') + 'ff',
      },
      'latest'
    ];

    // should succeed and do nothing
    await (await alice.sendTransaction(params[0])).wait();
  });
});
