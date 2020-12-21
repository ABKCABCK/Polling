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
      const pollsRow = $('#pollsRow');
      const pollTemplate = $('#pollTemplate');

      for (i = 0; i < pollList.length; i++) {

        const pollData = await pollingInstance.getPollInformation.call(pollList[i]);
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
                name="${pollList[i]}_radio"
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
    const choice = web3.utils.utf8ToHex(
      $(`input[name='${pollId}_radio']:checked`).val()
    );

    App.contracts.Polling.deployed().then((pollingInstance) => {
      return pollingInstance.voterPolls(pollId, choice, { from: accounts[0] });
    }).then((result) => {
      console.log({ result })
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

    App.contracts.Polling.deployed().then((inst) => {
      pollingInstance = inst;
      return pollingInstance.sponsorCreatePoll(topic, description, options, expiry, { from: accounts[0] });
    }).then((result) => {
      console.log({ result })
      $("#pollSubmitModal").modal("hide");
      return location.reload();
    }).catch((err) => {
      console.log(err.message);
    });
  }

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
