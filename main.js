/* ============================================================
   QUEST — main page wiring
   Reads shared state, renders the level bar + item rail,
   handles the LEVEL UP button, and live-syncs with admin.
   ============================================================ */

(function () {
  "use strict";
  var Q = window.Quest;

  function renderLevel(animate) {
    var lv = Q.getLevel();
    var fill = document.getElementById("xpFill");
    var label = document.getElementById("levelValue");
    var bar = document.querySelector(".xpbar");
    if (fill) fill.style.width = (lv / Q.MAX) * 100 + "%";
    if (label) label.textContent = String(lv).padStart(2, "0");
    if (bar) bar.setAttribute("aria-valuenow", lv);
  }

  function buildRail() {
    var rail = document.getElementById("itemsRail");
    if (!rail) return;
    Q.ITEMS.forEach(function (it) {
      var slot = document.createElement("div");
      slot.className = "item item--locked";
      slot.dataset.id = it.id;
      slot.innerHTML =
        '<div class="item__icon">' + it.svg + "</div>" +
        '<span class="item__tip">' + it.name + "</span>";
      rail.appendChild(slot);
    });
  }

  function renderItems() {
    var items = Q.getItems();
    var slots = document.querySelectorAll("#itemsRail .item");
    slots.forEach(function (el, i) {
      var won = !!items[i];
      var wasLocked = el.classList.contains("item--locked");
      el.classList.toggle("item--locked", !won);
      el.setAttribute("aria-label",
        Q.ITEMS[i].name + (won ? " — gagné" : " — à gagner"));
      if (won && wasLocked) {           // just unlocked → celebrate
        el.classList.remove("item--pop");
        void el.offsetWidth;            // restart animation
        el.classList.add("item--pop");
      }
    });
  }

  function onLevelUp() {
    if (Q.getLevel() >= Q.MAX) { alert("Niveau maximum atteint !"); return; }
    if (window.confirm("Monter d'un niveau ?")) {
      Q.setLevel(Q.getLevel() + 1);
      renderLevel(true);
      var btn = document.getElementById("levelUpBtn");
      if (btn) { btn.classList.remove("is-hit"); void btn.offsetWidth; btn.classList.add("is-hit"); }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildRail();

    var btn = document.getElementById("levelUpBtn");
    if (btn) btn.addEventListener("click", onLevelUp);

    // re-render on every state change (local, cross-tab, or remote poll)
    Q.onChange(function () { renderLevel(true); renderItems(); });

    // initial paint, then load shared state from the JSON bin
    requestAnimationFrame(function () { renderLevel(true); renderItems(); });
    Q.init();

    // ---- game mode dropdown ----
    var modeBtn = document.getElementById("modeBtn");
    var modeMenu = document.getElementById("modeMenu");
    function closeMenu() { modeMenu.hidden = true; modeBtn.setAttribute("aria-expanded", "false"); }
    if (modeBtn) {
      modeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = modeMenu.hidden;
        modeMenu.hidden = !open;
        modeBtn.setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("click", closeMenu);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    }

    // ---- player-select modal (générique multi-jeux) ----
    var GAMES = {
      td:      { title: "ACTION OU VÉRITÉ", page: "action-verite.html", lsKey: "quest.td.me",      api: function () { return window.QuestTd; } },
      morpion: { title: "LE MORPION",       page: "morpion.html",       lsKey: "quest.morpion.me", api: function () { return window.QuestMorpion; } }
    };
    var modal = document.getElementById("tdModal");
    var hint = document.getElementById("tdModalHint");
    var titleEl = modal.querySelector(".modal__title");
    var currentGame = null;

    function presenceOf(game) {
      var api = game.api();
      var st = api ? (api.getState ? api.getState() : api.getTd()) : null;
      return (st && st.presence) ? st.presence : {};
    }
    function openModal(gameKey) {
      currentGame = GAMES[gameKey];
      if (!currentGame) return;
      modal.hidden = false;
      titleEl.textContent = currentGame.title;
      var pres = presenceOf(currentGame);
      [1, 2].forEach(function (n) {
        var btn = modal.querySelector('.pick[data-player="' + n + '"]');
        btn.classList.toggle("is-taken", !!pres[n]);
      });
      hint.textContent = "";
    }
    modeMenu.querySelectorAll("[data-mode]").forEach(function (item) {
      var key = item.getAttribute("data-mode");
      if (!GAMES[key]) return; // entrées "bientôt" ignorées
      item.addEventListener("click", function () { closeMenu(); openModal(key); });
    });
    document.getElementById("tdModalClose").addEventListener("click", function () { modal.hidden = true; });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });
    modal.querySelectorAll(".pick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!currentGame) return;
        var n = parseInt(btn.getAttribute("data-player"), 10);
        var pres = presenceOf(currentGame);
        if (pres[n]) { hint.textContent = "Ce joueur est déjà pris."; return; }
        localStorage.setItem(currentGame.lsKey, n); // présence posée par la page de jeu (goOnline)
        location.href = currentGame.page;
      });
    });
  });
})();
