---
title: 'Polling Practice'
disqus: hackmd
---

# Polling Practice

A practice of polling DAPP

# User story
---

```gherkin=
Feature: Sponsor raises a poll
  As a sponsor
  I want to raise a poll
  So that I can see the information of the poll on the page

  Scenario: A sponsor raises a poll to Ethereum
    Given the sponsor has filled in the information of the poll
    When the sponsor raises a poll
    Then the sponsor waits for creation of the poll

  Scenario: Sponsor has created the poll
    Given the sponsor has raised a poll
    When the Smart Contract transaction is confirmed and the block is mined
    Then the sponsor can see his/her poll on page
```

```gherkin=
Feature: Voter vote to a poll
  As a voter
  I want to vote to a poll
  Because I'm interesting in the topic created

  Scenario: Voter votes to a poll
    When I choose an interested choice 
    And I click "Vote" button on the poll
    Then I can raise the Smart  Contract transaction of the voting 
    And the voting should be success
    
  Scenario: Voter successfully voted to a poll
    When I see the poll been voted by myself
    Then I can see the choice of mine
    And I can't choice and vote again
```

# User flows
---
```sequence
Sponsors->Website: Click "Raise Your Own Poll" button.
Sponsors->Website: Click "Submit" after filling in.
Website-->Sponsors: Refresh after confirmation.
Voters->Website: Choose an interested poll.
Voters->Website: Vote the poll.
Website-->Voters: Refresh after confirmation.

```

# Featured Functions


| Function | Description | Params |
| -------- | -------- | -------- |
| sponsorRaisesAPoll  | function of raising a poll | **_topic**: string, **_description**: string, **_options**: bytes32[], **_expiredBlock**: uint256 |
| voterVotesAPoll     | function of voting a poll  | **_pollId**: bytes32, **_choice**: bytes32  |



# Appendix

## Code Coverage 

- Command
    ``` bash
    node --max-old-space-size=4096 /usr/local/bin/truffle run coverage --file="test/*.coverage.js"
    ```
- Result
    ![](https://i.imgur.com/ZDKPbSu.png)

## Average Gas Used
- Command
    ``` bash
    truffle test
    ```
- Result
    ![](https://i.imgur.com/GNTmb8N.png)




