// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.0;

contract Polling {
    struct Poll {
        string topic;
        address sponsor;
        string description;
        bytes32[] options;
        uint256 expiredBlock;
        address[] voters;
    }

    struct Answer {
        bytes32 pollId;
        bytes32 choice;
    }
    // track poll by poll id
    mapping(bytes32 => Poll) public polls;
    // track poll id for sponsors
    mapping(address => bytes32[]) public pollIdOfSponsor;
    mapping(address => mapping(bytes32 => bool)) private sponsorRaised;
    // track poll id being polled by voter
    mapping(address => Answer[]) public answerOfVoter;
    // mapping(address => bytes32[]) public pollIdOfVoter;
    mapping(address => mapping(bytes32 => bool)) private voterPolled;
    mapping(bytes32 => mapping(bytes32 => bool)) private optionRegistry;

    uint256 public totalPollsCount;
    bytes32[] public pollList;

    constructor() public {
        totalPollsCount = 0;
    }

    function sponsorCreatePoll(
        string calldata _topic,
        string calldata _description,
        bytes32[] calldata _options,
        uint256 _expiredBlock
    ) external returns (bool) {
        require(_expiredBlock > block.number, "Invalid expired block");

        address _sponsor = msg.sender;

        uint256 _totalPollsCount = totalPollsCount;
        totalPollsCount += 1;

        bytes32 _pollId = keccak256(
            abi.encodePacked(_sponsor, _totalPollsCount, _topic, _expiredBlock)
        );

        require(!sponsorRaised[_sponsor][_pollId], "Poll is existed");

        Poll memory _poll;
        _poll.topic = _topic;
        _poll.sponsor = _sponsor;
        _poll.description = _description;
        _poll.options = _options;
        _poll.expiredBlock = _expiredBlock;

        polls[_pollId] = _poll;
        pollIdOfSponsor[_sponsor].push(_pollId);
        sponsorRaised[_sponsor][_pollId] = true;

        for (uint i=0; i<_options.length; i++) {
            optionRegistry[_pollId][_options[i]] = true;
        }

        pollList.push(_pollId);

        return true;
    }

    function voterPolls(bytes32 _pollId, bytes32 _choice) external returns (bool) {
        require(polls[_pollId].sponsor != address(0), "Poll isn't existed");
        require(optionRegistry[_pollId][_choice], "Poll doesn't have such choice");
        (, bool _expired) = getPollStatus(_pollId);
        require(!_expired, "Poll is expired");

        address _voter = msg.sender;
        require(!voterPolled[_voter][_pollId], "You've polled for this");

        polls[_pollId].voters.push(_voter);
        // pollIdOfVoter[_voter].push(_pollId);
        voterPolled[_voter][_pollId] = true;

        Answer memory answer = Answer({
            pollId: _pollId,
            choice: _choice
        });
        answerOfVoter[_voter].push(answer);
        return true;
    }

    function getPollInformation(bytes32 _pollId)
        public
        view
        returns (
            string memory _topic,
            string memory _description,
            address _sponsor,
            bytes32[] memory _options,
            address[] memory _voters,
            uint256 _expiredBlock,
            bool _expired
        )
    {
        Poll memory poll = polls[_pollId];

        _topic = poll.topic;
        _description = poll.description;
        _sponsor = poll.sponsor;
        _options = poll.options;
        _voters = poll.voters;
        _expiredBlock = poll.expiredBlock;
        (, _expired) = getPollStatus(_pollId);
    }

    function getPollStatus(bytes32 _pollId)
        internal
        view
        returns (uint256 _blockLeft, bool _expired)
    {
        int256 blockLeft = int256(block.number - polls[_pollId].expiredBlock);
        _blockLeft = blockLeft <= 0 ? 0 : uint256(blockLeft);
        _expired = block.number >= polls[_pollId].expiredBlock;
    }

    function getPollList() public view returns (bytes32[] memory) {
        return pollList;
    }

    function getSponsorsPollList() public view returns (bytes32[] memory) {
        return pollIdOfSponsor[msg.sender];
    }

    function getVotersPollList() public view returns (bytes32[] memory) {
        uint _l = answerOfVoter[msg.sender].length;
        bytes32[] memory _pollList = new bytes32[](_l);
        for (uint i=0; i<_l; i++) {
            _pollList[i] = answerOfVoter[msg.sender][i].pollId;
        }
        return _pollList;
    }

    function isVoted(bytes32 _pollId) public view returns (bool) {
        return voterPolled[msg.sender][_pollId];
    }

    function isOptionBelongToPoll(bytes32 _pollId, bytes32 _choice) public view returns (bool) {
        return optionRegistry[_pollId][_choice];
    }
}
