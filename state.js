/* ============================================================
   QUEST — shared game state via a hosted JSON file (JSONBin.io)
   The level + items live in one JSON "bin" so the state is the
   SAME for every visitor. No backend of our own.

   - read  : GET  https://api.jsonbin.io/v3/b/{BIN}/latest
   - write : PUT  https://api.jsonbin.io/v3/b/{BIN}
   Changes from other users are picked up by polling.

   localStorage is used as an instant local cache + same-browser
   cross-tab sync, and as a fallback when the network is down.
   ============================================================ */

window.Quest = (function () {
  "use strict";

  /* ---- CONFIG : fill these with your JSONBin values ---- */
  var CONFIG = {
    binId:     "6a32eabdda38895dfed23e20",
    accessKey: "$2a$10$KjVhZXYGwG8XqVfJ1Wv6QuXzIX33shf2TR1ckyU.RCeWl.Gp844bK" // Read + Update
  };

  var MAX = 99, DEFAULT_LEVEL = 5;
  var POLL_IDLE = 5000, POLL_ACTIVE = 2000;
  var DEFAULT_TD = {
    active: false, players: { 1: 0, 2: 0 }, asker: 1,
    phase: "start", choice: null, prompt: null, response: null, round: 0, log: []
  };
  var LS_KEY = "quest.state";
  var API = "https://api.jsonbin.io/v3/b/" + CONFIG.binId;
  var remoteEnabled =
    CONFIG.binId.indexOf("REPLACE") === -1 &&
    CONFIG.accessKey.indexOf("REPLACE") === -1;

  /* The 5 reward items, with pixel-art SVG icons (16x16, crisp). */
  var ITEMS = [
    { id: "star", name: "Étoile",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
        '<path d="M8 1 L10 6 L15 6 L11 9 L13 15 L8 11 L3 15 L5 9 L1 6 L6 6 Z" fill="#f7c948"/>' +
        '<path d="M8 3 L9 6 L7 6 Z" fill="#fff0b0"/></svg>' },
    { id: "chest", name: "Coffre",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
        '<rect x="2" y="7" width="12" height="7" fill="#8a5a2b"/>' +
        '<rect x="2" y="4" width="12" height="4" fill="#a06a30"/>' +
        '<rect x="2" y="7" width="12" height="1" fill="#5d3c1c"/>' +
        '<rect x="7" y="4" width="2" height="10" fill="#f7c948"/>' +
        '<rect x="6" y="9" width="4" height="3" fill="#e0a82e"/>' +
        '<rect x="7" y="10" width="2" height="2" fill="#5d3c1c"/></svg>' },
    { id: "wand", name: "Baguette",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
        '<rect x="7" y="6" width="2" height="9" fill="#2e2438"/>' +
        '<rect x="7" y="13" width="2" height="2" fill="#6b5a82"/>' +
        '<path d="M8 0 L9 3 L12 3 L9.5 5 L10.5 8 L8 6 L5.5 8 L6.5 5 L4 3 L7 3 Z" fill="#f7c948"/>' +
        '<rect x="12" y="6" width="1" height="1" fill="#fff0b0"/>' +
        '<rect x="4" y="9" width="1" height="1" fill="#fff0b0"/></svg>' },
    { id: "sandals", name: "Sandales",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
        '<rect x="2" y="4" width="4" height="9" fill="#c9a36b"/>' +
        '<rect x="3" y="5" width="2" height="7" fill="#b8924f"/>' +
        '<rect x="2" y="6" width="4" height="1" fill="#6b4a2a"/>' +
        '<rect x="3" y="4" width="2" height="2" fill="#6b4a2a"/>' +
        '<rect x="10" y="4" width="4" height="9" fill="#c9a36b"/>' +
        '<rect x="11" y="5" width="2" height="7" fill="#b8924f"/>' +
        '<rect x="10" y="6" width="4" height="1" fill="#6b4a2a"/>' +
        '<rect x="11" y="4" width="2" height="2" fill="#6b4a2a"/></svg>' },
    { id: "sword", name: "Épée",
      svg: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges">' +
        '<path d="M7 2 L8 0 L9 2 Z" fill="#c8d2dc"/>' +
        '<rect x="7" y="2" width="2" height="8" fill="#c8d2dc"/>' +
        '<rect x="7" y="2" width="1" height="8" fill="#eef3f8"/>' +
        '<rect x="4" y="10" width="8" height="2" fill="#f7c948"/>' +
        '<rect x="7" y="12" width="2" height="3" fill="#6b4a2a"/>' +
        '<rect x="6" y="15" width="4" height="1" fill="#f7c948"/></svg>' }
  ];

  /* ---- internal state ---- */
  var cache = {
    level: DEFAULT_LEVEL,
    items: ITEMS.map(function () { return false; }),
    td: JSON.parse(JSON.stringify(DEFAULT_TD))
  };
  var lastSerialized = "";
  var listeners = [];
  var putTimer = null;
  var localDirty = false;   // we have a local change not yet confirmed on the server

  function clampLevel(v) { return Math.max(0, Math.min(MAX, v | 0)); }

  function normTd(t) {
    t = t || {};
    var pl = t.players || {};
    var phases = ["start", "choose", "prompt", "respond"];
    return {
      active: !!t.active,
      players: { 1: parseInt(pl[1], 10) || 0, 2: parseInt(pl[2], 10) || 0 },
      asker: t.asker === 2 ? 2 : 1,
      phase: phases.indexOf(t.phase) >= 0 ? t.phase : "start",
      choice: (t.choice === "action" || t.choice === "verite") ? t.choice : null,
      prompt: typeof t.prompt === "string" ? t.prompt : null,
      response: typeof t.response === "string" ? t.response : null,
      round: parseInt(t.round, 10) || 0,
      log: Array.isArray(t.log) ? t.log.slice(-60) : []
    };
  }

  function normalize(d) {
    d = d || {};
    var lvl = parseInt(d.level, 10);
    var items = (Array.isArray(d.items) && d.items.length === ITEMS.length)
      ? d.items.map(Boolean) : ITEMS.map(function () { return false; });
    return {
      level: isNaN(lvl) ? DEFAULT_LEVEL : clampLevel(lvl),
      items: items,
      td: normTd(d.td)
    };
  }

  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  /* apply a new state to the cache; emit + (optionally) persist locally */
  function setCache(next, persistLocal) {
    var n = normalize(next);
    var s = JSON.stringify(n);
    if (s === lastSerialized) return false;
    lastSerialized = s;
    cache = n;
    if (persistLocal) { try { localStorage.setItem(LS_KEY, s); } catch (e) {} }
    emit();
    return true;
  }

  /* ---- remote (JSONBin) ---- */
  function fetchRemote() {
    if (!remoteEnabled) return Promise.resolve();
    return fetch(API + "/latest", {
      headers: { "X-Access-Key": CONFIG.accessKey, "X-Bin-Meta": "false" }
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        // never clobber a local change that hasn't been saved to the bin yet
        if (!localDirty) setCache(data, true);
      })
      .catch(function () { /* offline: keep current cache */ });
  }

  function pushRemote() {
    if (!remoteEnabled) { localDirty = false; return; }
    var payload = JSON.stringify(cache);
    fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Access-Key": CONFIG.accessKey },
      body: payload
    })
      .then(function (r) { if (r.ok && JSON.stringify(cache) === payload) localDirty = false; })
      .catch(function () { /* stays dirty: retried on next poll tick */ });
  }

  function schedulePush() {
    localDirty = true;
    if (putTimer) clearTimeout(putTimer);
    putTimer = setTimeout(pushRemote, 250); // debounce rapid clicks
  }

  /* poll tick: flush pending local change, else pull the shared state */
  function tick() {
    if (localDirty) pushRemote();
    else fetchRemote();
  }

  /* self-scheduling poll loop with dynamic interval + visibility pause */
  var pollMs = POLL_IDLE, pollHandle = null;
  function scheduleNextPoll() {
    if (pollHandle) clearTimeout(pollHandle);
    pollHandle = setTimeout(function () {
      if (!document.hidden) tick();
      scheduleNextPoll();
    }, pollMs);
  }
  function setActive(on) { pollMs = on ? POLL_ACTIVE : POLL_IDLE; }

  /* ---- public API ---- */
  function getLevel() { return cache.level; }
  function getItems() { return cache.items.slice(); }
  function getTd() { return JSON.parse(JSON.stringify(cache.td)); }

  function setLevel(v) {
    setCache({ level: clampLevel(v), items: cache.items.slice(), td: cache.td }, true);
    schedulePush();
  }
  function setItems(arr) {
    setCache({ level: cache.level, items: arr.map(Boolean), td: cache.td }, true);
    schedulePush();
  }
  function updateTd(patch) {
    var t = getTd();
    for (var k in patch) { if (patch.hasOwnProperty(k)) t[k] = patch[k]; }
    setCache({ level: cache.level, items: cache.items.slice(), td: t }, true);
    schedulePush();
  }
  function setItem(i, val) {
    var items = cache.items.slice();
    items[i] = !!val;
    setItems(items);
  }
  function onChange(fn) { listeners.push(fn); }

  function init() {
    // 1) seed instantly from localStorage cache
    try {
      var local = JSON.parse(localStorage.getItem(LS_KEY));
      if (local) setCache(local, false);
    } catch (e) {}

    // 2) same-browser cross-tab sync (no remote round-trip needed)
    window.addEventListener("storage", function (e) {
      if (e.key === LS_KEY && e.newValue) {
        try { setCache(JSON.parse(e.newValue), false); } catch (err) {}
      }
    });

    // 3) load remote + poll for other users' changes
    if (remoteEnabled) {
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) tick();
      });
      return fetchRemote().then(function () { scheduleNextPoll(); });
    }
    return Promise.resolve();
  }

  return {
    MAX: MAX, DEFAULT_LEVEL: DEFAULT_LEVEL, ITEMS: ITEMS, remoteEnabled: remoteEnabled,
    init: init, onChange: onChange, setActive: setActive,
    getLevel: getLevel, getItems: getItems, getTd: getTd,
    setLevel: setLevel, setItems: setItems, setItem: setItem, updateTd: updateTd
  };
})();
