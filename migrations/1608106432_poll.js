const Polling = artifacts.require("Polling");

module.exports = async function (deployer, networks, accounts) {
  await deployer.deploy(Polling);

  //test

  if (networks === 'ropsten' || networks === 'development') {
    // if (networks === 'development') {
      const pollInstance = await Polling.deployed();
    console.log({ address: pollInstance.address })

    let expiredBlock = await web3.eth.getBlockNumber();

    let TEST_OPTION = [
      '~100',
      '101~200',
      '201~300',
      '300~',
    ].map(e=>web3.utils.utf8ToHex(e))

    const sponsor = accounts[0];

    expiredBlock += 10000;
    await pollInstance.sponsorRaisesAPoll('Annual Income(T)', 'What\'s your annual income?(In thousand)', TEST_OPTION, expiredBlock, {
      from: sponsor,
    })

    expiredBlock += 10000;
    await pollInstance.sponsorRaisesAPoll('Annual Income(M)', 'What\'s your annual income?(In million)', TEST_OPTION, expiredBlock, {
      from: sponsor,
    })

    // expiredBlock += 10000;
    // await pollInstance.sponsorRaisesAPoll('Annual Income(B)', 'What\'s your annual income?(In billion)', TEST_OPTION, expiredBlock, {
    //   from: sponsor,
    // })
  }
};

