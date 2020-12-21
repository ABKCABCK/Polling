const Polling = artifacts.require("Polling");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

const truffleAssert = require('truffle-assertions');

contract("Polling", function (accounts) {
  const TEST_TOPIC = "TEST_TOPIC";
  const TEST_DESCRIPTION = "TEST_DESCRIPTION";
  let TEST_OPTION = [
    '~100',
    '101~200',
    '201~300',
    '300~',
  ]

  let testSponsor, testVoter, testExpiredBlock;
  let pollContractInstance;
  let finalPollList;


  before(async () => {
    testSponsor = accounts[0];
    testVoter = accounts[1];
    testExpiredBlock = 999999999;

    pollContractInstance = await Polling.deployed();
    console.log({
      contractAddress: pollContractInstance.address,
      testSponsor,
      testVoter,
      testExpiredBlock,
    })

    TEST_OPTION = TEST_OPTION.map(e => {
      // return web3.utils.hexToBytes(web3.utils.utf8ToHex(e));
      return web3.utils.utf8ToHex(e);
    })

    console.log({ TEST_OPTION })
  })

  it("should successfully create a poll", async function () {

    let pollList, pollIdOfSponsor;

    pollList = await pollContractInstance.getPollList();
    pollIdOfSponsor = await pollContractInstance.getSponsorsPollList({ from: testSponsor });
    assert.strictEqual(pollList.length, 0, "Polling Contract: invalid poll list length before first polling");
    assert.strictEqual(pollIdOfSponsor.length, 0, "Polling Contract: invalid poll length of sponsor before first polling");

    await pollContractInstance.sponsorCreatePoll(
      TEST_TOPIC,
      TEST_DESCRIPTION,
      TEST_OPTION,
      testExpiredBlock,
      { from: testSponsor }
    );

    pollList = await pollContractInstance.getPollList();
    pollIdOfSponsor = await pollContractInstance.getSponsorsPollList({ from: testSponsor });
    assert.strictEqual(pollList.length, 1, "Polling Contract: invalid poll list length after first polling");
    assert.strictEqual(pollIdOfSponsor.length, 1, "Polling Contract: invalid poll length of sponsor after first polling");

    await pollContractInstance.sponsorCreatePoll(
      TEST_TOPIC,
      TEST_DESCRIPTION,
      TEST_OPTION,
      testExpiredBlock,
      { from: testSponsor }
    );

    pollList = await pollContractInstance.getPollList();
    pollIdOfSponsor = await pollContractInstance.getSponsorsPollList({ from: testSponsor });
    assert.strictEqual(pollList.length, 2, "Polling Contract: invalid poll list length after second polling");
    assert.strictEqual(pollIdOfSponsor.length, 2, "Polling Contract: invalid poll length of sponsor after second polling");

    await pollContractInstance.sponsorCreatePoll(
      TEST_TOPIC,
      TEST_DESCRIPTION,
      TEST_OPTION,
      testExpiredBlock,
      { from: accounts[3] }
    );

    pollList = await pollContractInstance.getPollList();
    pollIdOfSponsor = await pollContractInstance.getSponsorsPollList({ from: accounts[3] });
    assert.strictEqual(pollList.length, 3, "Polling Contract: invalid poll list length after third polling");
    assert.strictEqual(pollIdOfSponsor.length, 1, "Polling Contract: invalid poll length of sponsor after third polling");

    let registryStatus = await pollContractInstance.isOptionBelongToPoll(pollList[0], TEST_OPTION[0])
    assert.isTrue(registryStatus, "Polling Contract: should be true");
    registryStatus = await pollContractInstance.isOptionBelongToPoll(pollList[0], TEST_OPTION[1])
    assert.isTrue(registryStatus, "Polling Contract: should be true");
    registryStatus = await pollContractInstance.isOptionBelongToPoll(pollList[0], TEST_OPTION[2])
    assert.isTrue(registryStatus, "Polling Contract: should be true");
    registryStatus = await pollContractInstance.isOptionBelongToPoll(pollList[0], TEST_OPTION[3])
    assert.isTrue(registryStatus, "Polling Contract: should be true");
    registryStatus = await pollContractInstance.isOptionBelongToPoll(pollList[0], TEST_OPTION[3] + "123")
    assert.isFalse(registryStatus, "Polling Contract: should be false");
    finalPollList = pollList;
    return true;
  });

  it("should fail to create a poll", async function () {
    truffleAssert.fails(
      pollContractInstance.sponsorCreatePoll(
        TEST_TOPIC,
        TEST_DESCRIPTION,
        TEST_OPTION,
        1,
        { from: testSponsor }
      ),
      truffleAssert.ErrorType.REVERT,
      "Invalid expired block",
      "Polling Contract: should provide correct expired block number",
    );

    let pollList = await pollContractInstance.getPollList();
    return assert.strictEqual(pollList.length, 3, "Polling Contract: invalid poll list length after failing to create a poll");
  });

  it("should successfully vote to a poll", async function () {

    let pollId = finalPollList[0];

    let status, pollIdOfVoter, choice, isVoted, selected;

    status = await pollContractInstance.getPollInformation(pollId);
    choice = TEST_OPTION[0];
    pollIdOfVoter = await pollContractInstance.getVotersPollList({ from: testVoter });
    // assert.strictEqual(status._voters, undefined, "Polling Contract: invalid voter length of poll before first voting at 0");
    assert.strictEqual(pollIdOfVoter.length, 0, "Polling Contract: invalid poll length of voter before first voting at 0");

    await pollContractInstance.voterPolls(
      pollId, choice,
      { from: testVoter }
    );
    status = await pollContractInstance.getPollInformation(pollId);
    pollIdOfVoter = await pollContractInstance.getVotersPollList({ from: testVoter });
    isVoted = await pollContractInstance.isVoted(pollId, { from: testVoter });
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length of poll after first voting at 0");
    assert.strictEqual(pollIdOfVoter.length, 1, "Polling Contract: invalid poll length of voter after first voting at 0");
    assert.isTrue(isVoted, "Polling Contract: should be true");

    await pollContractInstance.voterPolls(
      pollId, choice,
      { from: accounts[2] }
    );
    status = await pollContractInstance.getPollInformation(pollId);
    pollIdOfVoter = await pollContractInstance.getVotersPollList({ from: accounts[2] });
    isVoted = await pollContractInstance.isVoted(pollId, { from: accounts[2] });
    assert.strictEqual(status._voters.length, 2, "Polling Contract: invalid voter length of poll after second voting at 0");
    assert.strictEqual(pollIdOfVoter.length, 1, "Polling Contract: invalid poll length of voter after second voting at 0");
    assert.isTrue(isVoted, "Polling Contract: should be true");

    pollId = finalPollList[1];
    choice = TEST_OPTION[1];

    await pollContractInstance.voterPolls(
      pollId, choice,
      { from: testVoter }
    );
    status = await pollContractInstance.getPollInformation(pollId);
    pollIdOfVoter = await pollContractInstance.getVotersPollList({ from: testVoter });
    isVoted = await pollContractInstance.isVoted(pollId, { from: testVoter });
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length of poll after first voting at 1");
    assert.strictEqual(pollIdOfVoter.length, 2, "Polling Contract: invalid poll length of voter after first voting at 1");
    assert.isTrue(isVoted, "Polling Contract: should be true");

    pollId = finalPollList[2];
    choice = TEST_OPTION[2];

    await pollContractInstance.voterPolls(
      pollId, choice,
      { from: testVoter }
    );
    status = await pollContractInstance.getPollInformation(pollId);
    pollIdOfVoter = await pollContractInstance.getVotersPollList({ from: testVoter });
    isVoted = await pollContractInstance.isVoted(pollId, { from: testVoter });
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length of poll after first voting at 1");
    assert.strictEqual(pollIdOfVoter.length, 3, "Polling Contract: invalid poll length of voter after first voting at 1");
    assert.isTrue(isVoted, "Polling Contract: should be true");

    return true;
  });

  it("should fail to vote again", async function () {
    truffleAssert.fails(
      pollContractInstance.voterPolls(
        finalPollList[0], TEST_OPTION[0],
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "You've polled for this",
      "Polling Contract: should not be voted again at 0",
    );

    truffleAssert.fails(
      pollContractInstance.voterPolls(
        finalPollList[1], TEST_OPTION[1],
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "You've polled for this",
      "Polling Contract: should not be voted again at 1",
    );

    truffleAssert.fails(
      pollContractInstance.voterPolls(
        finalPollList[1], TEST_OPTION[1] + "123",
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "Poll doesn't have such choice",
      "Polling Contract: inexisted option should not be choiced",
    );

    truffleAssert.fails(
      pollContractInstance.voterPolls(
        finalPollList[2], TEST_OPTION[2],
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "You've polled for this",
      "Polling Contract: should not be voted again at 2",
    );

    let status;

    status = await pollContractInstance.getPollInformation(finalPollList[0]);
    assert.strictEqual(status._voters.length, 2, "Polling Contract: invalid voter length at 0");

    status = await pollContractInstance.getPollInformation(finalPollList[1]);
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length at 1");

    status = await pollContractInstance.getPollInformation(finalPollList[2]);
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length at 2");

  });

  it("should fail to vote a inexisted poll", async function () {
    truffleAssert.fails(
      pollContractInstance.voterPolls(
        "0xfoobar", TEST_OPTION[0],
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "Poll isn't existed",
      "Polling Contract: inexisted poll should not be voted",
    );

    truffleAssert.fails(
      pollContractInstance.voterPolls(
        undefined, TEST_OPTION[0],
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "Poll isn't existed",
      "Polling Contract: inexisted poll should not be voted",
    );

  });

});
