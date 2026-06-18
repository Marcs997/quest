/* ============================================================
   QUEST — mode « Le Morpion » (2 joueurs, 2 appareils).
   S'appuie sur la session temps réel Firebase (window.QuestMorpion,
   morpion-sync.js) et la logique pure (window.MorpionRules).
   ============================================================ */
(function () {
  "use strict";
  var me = parseInt(localStorage.getItem("quest.morpion.me"), 10);
  if (me !== 1 && me !== 2) { location.href = "index.html"; return; }
  var other = me === 1 ? 2 : 1;
  var quitting = false;

  var lobby = document.getElementById("mpLobby");
  var game = document.getElementById("mpGame");
  var statusEl = document.getElementById("mpStatus");
  var scoreEl = document.getElementById("mpScore");
  var lineEl = document.getElementById("mpStatusLine");
  var boardEl = document.getElementById("mpBoard");
  var actionsEl = document.getElementById("mpActions");

  function present(s, n) { return !!(s.presence && s.presence[n]); }
  function pname(n) { return n === 1 ? "Joueur 1" : "Joueur 2"; }
  function mark(n) { return n === 1 ? "X" : "O"; }

  /* ---- actions ---- */
  function play(i) {
    var QM = window.QuestMorpion, R = window.MorpionRules;
    var s = QM.getState();
    if (me !== s.turn || s.winner !== null || s.board[i] !== 0) return;
    var board = s.board.slice(); board[i] = me;
    var patch = {}; patch["board/" + i] = me;
    var w = R.checkWinner(board);
    if (w) { patch.winner = w; patch["scores/" + w] = s.scores[w] + 1; }
    else if (R.isDraw(board)) { patch.winner = "draw"; patch["scores/draw"] = s.scores.draw + 1; }
    else { patch.turn = (me === 1 ? 2 : 1); }
    QM.update(patch);
  }
  function rejouer() {
    var QM = window.QuestMorpion, R = window.MorpionRules;
    var s = QM.getState();
    if (s.winner === null) return;
    var starter = R.nextStarter(s.winner, s.starter);
    QM.update({ board: [0, 0, 0, 0, 0, 0, 0, 0, 0], winner: null, starter: starter, turn: starter });
  }
  function doQuit() {
    quitting = true;
    localStorage.removeItem("quest.morpion.me");
    var go = function () { location.href = "index.html"; };
    window.QuestMorpion.quit(me).then(go, go);
    setTimeout(go, 1500);
  }

  /* ---- rendu ---- */
  function renderScore(s) {
    scoreEl.innerHTML =
      '<span class="mp-score__cell mp-score__cell--x">J1 (X) <b>' + s.scores[1] + '</b></span>' +
      '<span class="mp-score__cell mp-score__cell--draw">Nuls <b>' + s.scores.draw + '</b></span>' +
      '<span class="mp-score__cell mp-score__cell--o">J2 (O) <b>' + s.scores[2] + '</b></span>';
  }
  function renderBoard(s) {
    var canPlay = (me === s.turn && s.winner === null);
    var html = "";
    for (var i = 0; i < 9; i++) {
      var v = s.board[i];
      var cls = "mp-cell" + (v === 1 ? " mp-cell--x" : v === 2 ? " mp-cell--o" : "");
      var playable = canPlay && v === 0;
      if (playable) cls += " mp-cell--playable";
      html += '<button class="' + cls + '" data-i="' + i + '"' + (playable ? "" : " disabled") + '>' +
        (v === 1 ? "X" : v === 2 ? "O" : "") + '</button>';
    }
    boardEl.innerHTML = html;
    boardEl.querySelectorAll(".mp-cell--playable").forEach(function (b) {
      b.onclick = function () { play(parseInt(b.getAttribute("data-i"), 10)); };
    });
  }
  function renderStatusLine(s) {
    if (s.winner === "draw") { lineEl.textContent = "Match nul !"; lineEl.className = "td-role"; return; }
    if (s.winner) {
      lineEl.textContent = pname(s.winner) + " (" + mark(s.winner) + ") gagne !";
      lineEl.className = "td-role td-role--" + (s.winner === me ? "asker" : "answerer");
      return;
    }
    var mine = (me === s.turn);
    lineEl.textContent = mine ? "À toi de jouer (" + mark(me) + ")" : "Au tour de " + pname(s.turn);
    lineEl.className = "td-role td-role--" + (mine ? "asker" : "answerer");
  }
  function renderActions(s) {
    if (s.winner !== null) {
      actionsEl.innerHTML = '<button class="pbtn pbtn--amber td-big" id="mpReplay">REJOUER</button>';
      var r = document.getElementById("mpReplay"); if (r) r.onclick = rejouer;
    } else {
      actionsEl.innerHTML = "";
    }
  }

  function render() {
    if (quitting) return;
    var QM = window.QuestMorpion;
    var s = QM.getState();
    if (!QM.isReady()) {
      lobby.hidden = false; game.hidden = true;
      statusEl.textContent = "Connexion…";
      return;
    }
    // Joueur 1 lance la session quand les deux sont présents
    if (me === 1 && !s.active && present(s, 1) && present(s, 2)) {
      QM.transactionStart({
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0], turn: 1, winner: null, starter: 1,
        scores: { 1: 0, 2: 0, draw: 0 }
      });
      return;
    }
    if (!s.active) {
      lobby.hidden = false; game.hidden = true;
      statusEl.textContent = !present(s, other) ? "En attente de l'autre joueur…" : "Démarrage de la partie…";
      return;
    }
    lobby.hidden = true; game.hidden = false;
    var absentEl = document.getElementById("mpAbsent");
    if (absentEl) {
      var away = !present(s, other);
      absentEl.hidden = !away;
      if (away) absentEl.textContent = pname(other) + " est absent… la partie reprendra à son retour.";
    }
    renderScore(s);
    renderStatusLine(s);
    renderBoard(s);
    renderActions(s);
  }

  /* ---- boot ---- */
  function boot() {
    document.getElementById("mpMe").textContent = "Tu es " + pname(me);
    document.getElementById("mpQuit").onclick = doQuit;
    window.QuestMorpion.onChange(render);
    window.QuestMorpion.goOnline(me);
    render();
  }
  if (window.QuestMorpion) boot();
  else window.addEventListener("questmorpion-ready", boot, { once: true });
})();
