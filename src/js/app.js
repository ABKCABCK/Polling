App = {
  web3Provider: null,
  contracts: {},

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

    web3.eth.getAccounts((error, accounts) => {
      if (error)
        console.log(error);

      $("#yourAccount").text(`Your Account ↓\n ${accounts[0]}`)
    })
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('Polling.json', function (pollingArtifact) {

      App.contracts.Polling = TruffleContract(pollingArtifact);
      App.contracts.Polling.setProvider(App.web3Provider);

      return App.getPollList();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '.btn-vote', App.handleVote);
    $("#pollForm").on('submit', App.handleRaise);
  },

  getPollList: function () {
    let pollingInstance;

    App.contracts.Polling.deployed().then((inst) => {
      pollingInstance = inst;
      return pollingInstance.getPollList.call();

    }).then(async (pollList) => {
      console.log({ pollList })
      const pollsRow = $('#pollsRow');
      const pollTemplate = $('#pollTemplate');

      for (i = 0; i < pollList.length; i++) {

        const pollData = await pollingInstance.getPollInformation.call(pollList[i]);
        pollTemplate.find('.panel-title').text(pollData[0]);
        // pollTemplate.find('img').attr('src', pollData.picture);
        pollTemplate.find('.poll-description').text(pollData[1]);
        pollTemplate.find('.poll-sponsor').text(pollData[2]);
        pollTemplate.find('.poll-voters').text(pollData[3].join('\n'));
        pollTemplate.find('.poll-expired-block').text(pollData[4]);

        pollTemplate.find('.btn-vote').attr('data-id', pollList[i]);

        const voted = await pollingInstance.isVoted.call(pollList[i]);
        if (voted) {
          pollTemplate.find('.btn-vote').prop('disabled', true);
        } else {
          pollTemplate.find('.btn-vote').prop('disabled', false);
        }

        pollsRow.append(pollTemplate.html());
      }
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  handleVote: function (event) {
    event.preventDefault();

    const pollId = $(event.target).data('id').toString();
    console.log({ pollId })

    let pollingInstance;

    web3.eth.getAccounts((error, accounts) => {
      if (error)
        console.log(error);

      const account = accounts[0];

      App.contracts.Polling.deployed().then((inst) => {
        pollingInstance = inst;

        return pollingInstance.voterPolls(pollId, { from: account });
      }).then((result) => {
        console.log({ result })
        return location.reload();
      }).catch((err) => {
        console.log(err.message);
      });
    });
  },

  handleRaise: function (event) {
    event.preventDefault();
    console.log({ event })
    const topic = $("#newTopic").val();
    const description = $("#newDescription").val();
    const expiredBlock = parseInt($("#expiredBlock").val());

    console.log({ topic, description, expiredBlock })

    $("#pollSubmitModal").modal("hide");

    let pollingInstance;

    web3.eth.getAccounts((error, accounts) => {
      if (error)
        console.log(error);

      const account = accounts[0];

      App.contracts.Polling.deployed().then((inst) => {
        pollingInstance = inst;

        return pollingInstance.sponsorCreatePoll(topic, description, expiredBlock, { from: account });
      }).then((result) => {
        console.log({ result })
        return location.reload();
      }).catch((err) => {
        console.log(err.message);
      });
    });
  }

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
