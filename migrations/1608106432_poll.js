const Polling = artifacts.require("Polling");

module.exports = async function (deployer, networks, accounts) {
  await deployer.deploy(Polling);

  //test
  const pollInstance = await Polling.deployed();
  console.log({ address: pollInstance.address })

  let expiredBlock = 0;
  const sponsor = accounts[0];

  expiredBlock += 10000;
  await pollInstance.sponsorCreatePoll('topic_1', 'description_1', expiredBlock, {
    from: sponsor,
  })

  expiredBlock += 10000;
  await pollInstance.sponsorCreatePoll('topic_2', 'description_2', expiredBlock, {
    from: sponsor,
  })

  expiredBlock += 10000;
  await pollInstance.sponsorCreatePoll('topic_3', 'description_3', expiredBlock, {
    from: sponsor,
  })
};

