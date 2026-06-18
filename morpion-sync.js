/* ============================================================
   QUEST — session « Morpion » via Firebase Realtime DB (nœud morpion/).
   Module ES (CDN gstatic, aucun build). Importe l'app partagée.
   Publie window.QuestMorpion ; émet "questmorpion-ready".
   Écritures par chemin (update) → pas d'écrasement d'objet entier.
   ============================================================ */
import { db } from "./firebase-init.js";
import {
  ref, onValue, update, runTransaction, onDisconnect, set
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

var mRef = ref(db, "morpion");

var cache = snapshot(null);
var ready = false;
var listeners = [];

/* normalise l'état brut : board = 9 entiers 0/1/2 (jamais null), scores/presence sûrs */
function snapshot(raw) {
  raw = raw || {};
  var rb = raw.board || [];
  var board = [];
  for (var i = 0; i < 9; i++) { var v = parseInt(rb[i], 10); board.push(v === 1 || v === 2 ? v : 0); }
  var sc = raw.scores || {};
  var pr = raw.presence || {};
  var w = (raw.winner === 1 || raw.winner === 2 || raw.winner === "draw") ? raw.winner : null;
  return {
    board: board,
    turn: raw.turn === 2 ? 2 : 1,
    winner: w,
    starter: raw.starter === 2 ? 2 : 1,
    scores: { 1: parseInt(sc[1], 10) || 0, 2: parseInt(sc[2], 10) || 0, draw: parseInt(sc.draw, 10) || 0 },
    active: !!raw.active,
    presence: { 1: !!(pr[1] && pr[1].online), 2: !!(pr[2] && pr[2].online) }
  };
}

function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

onValue(mRef, function (snap) {
  cache = snapshot(snap.val());
  ready = true;
  emit();
});

/* ---- API ---- */
function getState() { return JSON.parse(JSON.stringify(cache)); }
function isReady() { return ready; }
function onChange(fn) { listeners.push(fn); }

/* écrit des champs par chemin (ex: { "board/4": 1, turn: 2 }) */
function updateState(patch) { return update(mRef, patch); }

/* init unique de session : une seule instance bascule active=true puis écrit fields */
function transactionStart(fields) {
  return runTransaction(ref(db, "morpion/active"), function (cur) {
    if (cur) return;     // déjà lancée → abandonne
    return true;
  }).then(function (res) {
    if (res.committed && res.snapshot.val() === true) return update(mRef, fields);
  });
}

/* présence native ; onDisconnect efface à la perte du socket.
   À appeler UNE SEULE FOIS par chargement de page. */
function goOnline(me) {
  var pRef = ref(db, "morpion/presence/" + me + "/online");
  onValue(ref(db, ".info/connected"), function (snap) {
    if (snap.val() === true) {
      onDisconnect(pRef).set(false);
      set(pRef, true);
    }
  });
}

/* ferme la session pour les deux + retire ma présence ; promesse à attendre */
function quit(me) {
  var patch = {
    active: false, winner: null, turn: 1, starter: 1,
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    scores: { 1: 0, 2: 0, draw: 0 }
  };
  patch["presence/" + me + "/online"] = false;
  return update(mRef, patch);
}

window.QuestMorpion = {
  getState: getState, isReady: isReady, onChange: onChange,
  update: updateState, transactionStart: transactionStart,
  goOnline: goOnline, quit: quit
};
window.dispatchEvent(new Event("questmorpion-ready"));
