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

    struct OptionResult {
        address[] voters;
        bool registered;
    }

    // track poll by poll id
    mapping(bytes32 => Poll) private polls;
    bytes32[] private pollList;
    mapping(bytes32 => mapping(bytes32 => OptionResult)) private optionResults;
    // track poll id for sponsors and voters
    mapping(address => bytes32[]) public pollIdOfSponsor;
    mapping(address => bytes32[]) public pollIdOfVoter;
    // track poll status and option of voters
    mapping(address => mapping(bytes32 => bytes32)) private optionOfVoter;
    mapping(address => mapping(bytes32 => bool)) private voterPolled;
    
    uint256 public totalPollsCount;


    // event
    event Raised(address indexed _sponsor, bytes32 _pollId);
    event Voted(address indexed _voter, bytes32 _pollId, bytes32 _option);

    constructor() public {
        totalPollsCount = 0;
    }

    function sponsorRaisesAPoll(
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

        Poll memory _poll;
        _poll.topic = _topic;
        _poll.sponsor = _sponsor;
        _poll.description = _description;
        _poll.options = _options;
        _poll.expiredBlock = _expiredBlock;

        polls[_pollId] = _poll;
        pollIdOfSponsor[_sponsor].push(_pollId);

        for (uint i=0; i<_options.length; i++) {
            optionResults[_pollId][_options[i]].registered = true;
        }

        pollList.push(_pollId);

        emit Raised(_sponsor, _pollId);
        return true;
    }

    function voterVotesAPoll(bytes32 _pollId, bytes32 _option) external returns (bool) {
        require(polls[_pollId].sponsor != address(0), "Poll isn't existed");
        require(optionResults[_pollId][_option].registered, "Poll doesn't have such option");
        require(!isPollExpired(_pollId), "Poll is expired");

        address _voter = msg.sender;
        require(!voterPolled[_voter][_pollId], "You've polled for this");

        polls[_pollId].voters.push(_voter);
        voterPolled[_voter][_pollId] = true;
        
        pollIdOfVoter[_voter].push(_pollId);
        optionOfVoter[_voter][_pollId] =_option;

        optionResults[_pollId][_option].voters.push(_voter);

        emit Voted(_voter, _pollId, _option);

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
        _expired = isPollExpired(_pollId);
    }

    function getPollList() public view returns (bytes32[] memory) {
        return pollList;
    }

    function getPollVoters(bytes32 _pollId, bytes32 _option) public view returns (address[] memory) {
        return optionResults[_pollId][_option].voters;
    }

    function getSponsorsPollList() public view returns (bytes32[] memory) {
        return pollIdOfSponsor[msg.sender];
    }

    function getVotersPollList() public view returns (bytes32[] memory) {
        return pollIdOfVoter[msg.sender];
    }

    function getVotersOption(bytes32 _pollId) public view returns (bytes32) {
        return optionOfVoter[msg.sender][_pollId];
    }

    function isPollExpired(bytes32 _pollId) public view returns (bool) {
        return (block.number >= polls[_pollId].expiredBlock);
    }

    function isVoted(bytes32 _pollId) public view returns (bool) {
        return voterPolled[msg.sender][_pollId];
    }

    function isOptionBelongToPoll(bytes32 _pollId, bytes32 _option) public view returns (bool) {
        return optionResults[_pollId][_option].registered;
    }
}
