/* ============================================================
   QUEST — shared game state (no backend, localStorage only)
   Used by both the main page and the admin page so they stay
   in sync. Cross-tab updates fire via the `storage` event.
   ============================================================ */

(function (global) {
  "use strict";

  var KEY_LEVEL = "quest.level";
  var KEY_ITEMS = "quest.items";
  var MAX = 99;
  var DEFAULT_LEVEL = 5;

  /* The 5 reward items, with pixel-art SVG icons (16x16, crisp). */
  var ITEMS = [
    {
      id: "star", name: "Étoile",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
           '<path d="M8 1 L10 6 L15 6 L11 9 L13 15 L8 11 L3 15 L5 9 L1 6 L6 6 Z" fill="#f7c948"/>' +
           '<path d="M8 3 L9 6 L7 6 Z" fill="#fff0b0"/></svg>'
    },
    {
      id: "chest", name: "Coffre",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
           '<rect x="2" y="7" width="12" height="7" fill="#8a5a2b"/>' +
           '<rect x="2" y="4" width="12" height="4" fill="#a06a30"/>' +
           '<rect x="2" y="7" width="12" height="1" fill="#5d3c1c"/>' +
           '<rect x="7" y="4" width="2" height="10" fill="#f7c948"/>' +
           '<rect x="6" y="9" width="4" height="3" fill="#e0a82e"/>' +
           '<rect x="7" y="10" width="2" height="2" fill="#5d3c1c"/></svg>'
    },
    {
      id: "wand", name: "Baguette",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
           '<rect x="7" y="6" width="2" height="9" fill="#2e2438"/>' +
           '<rect x="7" y="13" width="2" height="2" fill="#6b5a82"/>' +
           '<path d="M8 0 L9 3 L12 3 L9.5 5 L10.5 8 L8 6 L5.5 8 L6.5 5 L4 3 L7 3 Z" fill="#f7c948"/>' +
           '<rect x="12" y="6" width="1" height="1" fill="#fff0b0"/>' +
           '<rect x="4" y="9" width="1" height="1" fill="#fff0b0"/></svg>'
    },
    {
      id: "sandals", name: "Sandales",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
           '<rect x="2" y="4" width="4" height="9" fill="#c9a36b"/>' +
           '<rect x="3" y="5" width="2" height="7" fill="#b8924f"/>' +
           '<rect x="2" y="6" width="4" height="1" fill="#6b4a2a"/>' +
           '<rect x="3" y="4" width="2" height="2" fill="#6b4a2a"/>' +
           '<rect x="10" y="4" width="4" height="9" fill="#c9a36b"/>' +
           '<rect x="11" y="5" width="2" height="7" fill="#b8924f"/>' +
           '<rect x="10" y="6" width="4" height="1" fill="#6b4a2a"/>' +
           '<rect x="11" y="4" width="2" height="2" fill="#6b4a2a"/></svg>'
    },
    {
      id: "sword", name: "Épée",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
           '<path d="M7 2 L8 0 L9 2 Z" fill="#c8d2dc"/>' +
           '<rect x="7" y="2" width="2" height="8" fill="#c8d2dc"/>' +
           '<rect x="7" y="2" width="1" height="8" fill="#eef3f8"/>' +
           '<rect x="4" y="10" width="8" height="2" fill="#f7c948"/>' +
           '<rect x="7" y="12" width="2" height="3" fill="#6b4a2a"/>' +
           '<rect x="6" y="15" width="4" height="1" fill="#f7c948"/></svg>'
    }
  ];

  function clampLevel(v) { return Math.max(0, Math.min(MAX, v | 0)); }

  /* safe localStorage access (private mode / file:// can throw) */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function getLevel() {
    var v = parseInt(lsGet(KEY_LEVEL), 10);
    return isNaN(v) ? DEFAULT_LEVEL : clampLevel(v);
  }
  function setLevel(v) { lsSet(KEY_LEVEL, clampLevel(v)); }

  function getItems() {
    try {
      var a = JSON.parse(lsGet(KEY_ITEMS));
      if (Array.isArray(a) && a.length === ITEMS.length) return a.map(Boolean);
    } catch (e) {}
    return ITEMS.map(function () { return false; }); // default: nothing won
  }
  function setItems(arr) { lsSet(KEY_ITEMS, JSON.stringify(arr.map(Boolean))); }
  function setItem(i, val) { var a = getItems(); a[i] = !!val; setItems(a); }

  /* fires only for changes made in OTHER tabs/windows */
  function onChange(cb) {
    window.addEventListener("storage", function (e) {
      if (e.key === KEY_LEVEL || e.key === KEY_ITEMS) cb();
    });
  }

  global.Quest = {
    MAX: MAX, DEFAULT_LEVEL: DEFAULT_LEVEL, ITEMS: ITEMS,
    getLevel: getLevel, setLevel: setLevel,
    getItems: getItems, setItems: setItems, setItem: setItem,
    onChange: onChange
  };
})(window);
