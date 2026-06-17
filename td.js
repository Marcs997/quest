/* ============================================================
   QUEST — mode « Action ou Vérité » (jeu en tours, 2 appareils)
   S'appuie sur l'état partagé Quest (objet td).
   ============================================================ */
(function () {
  "use strict";
  var Q = window.Quest;
  var PRESENCE_TTL = 25000;   // un joueur est "présent" si vu il y a < 25s
  var HEARTBEAT_MS = 10000;   // rafraîchit sa présence toutes les 10s

  var me = parseInt(localStorage.getItem("quest.td.me"), 10);
  if (me !== 1 && me !== 2) { location.href = "index.html"; return; }
  var other = me === 1 ? 2 : 1;
  var ready = false;     // true once the shared state has loaded from the bin
  var quitting = false;  // true once the player has hit "Quitter le jeu"

  var lobby = document.getElementById("tdLobby");
  var game = document.getElementById("tdGame");
  var statusEl = document.getElementById("tdStatus");
  var roleEl = document.getElementById("tdRole");
  var actionEl = document.getElementById("tdAction");
  var logEl = document.getElementById("tdLog");

  function present(td, n) { return (Date.now() - (td.players[n] || 0)) < PRESENCE_TTL; }
  function pname(n) { return n === 1 ? "Joueur 1" : "Joueur 2"; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---- actions (chacune protégée par rôle + phase) ---- */
  function doStart() {
    var td = Q.getTd(); if (me !== td.asker || td.phase !== "start") return;
    Q.updateTd({ round: td.round + 1, choice: null, prompt: null, response: null, phase: "choose" });
  }
  function doChoose(c) {
    var td = Q.getTd(); if (me === td.asker || td.phase !== "choose") return;
    Q.updateTd({ choice: c, phase: "prompt" });
  }
  function doPrompt(text) {
    var td = Q.getTd(); if (me !== td.asker || td.phase !== "prompt") return;
    Q.updateTd({ prompt: text, phase: "respond" });
  }
  function doRespond(text) {
    var td = Q.getTd(); if (me === td.asker || td.phase !== "respond") return;
    var log = td.log.concat([{ round: td.round, asker: td.asker, choice: td.choice, prompt: td.prompt, response: text }]);
    Q.updateTd({ response: text, log: log, asker: td.asker === 1 ? 2 : 1, phase: "start" });
  }
  function doQuit() {
    quitting = true;
    var td = Q.getTd(); td.players[me] = 0;
    // close the session for both players and reset it for a clean next game
    Q.updateTd({
      players: td.players, active: false, phase: "start", round: 0,
      choice: null, prompt: null, response: null, log: []
    });
    localStorage.removeItem("quest.td.me");
    // send the quit to the bin BEFORE navigating away, else the debounced push is cancelled
    var go = function () { location.href = "index.html"; };
    Q.flush().then(go, go);
    setTimeout(go, 1500); // fallback if the network is slow
  }

  /* ---- rendu du journal ---- */
  function entry(player, kind, text) {
    return '<div class="td-msg td-msg--p' + player + '">' +
      '<span class="td-msg__who">' + pname(player) + '</span>' +
      '<span class="td-msg__kind">' + kind + '</span>' +
      '<span class="td-msg__text">' + esc(text) + '</span></div>';
  }
  function renderLog(td) {
    var html = "";
    td.log.forEach(function (r) {
      var ans = r.asker === 1 ? 2 : 1;
      html += entry(r.asker, "demande", "Action ou Vérité ?");
      html += entry(ans, "choisit", r.choice === "action" ? "ACTION" : "VÉRITÉ");
      html += entry(r.asker, r.choice === "action" ? "défi" : "question", r.prompt || "");
      html += entry(ans, "réponse", r.response || "");
    });
    if (td.phase !== "start") {
      var a = td.asker === 1 ? 2 : 1;
      html += entry(td.asker, "demande", "Action ou Vérité ?");
      if (td.choice) html += entry(a, "choisit", td.choice === "action" ? "ACTION" : "VÉRITÉ");
      if (td.prompt) html += entry(td.asker, td.choice === "action" ? "défi" : "question", td.prompt);
    }
    logEl.innerHTML = html || '<p class="td-log__empty">La partie commence… À ' + pname(td.asker) + ' de jouer.</p>';
    logEl.scrollTop = logEl.scrollHeight;
  }

  function wireSend(taId, btnId, fn) {
    var ta = document.getElementById(taId), b = document.getElementById(btnId);
    if (!ta || !b) return;
    ta.oninput = function () { b.disabled = ta.value.trim() === ""; };
    ta.focus();
    b.onclick = function () { var v = ta.value.trim(); if (v) fn(v); };
  }

  /* ---- rendu principal ---- */
  function render() {
    if (quitting) return;   // stop reclaiming presence once we're leaving
    var td = Q.getTd();
    // do NOT write anything before the real level/items have loaded from the bin,
    // otherwise an early presence write would push default values and clobber them.
    if (!ready) {
      lobby.hidden = false; game.hidden = true;
      statusEl.textContent = "Connexion…";
      return;
    }
    // re-claim my own presence if a concurrent write dropped it (join race).
    // localDirty (in state.js) prevents the next poll from clobbering it again.
    if (!present(td, me)) {
      td.players[me] = Date.now();
      Q.updateTd({ players: td.players });
      return;
    }
    // player 1 démarre la session quand les deux sont présents
    if (me === 1 && !td.active && present(td, 1) && present(td, 2)) {
      Q.updateTd({ active: true, asker: 1, phase: "start", round: 0, choice: null, prompt: null, response: null, log: [] });
      return;
    }
    var both = present(td, 1) && present(td, 2);
    if (!both || !td.active) {
      lobby.hidden = false; game.hidden = true;
      statusEl.textContent = !present(td, other)
        ? "En attente de l'autre joueur…" : "Démarrage de la partie…";
      return;
    }
    lobby.hidden = true; game.hidden = false;
    renderLog(td);
    var isAsker = (me === td.asker);
    roleEl.textContent = isAsker ? "À TOI D'INTERROGER" : "À TOI DE RÉPONDRE";
    roleEl.className = "td-role td-role--" + (isAsker ? "asker" : "answerer");

    if (td.phase === "start") {
      actionEl.innerHTML = isAsker
        ? '<button class="pbtn pbtn--amber td-big" id="tdStart">START</button>'
        : '<p class="td-wait">En attente du START de ' + pname(td.asker) + '…</p>';
      var s = document.getElementById("tdStart"); if (s) s.onclick = doStart;
    } else if (td.phase === "choose") {
      if (!isAsker) {
        actionEl.innerHTML = '<p class="td-q">Action ou Vérité ?</p><div class="td-choice">' +
          '<button class="pbtn td-big" data-c="action">ACTION</button>' +
          '<button class="pbtn pbtn--amber td-big" data-c="verite">VÉRITÉ</button></div>';
        actionEl.querySelectorAll("[data-c]").forEach(function (b) {
          b.onclick = function () { doChoose(b.getAttribute("data-c")); };
        });
      } else actionEl.innerHTML = '<p class="td-wait">' + pname(other) + ' choisit…</p>';
    } else if (td.phase === "prompt") {
      if (isAsker) {
        var lbl = td.choice === "action" ? "défi" : "question";
        actionEl.innerHTML = '<p class="td-q">' + pname(other) + ' a choisi : <b>' +
          (td.choice === "action" ? "ACTION" : "VÉRITÉ") + '</b></p>' +
          '<textarea class="td-input" id="tdText" rows="2" placeholder="Écris ton ' + lbl + '…"></textarea>' +
          '<button class="pbtn td-big" id="tdSend" disabled>ENVOYER</button>';
        wireSend("tdText", "tdSend", doPrompt);
      } else actionEl.innerHTML = '<p class="td-wait">' + pname(td.asker) + ' prépare…</p>';
    } else if (td.phase === "respond") {
      if (!isAsker) {
        actionEl.innerHTML = '<p class="td-q">' + pname(td.asker) + ' : <b>' + esc(td.prompt || "") + '</b></p>' +
          '<textarea class="td-input" id="tdText" rows="2" placeholder="Ta réponse…"></textarea>' +
          '<button class="pbtn td-big" id="tdSend" disabled>ENVOYER</button>';
        wireSend("tdText", "tdSend", doRespond);
      } else actionEl.innerHTML = '<p class="td-wait">' + pname(other) + ' répond…</p>';
    }
  }

  /* ---- boot ---- */
  document.getElementById("tdMe").textContent = "Tu es " + pname(me);
  document.getElementById("tdQuit").onclick = doQuit;
  Q.onChange(render);
  Q.init().then(function () {
    ready = true;                 // remote level/items are now loaded
    Q.setActive(true);
    var td = Q.getTd(); td.players[me] = Date.now();
    Q.updateTd({ players: td.players });
    render();
    setInterval(function () {
      if (!document.hidden) {
        var t = Q.getTd(); t.players[me] = Date.now();
        Q.updateTdEphemeral({ players: t.players }); // refresh presence without blocking reads
      }
    }, HEARTBEAT_MS);
  });
})();
