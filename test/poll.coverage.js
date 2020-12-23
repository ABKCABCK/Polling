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

    TEST_OPTION = TEST_OPTION.map(e => {
      // return web3.utils.hexToBytes(web3.utils.utf8ToHex(e));
      return web3.utils.utf8ToHex(e);
    })
  })

  it("should successfully raise a poll", async function () {

    let pollList, pollIdOfSponsor;

    pollList = await pollContractInstance.getPollList();
    pollIdOfSponsor = await pollContractInstance.getSponsorsPollList({ from: testSponsor });
    assert.strictEqual(pollList.length, 0, "Polling Contract: invalid poll list length before first polling");
    assert.strictEqual(pollIdOfSponsor.length, 0, "Polling Contract: invalid poll length of sponsor before first polling");

    let tx = await pollContractInstance.sponsorRaisesAPoll(
      TEST_TOPIC,
      TEST_DESCRIPTION,
      TEST_OPTION,
      testExpiredBlock,
      { from: testSponsor }
    );

    

    pollList = await pollContractInstance.getPollList();
    pollIdOfSponsor = await pollContractInstance.getSponsorsPollList({ from: testSponsor });
    assert.strictEqual(pollList.length, 1, "Polling Contract: invalid poll list length after first polling");
    assert.strictEqual(pollIdOfSponsor.length, 1, "Polling Contract: invalid poll length of sponsor ar after third polling");

    truffleAssert.eventEmitted(tx, "Raised", (ev)=>{
      return ev._sponsor === testSponsor && ev._pollId === pollList[0];
    }, "Polling Contract: should return correct raising event")

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
      pollContractInstance.sponsorRaisesAPoll(
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
    return assert.strictEqual(pollList.length, 1, "Polling Contract: invalid poll list length after failing to create a poll");
  });

  it("should successfully vote to a poll", async function () {

    let pollId = finalPollList[0];

    let status, pollIdOfVoter, option, isVoted, selected;

    status = await pollContractInstance.getPollInformation(pollId);
    pollIdOfVoter = await pollContractInstance.getVotersPollList({ from: testVoter });
    assert.strictEqual(status._voters.length, 0, "Polling Contract: invalid voter length of poll before first voting at 0");
    assert.strictEqual(pollIdOfVoter.length, 0, "Polling Contract: invalid poll length of voter before first voting at 0");

    option = TEST_OPTION[0];
    let tx = await pollContractInstance.voterVotesAPoll(
      pollId, option,
      { from: testVoter }
    );

    let paddedOption = option + "0".repeat(66-option.length);
    truffleAssert.eventEmitted(tx, "Voted", (ev)=>{
      return ev._voter === testVoter && ev._pollId === pollId && ev._option === paddedOption;
    }, "Polling Contract: should return correct voting event");

    status = await pollContractInstance.getPollInformation(pollId);
    pollIdOfVoter = await pollContractInstance.getVotersPollList({ from: testVoter });
    isVoted = await pollContractInstance.isVoted(pollId, { from: testVoter });
    selected = await pollContractInstance.getVotersOption(pollId, { from: testVoter });
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length of poll after first voting at 0");
    assert.strictEqual(pollIdOfVoter.length, 1, "Polling Contract: invalid poll length of voter after first voting at 0");
    assert.isTrue(isVoted, "Polling Contract: should be true");
    assert.strictEqual(selected, paddedOption, "Polling Contract: unmatched option of test voter");

    let pollVoters = await pollContractInstance.getPollVoters(pollId, option)
    assert.strictEqual(pollVoters[0], testVoter, "Polling Contract: unmatched voter of the option");
    

  });

  it("should fail to vote again", async function () {
    truffleAssert.fails(
      pollContractInstance.voterVotesAPoll(
        finalPollList[0], TEST_OPTION[0],
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "You've polled for this",
      "Polling Contract: should not be voted again at 0",
    );

    let status = await pollContractInstance.getPollInformation(finalPollList[0]);
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length at 0");

  });

  it("should fail to vote inexisted option", async function () {
    truffleAssert.fails(
      pollContractInstance.voterVotesAPoll(
        finalPollList[0], TEST_OPTION[0] + "123",
        { from: accounts[9] }
      ),
      truffleAssert.ErrorType.REVERT,
      "Poll doesn't have such option",
      "Polling Contract: should not be voted to an inexisted option",
    );

    let status = await pollContractInstance.getPollInformation(finalPollList[0]);
    assert.strictEqual(status._voters.length, 1, "Polling Contract: invalid voter length at 0");
  });

  it("should fail to vote an expired option", async function () {

    const _blockNumber = (await web3.eth.getBlockNumber()) + 2;
    await pollContractInstance.sponsorRaisesAPoll(
      TEST_TOPIC,
      TEST_DESCRIPTION,
      TEST_OPTION,
      _blockNumber,
      { from: testSponsor }
    );

    let pollList = await pollContractInstance.getPollList();

    truffleAssert.fails(
      pollContractInstance.voterVotesAPoll(
        pollList[1], TEST_OPTION[0],
        { from: accounts[9] }
      ),
      truffleAssert.ErrorType.REVERT,
      "Poll is expired",
      "Polling Contract: should not be voted to an expired option",
    );

    let status = await pollContractInstance.getPollInformation(pollList[1]);
    assert.strictEqual(status._voters.length, 0, "Polling Contract: invalid voter length at 0");
  });

  it("should fail to vote a inexisted poll", async function () {
    truffleAssert.fails(
      pollContractInstance.voterVotesAPoll(
        "0x7e313030", TEST_OPTION[0],
        { from: testVoter }
      ),
      truffleAssert.ErrorType.REVERT,
      "Poll isn't existed",
      "Polling Contract: inexisted poll should not be voted",
    );

  });
});
