import ethers from 'ethers';

const { ProtoBatchMock, ERC20, ERC721 } = Artifacts;

describe('batch deposit & withdraw', () => {
  const { alice } = getDefaultWallets();
  const allowance = '0xf0f1f2f3f4';
  const mints = [];
  let balanceAlice;
  let tokenValue = 0;
  let bridge, erc20, erc721;
  let depositData = '';
  let blockNum = 0;

  function getWithdrawData () {
    let withdrawData =
      erc721.address.replace('0x', '') +
      mints.length.toString(16).padStart(4, '0') +
      // tokenType
      '02';

    for (const tokenId of mints) {
      withdrawData += alice.address.replace('0x', '') + tokenId.toString(16).padStart(64, '0');
    }

    withdrawData +=
      erc20.address.replace('0x', '') +
      '0001' +
      // tokenType
      '01' +
      alice.address.replace('0x', '');

    return withdrawData;
  }

  before(async () => {
    bridge = await deploy(ProtoBatchMock, alice);
    erc20 = await deploy(ERC20, alice);
    erc721 = await deploy(ERC721, alice, 'NFT', 'NFT');
    balanceAlice = await erc20.balanceOf(alice.address);
  });

  it('allowance', async () => {
    const tx = await erc20.approve(bridge.address, allowance);
    const receipt = await tx.wait();

    const times = 60;
    let stopByte = times.toString(16).padStart(4, '0');

    depositData +=
      erc20.address.replace('0x', '') +
      stopByte;

    const amount = 42;
    for (let i = 0; i < times; i++) {
      tokenValue += amount;
      depositData +=
        alice.address.replace('0x', '') +
        amount.toString(16).padStart(64, '0');
    }
  });

  it('mint nft and approve', async () => {
    const times = 42;
    let stopByte = times.toString(16).padStart(4, '0');

    depositData +=
      erc721.address.replace('0x', '') +
      stopByte;

    for (let i = 0; i < times; i++) {
      // mint
      let tx = await erc721.mint(alice.address, i);
      let receipt = await tx.wait();
      // approve
      tx = await erc721.approve(bridge.address, i);
      receipt = await tx.wait();

      mints.push(i);
      depositData +=
        alice.address.replace('0x', '') +
        i.toString(16).padStart(64, '0');
    }
  });

  it('batchDeposit', async () => {
    const tx = await alice.sendTransaction(
      {
        to: bridge.address,
        data: '0x24dbce54' + depositData,
      }
    );
    const receipt = await tx.wait();
    console.log({ gasUsed: receipt.gasUsed.toString() });
    blockNum++;
    depositData = blockNum.toString(16).padStart(64, '0') + depositData;
  });

  it('batchDeposit > MAX_BLOCK_SIZE', async () => {
    await assertRevert(
      alice.sendTransaction(
        {
          to: bridge.address,
          data: '0x24dbce54' + ''.padStart((await bridge.MAX_BLOCK_SIZE()) * 2, 'f'),
          gasLimit: GAS_LIMIT,
        }
      )
    );
  });

  it('deposit - transferFrom fail', async () => {
    const tx = await erc20.approve(bridge.address, 0);
    const receipt = await tx.wait();

    const amount = 32;
    let data =
      erc20.address.replace('0x', '') +
      '0001' +
      alice.address.replace('0x', '') +
      amount.toString(16).padStart(64, '0');

    await assertRevert(
      alice.sendTransaction(
        {
          to: bridge.address,
          data: '0x24dbce54' + data,
          gasLimit: GAS_LIMIT,
        }
      )
    );
  });

  it('deposit - transferFrom return value zero', async () => {
    let tx = await erc20.approve(bridge.address, 0xff);
    let receipt = await tx.wait();

    // let the erc-20 return false for each transfer
    tx = await erc20.ret(false);
    receipt = await tx.wait();

    const amount = 32;
    let data =
      erc20.address.replace('0x', '') +
      '0001' +
      alice.address.replace('0x', '') +
      amount.toString(16).padStart(64, '0');

    await assertRevert(
      alice.sendTransaction(
        {
          to: bridge.address,
          data: '0x24dbce54' + data,
          gasLimit: GAS_LIMIT,
        }
      )
    );

    // restore erc-20 behaviour
    tx = await erc20.ret(true);
    receipt = await tx.wait();
  });

  it('check tokens after deposit', async () => {
    for (const tokenId of mints) {
      const owner = await erc721.ownerOf(tokenId);
      assert.equal(owner, bridge.address, 'token owner should be the bridge');
    }

    const balance = await erc20.balanceOf(bridge.address);
    assert.equal(balance.toString(), tokenValue.toString(), 'balance of bridge');
  });

  it('challenge', async () => {
    const tx = await alice.sendTransaction(
      {
        to: bridge.address,
        data: '0xd2ef7398' +
          (depositData.length / 2).toString(16).padStart(64, '0') +
          depositData,
      }
    );
    const receipt = await tx.wait();
    console.log({ gasUsed: receipt.gasUsed.toString() });
  });

  it('batchWithdraw - should fail with locked erc-20 contract', async () => {
    // let the erc-20 return false for each transfer
    let tx = await erc20.ret(false);
    let receipt = await tx.wait();

    await assertRevert(
      alice.sendTransaction(
        {
          to: bridge.address,
          data: '0x8b38e59a' + getWithdrawData(),
          gasLimit: GAS_LIMIT,
        }
      )
    );

    // restore
    tx = await erc20.ret(true);
    receipt = await tx.wait();
  });

  it('lock erc20 & erc721', async () => {
    await (await erc20.lock(true)).wait();
    await (await erc721.lock(true)).wait();
  });

  it('batchWithdraw - should throw', async () => {
    await assertRevert(
      alice.sendTransaction(
      {
        to: bridge.address,
        data: '0x8b38e59a' + getWithdrawData(),
        gasLimit: GAS_LIMIT,
      }
    )
    );
  });

  it('unlock erc20 & erc721', async () => {
    await (await erc20.lock(false)).wait();
    await (await erc721.lock(false)).wait();
  });

  it('batchWithdraw', async () => {
    const tx = await alice.sendTransaction(
      {
        to: bridge.address,
        data: '0x8b38e59a' + getWithdrawData(),
      }
    );
    const receipt = await tx.wait();
    console.log({ gasUsed: receipt.gasUsed.toString() });
  });

  it('batchWithdraw - a second time; should do nothing', async () => {
    const tx = await alice.sendTransaction(
      {
        to: bridge.address,
        data: '0x8b38e59a' + getWithdrawData(),
      }
    );
    const receipt = await tx.wait();
  });

  it('check tokens after exit', async () => {
    for (const tokenId of mints) {
      const owner = await erc721.ownerOf(tokenId);
      assert.equal(owner, alice.address, 'token owner should be alice again');
    }

    const balance = await erc20.balanceOf(alice.address);
    assert.equal(balance.toString(), balanceAlice, 'balance of alice should match');
  });
});
