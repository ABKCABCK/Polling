// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.0;

contract Polling {
    struct Poll {
        string topic;
        string description;
        uint256 expiredBlock;
        address sponsor;
        address[] voters;
    }
    // track poll by poll id
    mapping(bytes32 => Poll) public polls;
    // track poll id for sponsors
    mapping(address => bytes32[]) public pollIdOfSponsor;
    mapping(address => mapping(bytes32 => bool)) private sponsorRaised;
    // track poll id being polled by voter
    mapping(address => bytes32[]) public pollIdOfVoter;
    mapping(address => mapping(bytes32 => bool)) private voterPolled;

    uint256 public totalPollsCount;
    bytes32[] public pollList;

    constructor() public {
        totalPollsCount = 0;
    }

    function sponsorCreatePoll(
        string calldata _topic,
        string calldata _description,
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
        _poll.description = _description;
        _poll.expiredBlock = _expiredBlock;
        _poll.sponsor = _sponsor;

        polls[_pollId] = _poll;
        pollIdOfSponsor[_sponsor].push(_pollId);
        sponsorRaised[_sponsor][_pollId] = true;

        pollList.push(_pollId);

        return true;
    }

    function voterPolls(bytes32 _pollId) external returns (bool) {
        require(polls[_pollId].sponsor != address(0), "Poll isn't existed");

        (, bool _expired) = getPollStatus(_pollId);
        require(!_expired, "Poll is expired");

        address _voter = msg.sender;
        require(!voterPolled[_voter][_pollId], "You've polled for this");

        Poll storage _poll = polls[_pollId];

        _poll.voters.push(_voter);
        pollIdOfVoter[_voter].push(_pollId);
        voterPolled[_voter][_pollId] = true;
        return true;
    }

    function getPollInformation(bytes32 _pollId)
        public
        view
        returns (
            string memory _topic,
            string memory _description,
            address _sponsor,
            address[] memory _voters,
            uint256 _blockLeft,
            bool _expired
        )
    {
        Poll memory poll = polls[_pollId];

        _topic = poll.topic;
        _description = poll.description;
        _sponsor = poll.sponsor;
        _voters = poll.voters;
        (_blockLeft, _expired) = getPollStatus(_pollId);
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
        return pollIdOfVoter[msg.sender];
    }

    function isVoted(bytes32 _pollId) public view returns (bool) {
        return voterPolled[msg.sender][_pollId];
    }
}
