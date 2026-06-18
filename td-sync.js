/* ============================================================
   QUEST — session « Action ou Vérité » via Firebase Realtime DB
   Nœud td/. Module ES (CDN gstatic, aucun build).
   Publie window.QuestTd ; émet "questtd-ready".
   ============================================================ */
import { db } from "./firebase-init.js";
import {
  ref, onValue, update, push, runTransaction, onDisconnect, set
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

var tdRef = ref(db, "td");

var cache = snapshot(null);
var ready = false;
var listeners = [];

/* Normalise l'état brut du nœud td/. log/ (push-keys) → tableau ordonné.
   presence/{n}/online → booléen. Mêmes défauts que l'ancien DEFAULT_TD. */
function snapshot(raw) {
  raw = raw || {};
  var phases = ["start", "choose", "prompt", "respond"];
  var logObj = raw.log || {};
  var log = Object.keys(logObj).sort().map(function (k) { return logObj[k]; });
  var pres = raw.presence || {};
  return {
    active: !!raw.active,
    asker: raw.asker === 2 ? 2 : 1,
    phase: phases.indexOf(raw.phase) >= 0 ? raw.phase : "start",
    choice: (raw.choice === "action" || raw.choice === "verite") ? raw.choice : null,
    prompt: typeof raw.prompt === "string" ? raw.prompt : null,
    response: typeof raw.response === "string" ? raw.response : null,
    round: parseInt(raw.round, 10) || 0,
    log: log,
    presence: { 1: !!(pres[1] && pres[1].online), 2: !!(pres[2] && pres[2].online) }
  };
}

function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

onValue(tdRef, function (snap) {
  cache = snapshot(snap.val());
  ready = true;
  emit();
});

/* ---- API ---- */
function getTd() { return JSON.parse(JSON.stringify(cache)); }
function isReady() { return ready; }
function onChange(fn) { listeners.push(fn); }

/* écrit des champs de jeu par chemin → pas d'écrasement d'objet entier */
function updateTd(patch) { return update(tdRef, patch); }

/* ajoute une entrée de journal sans réécrire l'historique */
function pushLog(entry) { return push(ref(db, "td/log"), entry); }

/* init unique : une seule instance bascule active=true, puis écrit les champs de départ */
function startSession(fields) {
  return runTransaction(ref(db, "td/active"), function (cur) {
    if (cur) return;           // déjà lancée → abandonne
    return true;
  }).then(function (res) {
    if (res.committed && res.snapshot.val() === true) return update(tdRef, fields);
  });
}

/* me marque présent ; Firebase efface automatiquement à la perte du socket.
   .info/connected ré-arme onDisconnect à chaque reconnexion.
   À appeler UNE SEULE FOIS par chargement de page (pas de désabonnement). */
function goOnline(me) {
  var pRef = ref(db, "td/presence/" + me + "/online");
  onValue(ref(db, ".info/connected"), function (snap) {
    if (snap.val() === true) {
      onDisconnect(pRef).set(false);
      set(pRef, true);
    }
  });
}

/* ferme la session pour les deux, retire ma présence ; promesse à attendre avant de naviguer */
function quit(me) {
  var patch = {
    active: false, phase: "start", round: 0,
    choice: null, prompt: null, response: null, log: null
  };
  patch["presence/" + me + "/online"] = false;
  return update(tdRef, patch);
}

window.QuestTd = {
  getTd: getTd, isReady: isReady, onChange: onChange,
  updateTd: updateTd, pushLog: pushLog, startSession: startSession,
  goOnline: goOnline, quit: quit
};
window.dispatchEvent(new Event("questtd-ready"));
