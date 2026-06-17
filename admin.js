/* ============================================================
   QUEST — admin panel
   Simple front-end password gate (no backend — clear-text by
   design). Writes shared state; the main page live-syncs.
   ============================================================ */

(function () {
  "use strict";
  var Q = window.Quest;
  var PASSWORD = "0953";

  // load shared state from the JSON bin right away (before unlock)
  Q.init();

  /* ---- password gate ---- */
  var gateForm = document.getElementById("gateForm");
  var gateCard = document.getElementById("gateCard");
  var gateErr = document.getElementById("gateError");
  var pwd = document.getElementById("pwd");
  var panel = document.getElementById("panel");

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (pwd.value === PASSWORD) {
      gateCard.classList.add("hidden");
      panel.classList.remove("hidden");
      initPanel();
    } else {
      gateErr.textContent = "MOT DE PASSE INCORRECT";
      var g = gateForm;
      g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake");
      pwd.value = "";
      pwd.focus();
    }
  });

  /* ---- control panel ---- */
  function initPanel() {
    var lvlValue = document.getElementById("lvlValue");
    var lvlSlider = document.getElementById("lvlSlider");
    var list = document.getElementById("itemList");

    function syncLevelUI() {
      var lv = Q.getLevel();
      lvlValue.textContent = lv;
      lvlSlider.value = lv;
    }

    function setLevel(v) {
      Q.setLevel(v);
      syncLevelUI();
    }

    document.getElementById("lvlUp").addEventListener("click", function () {
      setLevel(Q.getLevel() + 1);
    });
    document.getElementById("lvlDown").addEventListener("click", function () {
      setLevel(Q.getLevel() - 1);
    });
    lvlSlider.addEventListener("input", function () {
      setLevel(parseInt(lvlSlider.value, 10));
    });

    // build item toggles
    function renderItems() {
      var items = Q.getItems();
      list.innerHTML = "";
      Q.ITEMS.forEach(function (it, i) {
        var on = !!items[i];
        var row = document.createElement("div");
        row.className = "item-row";
        row.innerHTML =
          '<div class="item-row__icon ' + (on ? "" : "is-off") + '">' + it.svg + "</div>" +
          '<div class="item-row__name">' + it.name +
            '<div class="item-row__state">' + (on ? "ACTIVÉ" : "DÉSACTIVÉ") + "</div></div>";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pbtn " + (on ? "pbtn--danger" : "pbtn--amber");
        btn.textContent = on ? "DÉSACTIVER" : "ACTIVER";
        btn.addEventListener("click", function () {
          Q.setItem(i, !Q.getItems()[i]);
          renderItems();
        });
        row.appendChild(btn);
        list.appendChild(row);
      });
    }

    syncLevelUI();
    renderItems();

    // reflect changes made from another tab (e.g. the main page LEVEL UP)
    Q.onChange(function () { syncLevelUI(); renderItems(); });
  }
})();
