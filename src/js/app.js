App = {
  web3Provider: null,
  contracts: {},

  accounts: undefined,

  init: async function () {
    // Load pets.
    console.log("Initialization....")
    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();
        window.ethereum.on('accountsChanged', function (accounts) {
          window.location.reload();
        })

      } catch (error) {
        console.error("User denied account access")
      }
    }

    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }

    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);

    accounts = await web3.eth.getAccounts();

    $("#yourAccount").text(`Your Account ↓\n ${accounts[0]}`)

    return App.initContract();
  },

  initContract: function () {
    $.getJSON('Polling.json', (pollingArtifact) => {

      App.contracts.Polling = TruffleContract(pollingArtifact);
      App.contracts.Polling.setProvider(App.web3Provider);

      App.contracts.Polling.at("0x4B15F572b19Fc77aF74DC7Ff0bB0C7531e93eDBf").then(async (pollingInstance) => {
      // App.contracts.Polling.deployed().then(async (pollingInstance) => {
        $("#account_info").text(accounts[0]);
        const blockNumber = await web3.eth.getBlockNumber();
        $("#current_block_number").text(blockNumber);

        const sponsedPollList = await pollingInstance.getSponsorsPollList({ from: accounts[0] })
        const votedPollList = await pollingInstance.getVotersPollList({ from: accounts[0] })
        $("#sponsed_poll").text(sponsedPollList.join('\n'));
        $("#voted_poll").text(votedPollList.join('\n'));
        App.handleRaisedEvent(pollingInstance);
        // App.handleVotedEvent(pollingInstance);
      })
      return App.getPollList();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '.btn-vote', App.handleVote);
    $(document).on('click', '.btn-result', App.handleCheckResult);
    $("#pollForm").on('submit', App.handleRaise);
  },

  getPollList: function () {
    let pollingInstance;

    App.contracts.Polling.at("0x4B15F572b19Fc77aF74DC7Ff0bB0C7531e93eDBf").then((inst) => {
    // App.contracts.Polling.deployed().then((inst) => {
      pollingInstance = inst;
      return pollingInstance.getPollList.call();

    }).then(async (pollList) => {
      const pollsRow = $('#pollsRow');
      const pollTemplate = $('#pollTemplate');

      for (i = 0; i < pollList.length; i++) {
        const pollId = pollList[i];
        const pollData = await pollingInstance.getPollInformation.call(pollId);
        pollTemplate.find('.panel-title').text(pollData._topic);
        // pollTemplate.find('img').attr('src', pollData.picture);
        pollTemplate.find('.poll-description').text(pollData._description);
        pollTemplate.find('.poll-sponsor').text(pollData._sponsor);

        let inputTemplate = '';
        for (let j = 0; j < pollData._options.length; j++) {
          const str = web3.utils.hexToUtf8(web3.utils.numberToHex(pollData._options[j]));
          inputTemplate += (`
              <input
                class="form-check-input poll-options"
                type="radio"
                name="${pollId}_radio"
                id="pollOption${i}"
                value="${str}"
              /> 
              <label class="form-check-label" for="pollOption${j}">${str}</label>
              <br />
          `)
        }
        pollTemplate.find('.poll-options').html(inputTemplate);
        pollTemplate.find('.poll-voters').text(pollData[4].join('\n'));
        pollTemplate.find('.poll-expired-block').text(pollData._expiredBlock);
        pollTemplate.find('.btn-vote').attr('data-id', pollId);
        pollTemplate.find('.btn-result').attr('data-id', pollId);

        const voted = await pollingInstance.isVoted.call(pollId, { from: accounts[0] });
        const expired = await pollingInstance.isPollExpired.call(pollId);

        if (voted || expired) {
          pollTemplate.find('.btn-vote').prop('disabled', true);
          pollTemplate.find(`input[name='${pollId}_radio']`).prop('disabled', true);

          if (voted) {
            let _choice = await pollingInstance.getVotersOption.call(pollId, { from: accounts[0] });
            _choice = web3.utils.hexToUtf8(web3.utils.numberToHex(_choice));
            pollTemplate.find(`:radio[value="${_choice}"]`).attr('checked', true);
          } else {
            pollTemplate.find('.panel-title').text(pollData._topic + " (EXPIRED!!)");
          }

        } else {
          pollTemplate.find('.btn-vote').prop('disabled', false);
          pollTemplate.find(`input[name='${pollId}_radio']`).prop('disabled', false);
        }

        pollsRow.append(pollTemplate.html());
      }
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  handleCheckResult: function (event) {
    event.preventDefault();

    const pollId = $(event.target).data('id').toString();
    let pollingInstance, options;

    App.contracts.Polling.at("0x4B15F572b19Fc77aF74DC7Ff0bB0C7531e93eDBf").then((inst) => {
    // App.contracts.Polling.deployed().then((inst) => {
      pollingInstance = inst;
      return pollingInstance.getPollInformation.call(pollId);
    }).then((pollData) => {
      options = pollData._options;
      return Promise.all([
        pollingInstance.getPollVoters.call(pollId, options[0]),
        pollingInstance.getPollVoters.call(pollId, options[1]),
        pollingInstance.getPollVoters.call(pollId, options[2]),
        pollingInstance.getPollVoters.call(pollId, options[3]),
      ])
    }).then((result) => {
      for (let i = 0; i < result.length; i++) {
        $(`#option_${i + 1}_title`).text(web3.utils.hexToUtf8(web3.utils.numberToHex(options[i])));
        $(`#option_${i + 1}_voter`).text(result[i].join('\n'));
      }
      $("#resultModal").modal();
    }).catch((err) => {
      console.log(err.message);
    });
  },

  handleVote: function (event) {
    event.preventDefault();

    const pollId = $(event.target).data('id').toString();
    const choice = web3.utils.utf8ToHex(
      $(`input[name='${pollId}_radio']:checked`).val()
    );
    App.contracts.Polling.at("0x4B15F572b19Fc77aF74DC7Ff0bB0C7531e93eDBf").then((pollingInstance) => {
    // App.contracts.Polling.deployed().then((pollingInstance) => {
      return pollingInstance.voterVotesAPoll(pollId, choice, { from: accounts[0] });
    }).then((result) => {
      return location.reload();
    }).catch((err) => {
      console.log(err.message);
    });
  },

  handleRaise: function (event) {
    event.preventDefault();
    console.log({ event })
    const topic = $("#newTopic").val();
    const description = $("#newDescription").val();
    const options = [
      $("#option1").val(),
      $("#option2").val(),
      $("#option3").val(),
      $("#option4").val(),
    ].map(e => web3.utils.utf8ToHex(e));
    const expiry = parseInt($("#expiry").val());

    console.log({ topic, description, expiry, options })

    let pollingInstance;

    App.contracts.Polling.at("0x4B15F572b19Fc77aF74DC7Ff0bB0C7531e93eDBf").then((inst) => {
    // App.contracts.Polling.deployed().then((inst) => {
      pollingInstance = inst;
      return pollingInstance.sponsorRaisesAPoll(topic, description, options, expiry, { from: accounts[0] });
    }).then((result) => {
      console.log({ result })
      $("#pollSubmitModal").modal("hide");
      // return location.reload();
    }).catch((err) => {
      console.log(err.message);
    });
  },

  handleRaisedEvent: async function (instance) {
    instance.Raised()
      .on('data', function (event) {
        alert(`
          A new poll is raised \n
          sponsor: ${event.returnValues._sponsor},
          Id: ${event.returnValues._pollId},
        `);
        window.location.reload();
      })
  },

  handleVotedEvent: async function (instance) {
    instance.Voted()
      .on('data', function (event) {
        console.log(event); // same results as the optional callback above
      })
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
