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
    renderItems();
    // animate bar from 0 to current on load
    requestAnimationFrame(function () { renderLevel(true); });

    var btn = document.getElementById("levelUpBtn");
    if (btn) btn.addEventListener("click", onLevelUp);

    // live-sync when the admin page changes things in another tab
    Q.onChange(function () { renderLevel(true); renderItems(); });
  });
})();
