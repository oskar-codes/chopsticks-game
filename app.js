var app = new Vue({
  el: '#app',
  data: {
    inGame: false,
    player: {},
    otherPlayer: {},
    gameStarted: false,
    yourTurn: false,
    selectedHand: '',
    transfering: false
  },
  methods: {
    isEmpty: function(obj) {
      return Object.keys(obj).length === 0 && obj.constructor === Object
    }
  },
  watch: {
    player: function(n) {
      if (n) {
        if (n.left === 5 && n.right === 5) {
          alert("You lost!");
          if (n.type === 'Host') firebase.database().ref(this.gameKey).remove();
          window.location.href = "https://oskar-codes.github.io/chopsticks-game/";
        }
      }
    }
  }
});

(() => {
  let gameID = getAllUrlParams().game;
  if (gameID) {
    firebase.database().ref(gameID).once('value',(snap) => {
      let game = snap.val();
      if (game) {
        if (game.nPlayers === 2) {
          alert("Game is full.");
          window.location.href = "https://oskar-codes.github.io/chopsticks-game/";
        } else {
          app.inGame = true;
          firebase.database().ref(`${gameID}/nPlayers`).set(2);
          app.player = {
            left: 1,
            right: 1,
            type: 'Guest'
          }
          firebase.database().ref(`${gameID}/guest`).set(app.player);
          firebase.database().ref(`${gameID}/host`).once('value', (snap) => {
            app.otherPlayer = snap.val();
          });
          firebase.database().ref(`${gameID}/guest`).on('value', (snap) => {
            app.player = snap.val();
          });
          firebase.database().ref(`${gameID}/host`).on('value', (snap) => {
            app.otherPlayer = snap.val();
          });
          firebase.database().ref(`${gameID}/turn`).on('value', (snap) => {
            let t = snap.val();
            if (t === 'Guest') {
              app.yourTurn = true;
            } else {
              app.yourTurn = false;
            }
          });
          app.gameStarted = true;
          app.gameKey = gameID;
        }
      } else {
        alert("Game not found.");
        window.location.href = "https://oskar-codes.github.io/chopsticks-game/";
      }
    });
  }
})();

function createGame() {
  if (!app.inGame) {
    let newGameRef = firebase.database().ref("/").push();
    newGameRef.set({
      host: {
        left: 1,
        right: 1,
        type: 'Host'
      },
      nPlayers: 1,
      turn: 'Host'
    }).then(() => {
      app.gameKey = newGameRef.key;
      window.history.replaceState(null, null, `?game=${app.gameKey}`);
      app.inGame = true;
      app.player = {
        left: 1,
        right: 1,
        type: 'Host'
      }
      firebase.database().ref(`${app.gameKey}/guest`).on('value', (snap) => {
        let guest = snap.val();
        if (guest && !app.gameStarted) {
          app.gameStarted = true;
          app.otherPlayer = guest;
          app.yourTurn = true;

          let link = document.getElementById("link");
          if (link) {
            link.href = window.location.href;
            link.innerHTML = window.location.href;
          }
        }
      });
      firebase.database().ref(`${app.gameKey}/host`).on('value', (snap) => {
        app.player = snap.val();
      });
      firebase.database().ref(`${app.gameKey}/guest`).on('value', (snap) => {
        app.otherPlayer = snap.val();
      });
      firebase.database().ref(`${app.gameKey}/turn`).on('value', (snap) => {
        let t = snap.val();
        if (t === 'Host') {
          app.yourTurn = true;
        } else {
          app.yourTurn = false;
        }
      });
    }).catch(e => {
      alert('An error occured. Please try again.');
      console.error(e);
    })
  }
}

function selectHand(hand, el, otherEl) {
  if (app.yourTurn && app.gameStarted) {
    if (app.selectedHand && app.selectedHand !== hand) {
      app.transfering = true;
    
      waitForDOMupdate(() => {
        let transferEl = document.getElementById("transfering");
        transferEl.innerHTML = "<h3>Transfer fingers</h3>";
        let max = app.player[app.selectedHand] - 1;
        for (let i = 1; i<=max; i++) {
          transferEl.innerHTML += `<button onclick="transfer(${i},'${hand}')">${i}</button>`;
        }
        transferEl.innerHTML += `<button onclick="cancelTransfer();">Cancel</button>`
      });

    } else if (app.player[hand] !== 5) {
      el.classList.add('active');
      app.selectedHand = hand;
    }
  }
}

function transfer(amount, which) {
  app.player[which] = add(app.player[which], amount);
  app.player[which === 'left' ? 'right' : 'left'] -= amount;
  nextTurn();
  app.transfering = false;
  app.selectedHand = '';
  removeActiveImages();
}

function cancelTransfer() {
  app.transfering = false;
  app.selectedHand = '';
  removeActiveImages();
}

function placeHand(hand, el) {
  if (app.yourTurn && app.gameStarted && app.selectedHand !== '') {
    app.otherPlayer[hand] = add(app.otherPlayer[hand], app.player[app.selectedHand]);
    app.selectedHand = '';
    nextTurn();
    app.yourTurn = false;

    removeActiveImages();

    if (app.otherPlayer.left === 5 && app.otherPlayer.right === 5) {
      alert("You won!");
      if (app.player.type === 'Host') firebase.database().ref(app.gameKey).remove();
      window.location.href = "https://oskar-codes.github.io/chopsticks-game/";
    }
  }
}

function nextTurn() {
  if (app.player.type === 'Host') {
    firebase.database().ref(`${app.gameKey}/guest`).set(app.otherPlayer);
    firebase.database().ref(`${app.gameKey}/host`).set(app.player);
    firebase.database().ref(`${app.gameKey}/turn`).set('Guest');
  } else {
    firebase.database().ref(`${app.gameKey}/host`).set(app.otherPlayer);
    firebase.database().ref(`${app.gameKey}/guest`).set(app.player);
    firebase.database().ref(`${app.gameKey}/turn`).set('Host');
  }
}

function removeActiveImages() {
  let images = document.querySelectorAll("img");
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    img.classList.remove('active');
  }
}

function add(a,b) {
  if (a+b > 5) {
      return b - Math.abs(a-5);
  } else {
      return a + b;
  }
}

function getAllUrlParams(url) {
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);
  var obj = {};
  if (queryString) {
    queryString = queryString.split('#')[0];
    var arr = queryString.split('&');
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i].split('=');
      var paramName = a[0];
      var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];
      //paramName = paramName.toLowerCase();
      //if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();
      if (paramName.match(/\[(\d+)?\]$/)) {
        var key = paramName.replace(/\[(\d+)?\]/, '');
        if (!obj[key]) obj[key] = [];
        if (paramName.match(/\[\d+\]$/)) {
          var index = /\[(\d+)\]/.exec(paramName)[1];
          obj[key][index] = paramValue;
        } else {
          obj[key].push(paramValue);
        }
      } else {
        if (!obj[paramName]) {
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === 'string'){
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          obj[paramName].push(paramValue);
        }
      }
    }
  }
  return obj;
}

function waitForDOMupdate(f) {
  intermediate = () => { window.requestAnimationFrame(f) }
  window.requestAnimationFrame(intermediate);
}
